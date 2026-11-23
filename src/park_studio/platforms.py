"""7 平台真实登录态体检、打开登录页与粉丝数采集器（基于本机专用 Chrome CDP）。

平台列表：
- douyin   抖音创作者中心
- xhs      小红书创作服务平台
- bilibili B 站创作中心
- channels 微信视频号助手
- youtube  YouTube Studio
- x        X (Twitter)
- wechat   微信公众号后台

绝不上传任何 Cookie / 账号密码；所有读取仅在用户本机专用 Chrome Profile 中进行。
"""
from __future__ import annotations

import asyncio
import json
import re
import sqlite3
from datetime import date, datetime, timedelta
from typing import Any

import httpx

from . import cdp, config, db

PLAT_ORDER = ("douyin", "xhs", "bilibili", "channels", "youtube", "x", "wechat")

PLATFORM_SPECS: dict[str, dict[str, str]] = {
    "douyin": {
        "name": "抖音",
        "login_url": "https://creator.douyin.com/creator-micro/content/upload",
        "home_url": "https://creator.douyin.com/creator-micro/home",
        "mode": "manual",
    },
    "xhs": {
        "name": "小红书",
        "login_url": "https://creator.xiaohongshu.com/publish/publish?source=official&target=video",
        "home_url": "https://creator.xiaohongshu.com/statistics/fans-data",
        "mode": "manual",
    },
    "bilibili": {
        "name": "B站",
        "login_url": "https://member.bilibili.com/platform/upload/video/frame",
        "home_url": "https://member.bilibili.com/platform/home",
        "mode": "manual",
    },
    "channels": {
        "name": "视频号",
        "login_url": "https://channels.weixin.qq.com/platform/post/create",
        "home_url": "https://channels.weixin.qq.com/platform/statistic/follower",
        "mode": "manual",
    },
    "youtube": {
        "name": "YouTube",
        "login_url": "https://studio.youtube.com/",
        "home_url": "https://studio.youtube.com/",
        "mode": "auto",
    },
    "x": {
        "name": "X",
        "login_url": "https://x.com/home",
        "home_url": "https://x.com/home",
        "mode": "auto",
    },
    "wechat": {
        "name": "公众号",
        "login_url": "https://mp.weixin.qq.com/",
        "home_url": "https://mp.weixin.qq.com/",
        "mode": "auto",
    },
}

SHADOW_TEXT_JS = (
    "(() => {"
    "const R = document.querySelector('wujie-app') && document.querySelector('wujie-app').shadowRoot;"
    "if (!R) return document.body ? document.body.innerText : '';"
    "const w = document.createTreeWalker(R, NodeFilter.SHOW_TEXT);"
    "let s = [], x;"
    "while ((x = w.nextNode())) {"
    "  const p = x.parentElement;"
    "  if (p && /STYLE|SCRIPT/.test(p.tagName)) continue;"
    "  const v = x.textContent.trim().replace(/\\s+/g, ' ');"
    "  if (v) s.push(v);"
    "}"
    "return s.join(' | ');"
    "})()"
)


def parse_cn_num(raw: Any) -> int | None:
    """解析中文/英文数字表达：'3.8万' -> 38000, '12,480' -> 12480, '4.4K' -> 4400。"""
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return int(round(raw))
    s = str(raw).strip().replace(",", "").replace(" ", "")
    if not s:
        return None
    m = re.search(r"(-?\d+(?:\.\d+)?)\s*([万亿wWkKmM]?)", s)
    if not m:
        return None
    val = float(m.group(1))
    unit = m.group(2)
    if unit in ("万", "w", "W"):
        val *= 10_000
    elif unit == "亿":
        val *= 100_000_000
    elif unit in ("k", "K"):
        val *= 1_000
    elif unit in ("m", "M"):
        val *= 1_000_000
    return int(round(val))


def _now_hm() -> str:
    return datetime.now().strftime("%m-%d %H:%M")


def _today_str() -> str:
    return date.today().isoformat()


def _fetch_json_js(url: str) -> str:
    return f"fetch({json.dumps(url)}, {{credentials:'include'}}).then(r => r.json()).catch(() => null)"


def _day_from_any(raw: Any) -> str | None:
    """兼容毫秒时间戳 (1794672000000)、秒时间戳与 'YYYY-MM-DD' 字符串。"""
    if raw is None:
        return None
    if isinstance(raw, (int, float)) or (isinstance(raw, str) and raw.strip().isdigit()):
        num = float(raw)
        if num > 1e11:
            num /= 1000.0
        try:
            return datetime.fromtimestamp(num).strftime("%Y-%m-%d")
        except Exception:
            return None
    s = str(raw).strip()
    m = re.match(r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})", s)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    return None


async def _probe_one(client: cdp.CDPClient, pid: str) -> dict[str, Any]:
    spec = PLATFORM_SPECS[pid]
    url = spec["home_url"]

    async def inspect(sid: str, _tid: str) -> dict[str, Any]:
        last_reason = "页面加载超时，建议点「去登录」确认状态"
        for attempt in range(11):  # 最长轮询 ~14 秒，命中立刻提前返回
            await asyncio.sleep(1.3 if attempt else 1.5)
            try:
                href = str(await client.evaluate(sid, "location.href") or "")
            except Exception:
                continue
            low = href.lower()
            if not low or low == "about:blank" or low.startswith("chrome://"):
                continue

            if pid == "douyin":
                if "login" in low or "passport" in low:
                    return {"state": "warn", "detail": "抖音未登录（已跳回登录页），请点「去登录」扫码"}
                info = await client.evaluate(sid, _fetch_json_js("/web/api/media/user/info/"))
                if isinstance(info, dict) and isinstance(info.get("user"), dict):
                    nick = info["user"].get("nickname") or "创作者"
                    fans = info["user"].get("follower_count")
                    extra = f" · {int(fans):,} 粉" if isinstance(fans, (int, float)) else ""
                    return {"state": "ok", "detail": f"已登录（{nick}{extra}）"}
                if attempt >= 3 and "creator.douyin.com/creator-micro" in low:
                    text = str(await client.evaluate(sid, "(document.body && document.body.innerText || '').slice(0, 600)") or "")
                    if any(k in text for k in ("高清发布", "发布视频", "作品管理", "粉丝", "内容管理")):
                        return {"state": "ok", "detail": "已登录（抖音创作者中心正常）"}
                last_reason = "抖音未返回创作者账号信息，请确认已扫码登录"

            elif pid == "xhs":
                if "/login" in low:
                    return {"state": "warn", "detail": "小红书未登录，请点「去登录」扫码"}
                info = await client.evaluate(sid, _fetch_json_js("/api/galaxy/creator/data/fans/overall_new"))
                if isinstance(info, dict) and info.get("code") in (0, None) and isinstance(info.get("data"), dict):
                    data = info["data"]
                    cnt = ((data.get("thirty") or data.get("seven") or {}).get("fans_count"))
                    extra = f" · {int(cnt):,} 粉" if cnt is not None else ""
                    return {"state": "ok", "detail": f"已登录（小红书创作平台{extra}）"}
                last_reason = "小红书未登录或登录态已过期，请点「去登录」扫码"

            elif pid == "bilibili":
                if "passport.bilibili.com" in low or "/login" in low:
                    return {"state": "warn", "detail": "B 站未登录，请点「去登录」扫码"}
                info = await client.evaluate(sid, _fetch_json_js("/x/web/index/stat"))
                if isinstance(info, dict) and info.get("code") == 0 and isinstance(info.get("data"), dict):
                    fans = info["data"].get("total_fans")
                    extra = f" · {int(fans):,} 粉" if fans is not None else ""
                    return {"state": "ok", "detail": f"已登录（B 站创作中心{extra}）"}
                if isinstance(info, dict) and info.get("code") in (-101, -111):
                    return {"state": "warn", "detail": "B 站未登录或登录态过期，请点「去登录」扫码"}
                last_reason = "B 站创作中心响应较慢，请稍后再试或重新登录"

            elif pid == "channels":
                if "/login" in low:
                    return {"state": "warn", "detail": "视频号未登录，请点「去登录」扫码"}
                auth = await client.evaluate(
                    sid,
                    "fetch('/cgi-bin/mmfinderassistant-bin/auth/auth_data',"
                    "{method:'POST',headers:{'content-type':'application/json'},body:'{}',credentials:'include'})"
                    ".then(r=>r.json()).catch(()=>null)",
                )
                if isinstance(auth, dict):
                    if auth.get("errCode") == 0:
                        fu = (auth.get("data") or {}).get("finderUser") or {}
                        nick = fu.get("nickname") or "视频号"
                        fans = fu.get("fansCount")
                        extra = f" · {int(fans):,} 粉" if isinstance(fans, (int, float)) else ""
                        return {"state": "ok", "detail": f"已登录（{nick}{extra}）"}
                    if auth.get("errCode") is not None:
                        return {"state": "warn", "detail": "视频号登录已失效，请点「去登录」重新扫码"}
                last_reason = "视频号后台暂未返回账号状态"

            elif pid == "youtube":
                if "accounts.google.com" in low or "signin" in low:
                    return {"state": "warn", "detail": "YouTube 未登录 Google 账号"}
                if "studio.youtube.com/channel/" in low:
                    return {"state": "ok", "detail": "已登录（YouTube Studio 频道后台正常）"}
                text = str(await client.evaluate(sid, "(document.body && document.body.innerText || '').slice(0, 600)") or "")
                if any(k in text for k in ("Subscribers", "Dashboard", "Your channel", "订阅", "信息中心", "你的频道")):
                    return {"state": "ok", "detail": "已登录（YouTube Studio 正常）"}
                last_reason = "YouTube Studio 加载较慢（请确认代理通畅或已登录 Google）"

            elif pid == "x":
                if "/i/flow/login" in low or "/login" in low:
                    return {"state": "warn", "detail": "X 未登录，请点「去登录」"}
                prof = await client.evaluate(
                    sid, "(document.querySelector('a[data-testid=AppTabBar_Profile_Link]')||{}).getAttribute?.('href')||''"
                )
                if prof:
                    handle = str(prof).strip("/")
                    return {"state": "ok", "detail": f"已登录（@{handle}）"}
                last_reason = "未检测到 X 登录态（可能未登录或代理受限）"

            elif pid == "wechat":
                if "token=" in low:
                    return {"state": "ok", "detail": "已登录（微信公众号后台正常）"}
                if attempt >= 2:
                    text = str(await client.evaluate(sid, "(document.body && document.body.innerText || '').slice(0, 400)") or "")
                    if "扫码" in text or "登录" in text:
                        return {"state": "warn", "detail": "公众号未登录（需微信扫码登录）"}
                last_reason = "公众号未登录（需微信扫码）"

        return {"state": "warn", "detail": last_reason}

    try:
        return await client.with_tab(url, inspect, wait_s=0.0, active=False, keep_open=False)
    except Exception as exc:
        return {"state": "warn", "detail": f"检查出错：{str(exc)[:90]}"}


async def _collect_follower_one(client: cdp.CDPClient, pid: str) -> dict[str, Any] | None:
    spec = PLATFORM_SPECS[pid]
    url = spec["home_url"]

    async def grab(sid: str, _tid: str) -> dict[str, Any] | None:
        # 先等待真实页面离开 about:blank
        href = ""
        for _ in range(8):
            await asyncio.sleep(1.2)
            href = str(await client.evaluate(sid, "location.href") or "").lower()
            if href and href != "about:blank" and not href.startswith("chrome://"):
                break
        if not href or "login" in href or "passport" in href or "accounts.google.com" in href:
            return None

        if pid == "bilibili":
            expr = (
                f"Promise.all([{_fetch_json_js('/x/web/index/stat')},"
                f"{_fetch_json_js('/x/web/data/v2/overview/stat/graph?period=2&s_locale=zh_CN&type=fan')}]).then(([a,b])=>("
                "{total: a && a.data && a.data.total_fans, inc: a && a.data && a.data.incr_fans, tend: (b && b.data && b.data.tendency) || []}))"
            )
            r = await client.evaluate(sid, expr)
            if not isinstance(r, dict) or r.get("total") is None:
                return None
            hist = []
            for x in r.get("tend") or []:
                day_s = _day_from_any(x.get("date_key"))
                if day_s:
                    hist.append({"day": day_s, "net": int(x.get("total_inc") or 0)})
            return {"total": int(r["total"]), "today_net": int(r.get("inc") or 0), "history": hist}

        if pid == "douyin":
            r = await client.evaluate(sid, f"{_fetch_json_js('/web/api/media/user/info/')}.then(x=>x&&x.user&&x.user.follower_count)")
            total = parse_cn_num(r)
            return {"total": total, "history": []} if total is not None else None

        if pid == "xhs":
            expr = (
                f"{_fetch_json_js('/api/galaxy/creator/data/fans/overall_new')}.then(x=>{{if(!x||!x.data)return null;"
                "const d=x.data.thirty||x.data.seven; if(!d) return null;"
                "const m=a=>Object.fromEntries((a||[]).map(i=>[String(i.date),i.count]));"
                "const g=m(d.rise_fans_list), l=m(d.leave_fans_list);"
                "return {total:d.fans_count, list:(d.fans_list||[]).map(i=>({date:i.date,total:i.count,gain:g[String(i.date)],loss:l[String(i.date)]}))};})"
            )
            r = await client.evaluate(sid, expr)
            if not isinstance(r, dict) or r.get("total") is None:
                return None
            hist = []
            for x in r.get("list") or []:
                ds = _day_from_any(x.get("date"))
                if ds:
                    hist.append({"day": ds, "total": parse_cn_num(x.get("total")), "gain": parse_cn_num(x.get("gain")), "loss": parse_cn_num(x.get("loss"))})
            return {"total": int(r["total"]), "history": hist}

        if pid == "channels":
            auth = await client.evaluate(
                sid,
                "fetch('/cgi-bin/mmfinderassistant-bin/auth/auth_data',"
                "{method:'POST',headers:{'content-type':'application/json'},body:'{}',credentials:'include'})"
                ".then(r=>r.json()).catch(()=>null)",
            )
            total = None
            if isinstance(auth, dict) and auth.get("errCode") == 0:
                total = parse_cn_num(((auth.get("data") or {}).get("finderUser") or {}).get("fansCount"))
            hist = []
            for _ in range(3):
                text = str(await client.evaluate(sid, SHADOW_TEXT_JS) or "")
                if re.search(r"\d{4}/\d{1,2}/\d{1,2} \|", text):
                    if total is None:
                        m = re.search(r"关注者总数 \| ([\d,.万]+)", text)
                        total = parse_cn_num(m.group(1)) if m else None
                    for row in re.finditer(r"(\d{4})/(\d{1,2})/(\d{1,2}) \| (-?[\d,]+) \| ([\d,]+) \| ([\d,]+) \| ([\d,]+)", text):
                        day_s = f"{row.group(1)}-{int(row.group(2)):02d}-{int(row.group(3)):02d}"
                        hist.append({"day": day_s, "total": parse_cn_num(row.group(7)), "gain": parse_cn_num(row.group(5)), "loss": parse_cn_num(row.group(6))})
                    break
                await asyncio.sleep(1.5)
            return {"total": total, "history": hist} if total is not None else None

        if pid == "youtube":
            text = ""
            for _ in range(7):
                text = str(await client.evaluate(sid, "document.body ? document.body.innerText : ''") or "")
                if re.search(r"当前订阅人数|Current subscribers", text):
                    break
                await asyncio.sleep(1.8)
            m = re.search(r"(?:当前订阅人数|Current subscribers)\s*\n?\s*([\d,.]+\s*[万KM]?)", text)
            total = parse_cn_num(m.group(1)) if m else None
            return {"total": total, "history": []} if total is not None else None

        if pid == "x":
            prof = None
            for _ in range(6):
                prof = await client.evaluate(
                    sid, "(document.querySelector('a[data-testid=AppTabBar_Profile_Link]')||{}).href||''"
                )
                if prof:
                    break
                await asyncio.sleep(1.5)
            if not prof:
                return None
            await client.evaluate(sid, f"(location.href={json.dumps(prof)}, 1)")
            for _ in range(6):
                await asyncio.sleep(1.5)
                txt = str(
                    await client.evaluate(
                        sid,
                        "(document.querySelector('a[href$=\"/verified_followers\"],a[href$=\"/followers\"]')||{}).innerText||''",
                    )
                    or ""
                )
                total = parse_cn_num(txt.replace("\n", " "))
                if total is not None:
                    return {"total": total, "history": []}
            return None

        if pid == "wechat":
            if "token=" not in href:
                return None
            txt = str(await client.evaluate(sid, "document.body ? document.body.innerText : ''") or "")
            m = re.search(r"(?:总用户数|总关注人数)\s*\n?\s*([\d,.万]+)", txt)
            total = parse_cn_num(m.group(1)) if m else None
            return {"total": total, "history": []} if total is not None else None

        return None

    try:
        return await client.with_tab(url, grab, wait_s=0.0, active=False, keep_open=False)
    except Exception:
        return None


def save_follower_reading(conn: sqlite3.Connection, platform: str, reading: dict[str, Any]) -> int:
    """将实测粉丝数写入 SQLite，并按需回填平台自带历史曲线（不覆盖已有 live 记录）。"""
    today_s = _today_str()
    ts = db.now_iso()
    total = int(reading["total"])
    conn.execute(
        """INSERT INTO followers_daily(day, platform, total, gain, loss, source, collected_at)
           VALUES (?,?,?,?,?,?,?)
           ON CONFLICT(day, platform) DO UPDATE SET
             total=excluded.total, gain=COALESCE(excluded.gain, gain),
             loss=COALESCE(excluded.loss, loss), source=excluded.source, collected_at=excluded.collected_at""",
        (today_s, platform, total, None, None, "live", ts),
    )

    hist = [h for h in (reading.get("history") or []) if h.get("day") and str(h["day"]) < today_s]
    hist.sort(key=lambda x: str(x["day"]), reverse=True)
    if hist and hist[0].get("total") is None:
        run_total = total - int(reading.get("today_net") or 0)
        for h in hist:
            h["total"] = run_total
            run_total -= int(h.get("net") or 0)

    backfilled = 0
    for h in hist:
        if h.get("total") is None:
            continue
        existing = conn.execute(
            "SELECT source FROM followers_daily WHERE day=? AND platform=?", (h["day"], platform)
        ).fetchone()
        if existing and existing["source"] == "live":
            continue
        gain = h.get("gain")
        if gain is None and h.get("net") is not None and int(h["net"]) > 0:
            gain = int(h["net"])
        conn.execute(
            """INSERT INTO followers_daily(day, platform, total, gain, loss, source, collected_at)
               VALUES (?,?,?,?,?,?,?)
               ON CONFLICT(day, platform) DO UPDATE SET
                 total=excluded.total, gain=COALESCE(excluded.gain, gain),
                 loss=COALESCE(excluded.loss, loss), source=excluded.source, collected_at=excluded.collected_at""",
            (h["day"], platform, int(h["total"]), gain, h.get("loss"), "backfill", ts),
        )
        backfilled += 1
    conn.commit()
    return backfilled


async def open_login_pages(
    platform_ids: list[str] | None,
    conn: sqlite3.Connection,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    cfg = cfg or config.load_config()
    st = cdp.ensure_chrome(cfg, foreground=True)
    target_ids = [p for p in (platform_ids or list(PLAT_ORDER)) if p in PLATFORM_SPECS]
    opened: list[str] = []
    async with cdp.CDPClient(st["ws_url"]) as client:
        first_tid: str | None = None
        for i, pid in enumerate(target_ids):
            tid = await client.create_tab(PLATFORM_SPECS[pid]["login_url"], active=(i == 0))
            if i == 0:
                first_tid = tid
            opened.append(pid)
        if first_tid:
            await client.send("Target.activateTarget", {"targetId": first_tid})
    names = "、".join(PLATFORM_SPECS[p]["name"] for p in opened)
    db.log_event(conn, "系统", "Chrome", "打开登录页", f"已在专用 Chrome 打开 {names}")
    return {"ok": True, "opened": opened, "chrome": st}


async def check_platforms(
    platform_ids: list[str] | None,
    conn: sqlite3.Connection,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    cfg = cfg or config.load_config()
    st = cdp.chrome_status(cfg)
    if not st["online"]:
        st = cdp.ensure_chrome(cfg, foreground=False)

    disabled_set = {
        r["platform"] for r in conn.execute("SELECT platform FROM platform_status WHERE disabled=1").fetchall()
    }
    ids = [
        p for p in (platform_ids or list(PLAT_ORDER))
        if p in PLATFORM_SPECS and (platform_ids is not None or p not in disabled_set)
    ]

    results: dict[str, Any] = {}
    checked_hm = _now_hm()
    ts = db.now_iso()
    async with cdp.CDPClient(st["ws_url"]) as client:
        for pid in ids:
            res = await _probe_one(client, pid)
            results[pid] = res
            conn.execute(
                """INSERT INTO platform_status(platform, state, detail, disabled, checked_at, updated_at)
                   VALUES (?,?,?,0,?,?)
                   ON CONFLICT(platform) DO UPDATE SET
                     state=excluded.state, detail=excluded.detail, checked_at=excluded.checked_at, updated_at=excluded.updated_at""",
                (pid, res["state"], res["detail"], checked_hm, ts),
            )
            conn.commit()
            icon = "✓" if res["state"] == "ok" else "!"
            db.log_event(conn, "体检", PLATFORM_SPECS[pid]["name"], "登录态体检", f"{icon} {res['detail']}")

    return {"ok": True, "results": results, "checked_at": checked_hm, "chrome": cdp.chrome_status(cfg)}


async def collect_followers(
    platform_ids: list[str] | None,
    conn: sqlite3.Connection,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    cfg = cfg or config.load_config()
    st = cdp.chrome_status(cfg)
    if not st["online"]:
        st = cdp.ensure_chrome(cfg, foreground=False)

    disabled_set = {
        r["platform"] for r in conn.execute("SELECT platform FROM platform_status WHERE disabled=1").fetchall()
    }
    ids = [
        p for p in (platform_ids or list(PLAT_ORDER))
        if p in PLATFORM_SPECS and (platform_ids is not None or p not in disabled_set)
    ]

    out: dict[str, Any] = {}
    ok_count = 0
    async with cdp.CDPClient(st["ws_url"]) as client:
        for pid in ids:
            reading = await _collect_follower_one(client, pid)
            if reading is None:
                out[pid] = {"ok": False, "reason": "未登录或暂未读到粉丝数"}
                continue
            backfilled = save_follower_reading(conn, pid, reading)
            out[pid] = {"ok": True, "total": reading["total"], "backfilled": backfilled}
            ok_count += 1
            db.log_event(
                conn,
                "采数",
                PLATFORM_SPECS[pid]["name"],
                "采集粉丝数",
                f"实测 {reading['total']:,} 粉" + (f"（补齐 {backfilled} 天历史）" if backfilled else ""),
            )

    conn.execute("INSERT OR REPLACE INTO kv(k, v) VALUES ('last_metrics_at', ?)", (_now_hm(),))
    conn.commit()
    return {"ok": True, "collected": ok_count, "results": out, "last_metrics_at": _now_hm()}


def get_platform_status_map(conn: sqlite3.Connection) -> dict[str, dict[str, Any]]:
    rows = {r["platform"]: r for r in conn.execute("SELECT * FROM platform_status").fetchall()}
    out: dict[str, dict[str, Any]] = {}
    for pid in PLAT_ORDER:
        r = rows.get(pid)
        if r:
            out[pid] = {
                "state": r["state"],
                "detail": r["detail"],
                "disabled": bool(r["disabled"]),
                "checkedAt": r["checked_at"] or "未检查",
            }
        else:
            out[pid] = {
                "state": "warn",
                "detail": "尚未体检，点「全部检查」检测专用 Chrome 登录态",
                "disabled": False,
                "checkedAt": "未检查",
            }
    return out


def get_followers_map(conn: sqlite3.Connection, days: int = 30) -> dict[str, dict[str, int]]:
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    rows = conn.execute(
        "SELECT day, platform, total FROM followers_daily WHERE day >= ? ORDER BY day ASC", (cutoff,)
    ).fetchall()
    out: dict[str, dict[str, int]] = {}
    for r in rows:
        out.setdefault(r["platform"], {})[r["day"]] = int(r["total"])
    return out


def send_feishu_test(webhook: str) -> dict[str, Any]:
    url = (webhook or "").strip()
    if not url.startswith("https://"):
        raise ValueError("请先填写有效的飞书群机器人 Webhook（以 https:// 开头）")
    payload = {
        "msg_type": "text",
        "content": {
            "text": f"Park Studio 测试通知成功（{_now_hm()}）\n本地内容中控与飞书机器人已连通。",
        },
    }
    with httpx.Client(timeout=8.0) as client:
        resp = client.post(url, json=payload)
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
        if resp.status_code >= 400 or (isinstance(data, dict) and data.get("code", 0) not in (0, None)):
            raise RuntimeError(f"飞书返回错误：{data.get('msg') or resp.status_code}")
    return {"ok": True, "detail": "飞书测试消息已发送"}
