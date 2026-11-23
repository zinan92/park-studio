"""多平台真实作品流量采集与复盘聚合引擎（抖音 / 视频号 / B站 / YouTube / 小红书）。

100% 本地专用 Chrome CDP 采集，写入 SQLite（platform_works + work_snapshots），
零伪造数据：未采集到数据时返回真实空态，绝不用演示数字充数。
"""
from __future__ import annotations

import asyncio
import difflib
import json
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from statistics import median
from typing import Any

from . import cdp, config, db, platforms

CN = timezone(timedelta(hours=8))

_COVER_GRADS = [
    "linear-gradient(135deg,#B84208 0%,#E8843C 100%)",
    "linear-gradient(135deg,#1D5C63 0%,#417D7A 100%)",
    "linear-gradient(135deg,#3C2A6B 0%,#6F4E9C 100%)",
    "linear-gradient(135deg,#254E70 0%,#5B8FB9 100%)",
    "linear-gradient(135deg,#7A2E2E 0%,#C85A5A 100%)",
]


def _ts_to_day(ts: int) -> str:
    if not ts:
        return ""
    if ts > 10**12:
        ts = ts // 1000
    try:
        return datetime.fromtimestamp(ts, tz=CN).strftime("%Y-%m-%d")
    except Exception:
        return ""


def _parse_dur_str(s: str) -> int:
    parts = [p for p in re.findall(r"\d+", s or "")]
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    if len(parts) == 1:
        return int(parts[0])
    return 0


def _parse_count(s: Any) -> int:
    if isinstance(s, (int, float)):
        return max(0, int(s))
    txt = str(s or "").strip().replace(",", "")
    if not txt or txt in ("-", "—", "--"):
        return 0
    m = re.match(r"^([\d.]+)\s*([kKmMwW万亿]?)", txt)
    if not m:
        return 0
    val = float(m.group(1))
    unit = m.group(2).lower()
    if unit == "k":
        val *= 1_000
    elif unit in ("w", "万"):
        val *= 10_000
    elif unit == "m":
        val *= 1_000_000
    elif unit == "亿":
        val *= 100_000_000
    return max(0, int(round(val)))


def _parse_yt_date(txt: str) -> tuple[str, int]:
    """解析 YouTube Studio 日期，如 'Oct 20, 2026 Published' 或 '2026年10月20日'。"""
    s = (txt or "").strip()
    m_en = re.search(r"([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})", s)
    if m_en:
        try:
            dt = datetime.strptime(f"{m_en.group(1)} {m_en.group(2)} {m_en.group(3)}", "%b %d %Y").replace(tzinfo=CN)
            return dt.strftime("%Y-%m-%d"), int(dt.timestamp())
        except Exception:
            pass
    m_zh = re.search(r"(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日", s)
    if m_zh:
        try:
            dt = datetime(int(m_zh.group(1)), int(m_zh.group(2)), int(m_zh.group(3)), tzinfo=CN)
            return dt.strftime("%Y-%m-%d"), int(dt.timestamp())
        except Exception:
            pass
    m_iso = re.search(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m_iso:
        try:
            dt = datetime(int(m_iso.group(1)), int(m_iso.group(2)), int(m_iso.group(3)), tzinfo=CN)
            return dt.strftime("%Y-%m-%d"), int(dt.timestamp())
        except Exception:
            pass
    return "", 0


def _clean_title(raw: str) -> str:
    """提取作品主标题（去掉末尾 #话题 与多余换行）。"""
    txt = str(raw or "").strip()
    if not txt:
        return "未命名作品"
    first_line = txt.splitlines()[0].strip()
    before_hash = re.split(r"\s*#[^\s#]+", first_line)[0].strip()
    title = before_hash or first_line
    # 抖音 desc 常为「主标题 空格 正文开头...」，截取前 44 字保持清爽
    return title[:60].strip() or "未命名作品"


def _norm_key(title: str) -> str:
    t = _clean_title(title).lower()
    t = re.sub(r"[\s，。！？：；、“”‘’\"'【】\[\]()（）·\-_/—]+", "", t)
    return t


def _titles_match(a: str, b: str, ts_a: int, ts_b: int) -> bool:
    na, nb = _norm_key(a), _norm_key(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    short, long_ = (na, nb) if len(na) <= len(nb) else (nb, na)
    if len(short) >= 6 and short in long_:
        return True
    ratio = difflib.SequenceMatcher(None, na[:24], nb[:24]).ratio()
    if ratio >= 0.68:
        return True
    # 如果发布时间相差 <= 4 天且前 16 字相似度 >= 0.50，判定为同一期多平台分发
    if ts_a and ts_b and abs(ts_a - ts_b) <= 4 * 86400 and ratio >= 0.50:
        return True
    return False


async def _wait_origin(client: cdp.CDPClient, sid: str, host_substr: str, *, timeout_s: float = 10.0) -> bool:
    import time

    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        try:
            href = str(await client.evaluate(sid, "location.href") or "")
            if host_substr in href:
                return True
        except Exception:
            pass
        await asyncio.sleep(0.8)
    return False


async def _collect_douyin(client: cdp.CDPClient) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    async def fn(sid: str, _tid: str) -> None:
        if not await _wait_origin(client, sid, "douyin.com", timeout_s=10.0):
            return
        await asyncio.sleep(1.5)
        data = await client.evaluate(
            sid,
            """(async () => {
              const r = await fetch('/janus/douyin/creator/pc/work_list?status=0&count=30&max_cursor=0&scene=star_atlas&device_platform=android&aid=1128', {credentials:'include'});
              return await r.json();
            })()""",
        )
        for a in (data or {}).get("aweme_list") or []:
            wid = str(a.get("aweme_id") or "").strip()
            if not wid:
                continue
            st = a.get("statistics") or {}
            ts = int(a.get("create_time") or 0)
            dur_ms = int((a.get("video") or {}).get("duration") or a.get("duration") or 0)
            dur_s = dur_ms // 1000 if dur_ms > 2000 else dur_ms
            items.append({
                "platform": "douyin",
                "work_id": wid,
                "title": _clean_title(a.get("desc") or a.get("item_title") or ""),
                "url": f"https://www.douyin.com/video/{wid}",
                "published_at": _ts_to_day(ts),
                "published_ts": ts,
                "duration_sec": max(0, int(dur_s)),
                "views": int(st.get("play_count") or 0),
                "likes": int(st.get("digg_count") or 0),
                "comments": int(st.get("comment_count") or 0),
                "favorites": int(st.get("collect_count") or 0),
                "shares": int(st.get("share_count") or 0),
                "raw": {"desc": a.get("desc") or ""},
            })

    await client.with_tab("https://creator.douyin.com/creator-micro/content/manage", fn, wait_s=0.0)
    return items


async def _collect_bilibili(client: cdp.CDPClient) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    async def fn(sid: str, _tid: str) -> None:
        if not await _wait_origin(client, sid, "bilibili.com", timeout_s=10.0):
            return
        await asyncio.sleep(1.5)
        data = await client.evaluate(
            sid,
            "fetch('/x/web/archives?status=is_pubing,pubed,not_pubed&pn=1&ps=30&coop=1&interactive=1',{credentials:'include'}).then(r=>r.json()).catch(()=>null)",
        )
        for a in ((data or {}).get("data") or {}).get("arc_audits") or []:
            arc = a.get("Archive") or {}
            st = a.get("stat") or {}
            bvid = str(arc.get("bvid") or "").strip()
            if not bvid:
                continue
            ts = int(arc.get("ptime") or arc.get("ctime") or 0)
            items.append({
                "platform": "bilibili",
                "work_id": bvid,
                "title": _clean_title(arc.get("title") or ""),
                "url": f"https://www.bilibili.com/video/{bvid}",
                "published_at": _ts_to_day(ts),
                "published_ts": ts,
                "duration_sec": int(arc.get("duration") or 0),
                "views": int(st.get("view") or 0),
                "likes": int(st.get("like") or 0),
                "comments": int(st.get("reply") or 0),
                "favorites": int(st.get("favorite") or 0),
                "shares": int(st.get("share") or 0),
                "raw": {"coin": int(st.get("coin") or 0), "danmaku": int(st.get("danmaku") or 0)},
            })

    await client.with_tab("https://member.bilibili.com/platform/upload-manager/article", fn, wait_s=0.0)
    return items


async def _collect_channels(client: cdp.CDPClient) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    async def fn(sid: str, _tid: str) -> None:
        if not await _wait_origin(client, sid, "channels.weixin.qq.com", timeout_s=12.0):
            return
        await asyncio.sleep(1.5)
        data = await client.evaluate(
            sid,
            """(async () => {
              const r = await fetch('/cgi-bin/mmfinderassistant-bin/post/post_list', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageSize: 30, currentPage: 1, reqScene: 7 })
              });
              return await r.json();
            })()""",
        )
        if not isinstance(data, dict) or data.get("errCode") != 0:
            return
        for x in (data.get("data") or {}).get("list") or []:
            oid = str(x.get("objectId") or "").strip()
            if not oid:
                continue
            ts = int(x.get("createTime") or 0)
            desc_obj = x.get("desc") or {}
            media = (desc_obj.get("media") or [{}])[0] if isinstance(desc_obj.get("media"), list) and desc_obj.get("media") else {}
            dur = int(media.get("videoPlayLen") or 0)
            items.append({
                "platform": "channels",
                "work_id": oid,
                "title": _clean_title(desc_obj.get("description") or ""),
                "url": "https://channels.weixin.qq.com/platform/post/list",
                "published_at": _ts_to_day(ts),
                "published_ts": ts,
                "duration_sec": dur,
                "views": int(x.get("readCount") or 0),
                "likes": int(x.get("likeCount") or 0),
                "comments": int(x.get("commentCount") or 0),
                "favorites": int(x.get("favCount") or 0),
                "shares": int(x.get("forwardCount") or 0),
                "raw": {"description": desc_obj.get("description") or ""},
            })

    await client.with_tab("https://channels.weixin.qq.com/platform", fn, wait_s=0.0)
    return items


async def _collect_youtube(client: cdp.CDPClient) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    async def fn(sid: str, _tid: str) -> None:
        for _ in range(10):
            has_rows = await client.evaluate(sid, "document.querySelectorAll('ytcp-video-row').length > 0")
            if has_rows:
                break
            await asyncio.sleep(1.0)
        await asyncio.sleep(1.0)
        rows = await client.evaluate(
            sid,
            """(() => {
              return Array.from(document.querySelectorAll('ytcp-video-row')).slice(0, 30).map(r => ({
                title: (r.querySelector('#video-title')?.innerText || '').trim(),
                href: r.querySelector('a#video-title')?.href || '',
                dur: (r.querySelector('.label.style-scope.ytd-thumbnail-overlay-time-status-renderer, ytcp-thumbnail .label')?.innerText || '').trim(),
                vis: (r.querySelector('.tablecell-visibility')?.innerText || '').trim(),
                date: (r.querySelector('.tablecell-date')?.innerText || '').replace(/\\s+/g, ' ').trim(),
                views: (r.querySelector('.tablecell-views')?.innerText || '').trim(),
                comments: (r.querySelector('.tablecell-comments')?.innerText || '').trim(),
                likes: (r.querySelector('.tablecell-likes .likes-label, .tablecell-likes')?.innerText || '').trim()
              }));
            })()""",
        )
        for r in rows or []:
            vis = str(r.get("vis") or "").lower()
            href = str(r.get("href") or "")
            if "draft" in vis or "草稿" in vis or not href:
                continue
            m_vid = re.search(r"/video/([A-Za-z0-9_-]+)/", href)
            vid = m_vid.group(1) if m_vid else href
            day, ts = _parse_yt_date(str(r.get("date") or ""))
            items.append({
                "platform": "youtube",
                "work_id": vid,
                "title": _clean_title(r.get("title") or ""),
                "url": f"https://youtu.be/{vid}" if m_vid else href,
                "published_at": day,
                "published_ts": ts,
                "duration_sec": _parse_dur_str(str(r.get("dur") or "")),
                "views": _parse_count(r.get("views")),
                "likes": _parse_count(r.get("likes")),
                "comments": _parse_count(r.get("comments")),
                "favorites": 0,
                "shares": 0,
                "raw": {"vis": r.get("vis") or "", "date_raw": r.get("date") or ""},
            })

    await client.with_tab("https://studio.youtube.com/channel/UC/videos/upload", fn, wait_s=0.0)
    return items


async def _collect_xhs(client: cdp.CDPClient) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    async def fn(sid: str, _tid: str) -> None:
        for _ in range(6):
            href = str(await client.evaluate(sid, "location.href") or "")
            if "xiaohongshu.com" in href:
                break
            await asyncio.sleep(1.0)
        href = str(await client.evaluate(sid, "location.href") or "")
        if "xiaohongshu.com" not in href:
            return
        await asyncio.sleep(2.0)
        data = await client.evaluate(
            sid,
            """(async () => {
              for (const u of [
                '/api/galaxy/creator/note/user/posted?tab=0&page=0',
                '/api/galaxy/creator/datacenter/note/analyze/list?page_num=1&page_size=20&type=0&time=90'
              ]) {
                try {
                  const r = await fetch(u, {credentials:'include', signal: AbortSignal.timeout(4000)}).then(x=>x.json());
                  const list = r?.data?.notes || r?.data?.note_infos || r?.data?.list || [];
                  if (list.length) return list;
                } catch(e) {}
              }
              return [];
            })()""",
        )
        for n in data or []:
            nid = str(n.get("id") or n.get("note_id") or "").strip()
            if not nid:
                continue
            ts = int(n.get("time") or n.get("post_time") or 0)
            if ts > 10**12:
                ts //= 1000
            items.append({
                "platform": "xhs",
                "work_id": nid,
                "title": _clean_title(n.get("display_title") or n.get("title") or ""),
                "url": f"https://www.xiaohongshu.com/explore/{nid}",
                "published_at": _ts_to_day(ts),
                "published_ts": ts,
                "duration_sec": int(n.get("duration") or 0),
                "views": int(n.get("view_count") or n.get("read_count") or n.get("imp_count") or 0),
                "likes": int(n.get("likes") or n.get("like_count") or 0),
                "comments": int(n.get("comments_count") or n.get("comment_count") or 0),
                "favorites": int(n.get("collected_count") or n.get("fav_count") or 0),
                "shares": int(n.get("shared_count") or n.get("share_count") or 0),
                "raw": {},
            })

    await client.with_tab("https://creator.xiaohongshu.com/new/note-manager", fn, wait_s=0.0)
    return items


COLLECTORS = {
    "douyin": _collect_douyin,
    "channels": _collect_channels,
    "bilibili": _collect_bilibili,
    "youtube": _collect_youtube,
    "xhs": _collect_xhs,
}


def upsert_works(conn: sqlite3.Connection, works: list[dict[str, Any]]) -> int:
    if not works:
        return 0
    now_dt = datetime.now(CN)
    today = now_dt.strftime("%Y-%m-%d")
    now_ts = int(now_dt.timestamp())
    ts_iso = db.now_iso()
    saved = 0
    for w in works:
        pid = str(w["platform"])
        wid = str(w["work_id"])
        pub_ts = int(w.get("published_ts") or 0)
        age = max(0, (now_ts - pub_ts) // 86400) if pub_ts else 0
        conn.execute(
            """INSERT INTO platform_works(
                 platform, work_id, title, url, published_at, published_ts, duration_sec,
                 views, likes, comments, favorites, shares, raw_json, collected_at
               ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(platform, work_id) DO UPDATE SET
                 title=excluded.title, url=excluded.url,
                 published_at=CASE WHEN excluded.published_at != '' THEN excluded.published_at ELSE platform_works.published_at END,
                 published_ts=CASE WHEN excluded.published_ts > 0 THEN excluded.published_ts ELSE platform_works.published_ts END,
                 duration_sec=CASE WHEN excluded.duration_sec > 0 THEN excluded.duration_sec ELSE platform_works.duration_sec END,
                 views=excluded.views, likes=excluded.likes, comments=excluded.comments,
                 favorites=excluded.favorites, shares=excluded.shares,
                 raw_json=excluded.raw_json, collected_at=excluded.collected_at""",
            (
                pid, wid, str(w.get("title") or "未命名作品"), str(w.get("url") or ""),
                str(w.get("published_at") or ""), pub_ts, int(w.get("duration_sec") or 0),
                int(w.get("views") or 0), int(w.get("likes") or 0), int(w.get("comments") or 0),
                int(w.get("favorites") or 0), int(w.get("shares") or 0),
                json.dumps(w.get("raw") or {}, ensure_ascii=False), ts_iso,
            ),
        )
        conn.execute(
            """INSERT INTO work_snapshots(day, platform, work_id, age_days, views, likes, comments, favorites, shares, collected_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(day, platform, work_id) DO UPDATE SET
                 age_days=excluded.age_days, views=excluded.views, likes=excluded.likes,
                 comments=excluded.comments, favorites=excluded.favorites, shares=excluded.shares,
                 collected_at=excluded.collected_at""",
            (
                today, pid, wid, age,
                int(w.get("views") or 0), int(w.get("likes") or 0), int(w.get("comments") or 0),
                int(w.get("favorites") or 0), int(w.get("shares") or 0), ts_iso,
            ),
        )
        saved += 1
    conn.commit()
    return saved


async def collect_all_works(
    conn: sqlite3.Connection,
    cfg: dict[str, Any] | None = None,
    target_platforms: list[str] | None = None,
) -> dict[str, Any]:
    """通过专用 Chrome CDP 依次采集各已启用平台的真实已发作品与播放/互动数据。"""
    cfg = cfg or config.load_config()
    st = cdp.chrome_status(cfg)
    if not st["online"]:
        st = cdp.ensure_chrome(cfg, foreground=False)

    disabled = {
        r["platform"]
        for r in conn.execute("SELECT platform FROM platform_status WHERE disabled=1").fetchall()
    }
    wanted = [p for p in (target_platforms or list(COLLECTORS.keys())) if p in COLLECTORS and p not in disabled]

    per_plat: dict[str, dict[str, Any]] = {}
    total_saved = 0

    async with cdp.CDPClient(st["ws_url"], cmd_timeout=18.0) as client:
        for pid in wanted:
            pname = platforms.PLATFORM_SPECS[pid]["name"]
            try:
                rows = await COLLECTORS[pid](client)
                n = upsert_works(conn, rows)
                total_saved += n
                tot_v = sum(int(r.get("views") or 0) for r in rows)
                per_plat[pid] = {"ok": True, "count": n, "views": tot_v}
                if n > 0:
                    db.log_event(conn, "采流量", pname, "采集作品流量", f"实测 {n} 条作品 · 累计 {tot_v:,} 播放")
                else:
                    db.log_event(conn, "采流量", pname, "采集作品流量", "未读到作品列表（可能未登录或网络超时）")
            except Exception as exc:
                per_plat[pid] = {"ok": False, "count": 0, "error": str(exc)[:120]}
                db.log_event(conn, "采流量", pname, "采集作品流量", f"采集异常：{str(exc)[:50]}")

    last_at = datetime.now(CN).strftime("今天 %H:%M")
    conn.execute("INSERT OR REPLACE INTO kv(k, v) VALUES ('last_metrics_at', ?)", (last_at,))
    conn.commit()

    return {
        "ok": True,
        "collected": total_saved,
        "platforms": per_plat,
        "last_metrics_at": last_at,
        "analytics": build_analytics(conn),
        "daemonLogs": [dict(r) for r in conn.execute("SELECT ts, episode AS ep, platform AS plat, action, result FROM daemon_logs ORDER BY id DESC LIMIT 30").fetchall()],
    }


def _group_episodes(works: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """把多平台发布的同一期视频按标题相似度 + 发布时间自动归并为跨平台单期卡片。"""
    groups: list[dict[str, Any]] = []
    # 按发布时间倒序处理，同平台重复取播放更高的
    ordered = sorted(works, key=lambda x: (int(x.get("published_ts") or 0), int(x.get("views") or 0)), reverse=True)
    for w in ordered:
        matched = None
        for g in groups:
            if w["platform"] in g["platforms"]:
                continue
            if _titles_match(w["title"], g["title"], int(w.get("published_ts") or 0), int(g["published_ts"])):
                matched = g
                break
        if matched is None:
            groups.append({
                "title": w["title"],
                "published_at": w["published_at"],
                "published_ts": int(w.get("published_ts") or 0),
                "duration_sec": int(w.get("duration_sec") or 0),
                "platforms": {w["platform"]: w},
            })
        else:
            matched["platforms"][w["platform"]] = w
            if int(w.get("published_ts") or 0) > matched["published_ts"]:
                matched["published_ts"] = int(w.get("published_ts") or 0)
                if w.get("published_at"):
                    matched["published_at"] = w["published_at"]
            if not matched["duration_sec"] and w.get("duration_sec"):
                matched["duration_sec"] = int(w["duration_sec"])
            # 优先选用更干净简洁的标题（如 B 站 / YouTube 标题通常不带正文）
            if w["platform"] in ("bilibili", "youtube") and 6 <= len(w["title"]) <= 36:
                matched["title"] = w["title"]

    groups.sort(key=lambda g: (g["published_ts"], sum(x["views"] for x in g["platforms"].values())), reverse=True)

    out: list[dict[str, Any]] = []
    for idx, g in enumerate(groups):
        views = sum(int(x["views"]) for x in g["platforms"].values())
        likes = sum(int(x["likes"]) for x in g["platforms"].values())
        comments = sum(int(x["comments"]) for x in g["platforms"].values())
        favorites = sum(int(x["favorites"]) for x in g["platforms"].values())
        shares = sum(int(x["shares"]) for x in g["platforms"].values())
        inter = likes + comments + favorites + shares
        t = g["title"]
        cover_title = t[:12] + ("\n" + t[12:24] if len(t) > 12 else "")
        out.append({
            "id": f"real-{idx + 1}",
            "index": idx + 1,
            "nick": t[:16] + ("…" if len(t) > 16 else ""),
            "title": t,
            "coverTitle": cover_title,
            "coverGrad": _COVER_GRADS[idx % len(_COVER_GRADS)],
            "published_at": g["published_at"],
            "published_ts": g["published_ts"],
            "duration_sec": g["duration_sec"],
            "platformCount": len(g["platforms"]),
            "views": views,
            "likes": likes,
            "comments": comments,
            "favorites": favorites,
            "shares": shares,
            "inter": inter,
            "interRate": round((inter / views) * 100, 1) if views else 0.0,
            "platforms": {
                pid: {
                    "work_id": w["work_id"],
                    "title": w["title"],
                    "url": w["url"],
                    "published_at": w["published_at"],
                    "views": w["views"],
                    "likes": w["likes"],
                    "comments": w["comments"],
                    "favorites": w["favorites"],
                    "shares": w["shares"],
                    "duration_sec": w["duration_sec"],
                }
                for pid, w in g["platforms"].items()
            },
        })
    return out


def build_analytics(conn: sqlite3.Connection) -> dict[str, Any]:
    """基于 SQLite 真实采集的 platform_works、work_snapshots 与 followers_daily 生成全量复盘与大屏结论。"""
    rows = conn.execute(
        """SELECT platform, work_id, title, url, published_at, published_ts, duration_sec,
                  views, likes, comments, favorites, shares, collected_at
           FROM platform_works
           ORDER BY published_ts DESC, views DESC"""
    ).fetchall()
    works = [dict(r) for r in rows]
    episodes = _group_episodes(works)

    # 1. 抖音作品分析（完全基于真实采集的抖音作品）
    dy_works = [w for w in works if w["platform"] == "douyin"]
    dy_views = [int(w["views"]) for w in dy_works]
    dy_likes = [int(w["likes"]) for w in dy_works]
    dy_favs = [int(w["favorites"]) for w in dy_works]
    med_views = int(round(median(dy_views))) if dy_views else 0
    med_likes = int(round(median(dy_likes))) if dy_likes else 0
    tot_dy_likes = sum(dy_likes)
    tot_dy_favs = sum(dy_favs)
    fav_like_pct = round((tot_dy_favs / tot_dy_likes) * 100, 1) if tot_dy_likes else 0.0

    scatter: list[dict[str, Any]] = []
    hit_3x = 0
    for w in dy_works:
        mult = round(w["views"] / med_views, 1) if med_views > 0 else 1.0
        if mult >= 3.0:
            hit_3x += 1
        scatter.append({
            "work_id": w["work_id"],
            "title": w["title"],
            "sec": int(w["duration_sec"] or 0),
            "views": int(w["views"] or 0),
            "likes": int(w["likes"] or 0),
            "favorites": int(w["favorites"] or 0),
            "comments": int(w["comments"] or 0),
            "shares": int(w["shares"] or 0),
            "mult": mult,
            "published_at": w["published_at"],
            "url": w["url"],
        })

    # 2. 跨平台单期对比与多日快照（用于「同龄复盘」）
    snap_rows = conn.execute(
        "SELECT day, platform, work_id, age_days, views, likes, favorites FROM work_snapshots ORDER BY day ASC"
    ).fetchall()
    snaps_by_work: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for sr in snap_rows:
        snaps_by_work.setdefault((sr["platform"], sr["work_id"]), []).append(dict(sr))

    age_reviews: list[dict[str, Any]] = []
    for i, ep in enumerate(episodes[:8]):
        prev = episodes[i + 1] if i + 1 < len(episodes) else None
        prev_views = prev["views"] if prev else 0
        ratio = round(ep["views"] / prev_views, 1) if prev_views > 0 else None
        # 聚合该期已有快照天数
        day_totals: dict[str, dict[str, int]] = {}
        for pid, pw in ep["platforms"].items():
            for s in snaps_by_work.get((pid, pw["work_id"]), []):
                d = day_totals.setdefault(s["day"], {"age": s["age_days"], "views": 0, "likes": 0, "favorites": 0})
                d["views"] += int(s["views"])
                d["likes"] += int(s["likes"])
                d["favorites"] += int(s["favorites"])
                d["age"] = max(d["age"], int(s["age_days"]))
        snapshots = [{"day": d, **v} for d, v in sorted(day_totals.items())]
        age_reviews.append({
            "title": ep["title"],
            "nick": ep["nick"],
            "published_at": ep["published_at"],
            "views": ep["views"],
            "inter": ep["inter"],
            "interRate": ep["interRate"],
            "prevViews": prev_views,
            "prevTitle": prev["nick"] if prev else "",
            "ratio": ratio,
            "platforms": ep["platforms"],
            "snapshots": snapshots,
        })

    # 3. 粉丝真实统计（供人话结论和周报用）
    fol_rows = conn.execute("SELECT day, platform, total FROM followers_daily ORDER BY day ASC").fetchall()
    fol_by_plat: dict[str, dict[str, int]] = {}
    for r in fol_rows:
        fol_by_plat.setdefault(r["platform"], {})[r["day"]] = int(r["total"])

    fan_summary: list[dict[str, Any]] = []
    for pid, dmap in fol_by_plat.items():
        days = sorted(dmap.keys())
        if not days:
            continue
        last = dmap[days[-1]]
        d7 = dmap[days[max(0, len(days) - 8)]]
        fan_summary.append({"platform": pid, "name": platforms.PLATFORM_SPECS.get(pid, {}).get("name", pid), "total": last, "d7": last - d7})
    fan_summary.sort(key=lambda x: x["total"], reverse=True)
    tot_fans = sum(x["total"] for x in fan_summary)
    tot_d7 = sum(x["d7"] for x in fan_summary)

    # 4. 动态「人话结论」（100% 来自真实采集数据，无硬编码演示数字）
    insights: list[dict[str, str]] = []
    if fan_summary:
        top_f = max(fan_summary, key=lambda x: x["d7"])
        if tot_d7 > 0:
            share = round((top_f["d7"] / tot_d7) * 100)
            insights.append({
                "cls": "g",
                "tag": "涨粉",
                "html": f"近 7 天涨粉最多的是 <b>{top_f['name']} +{top_f['d7']:,}</b>，占全网近 7 天净增 +{tot_d7:,} 的 <b>{share}%</b>（全网总粉 {tot_fans:,}）。",
            })
        else:
            lead = fan_summary[0]
            insights.append({
                "cls": "g",
                "tag": "粉丝",
                "html": f"当前全网实测总粉 <b>{tot_fans:,}</b>，主力阵地为 <b>{lead['name']} {lead['total']:,}</b>（持续每日采数后将自动显示 7 日净增）。",
            })

    if episodes:
        latest = episodes[0]
        plat_names = " / ".join(platforms.PLATFORM_SPECS.get(p, {}).get("name", p) for p in latest["platforms"])
        insights.append({
            "cls": "o",
            "tag": "最新期",
            "html": f"「<b>{latest['nick']}</b>」已覆盖 {plat_names}，全网实测播放 <b>{latest['views']:,}</b>、总互动 <b>{latest['inter']:,}</b>（互动率 {latest['interRate']}%）。",
        })
        top_ep = max(episodes, key=lambda e: e["views"])
        insights.append({
            "cls": "b",
            "tag": "代表作",
            "html": f"已采作品中最高播放是「<b>{top_ep['nick']}</b>」<b>{top_ep['views']:,}</b> 播放（收藏 {top_ep['favorites']:,} · 赞 {top_ep['likes']:,}）。",
        })

    if dy_works:
        insights.append({
            "cls": "p",
            "tag": "抖音",
            "html": f"近 {len(dy_works)} 条抖音实测中位播放 <b>{med_views:,}</b>、中位点赞 <b>{med_likes:,}</b>，收藏/赞比 <b>{fav_like_pct}%</b>，3× 以上爆款 <b>{hit_3x} 条</b>。",
        })
    elif not episodes:
        insights.append({
            "cls": "o",
            "tag": "待采集",
            "html": "尚未采集各平台已发作品数据，点击右上角「<b>立即采数</b>」即可从专用 Chrome 实时拉取真实播放与互动。",
        })

    # 5. 动态真实周报文本
    now_str = datetime.now(CN).strftime("%Y-%m-%d %H:%M")
    plat_totals: dict[str, int] = {}
    for w in works:
        plat_totals[w["platform"]] = plat_totals.get(w["platform"], 0) + int(w["views"])
    plat_view_line = " · ".join(
        f"{platforms.PLATFORM_SPECS.get(p, {}).get('name', p)} {v:,}"
        for p, v in sorted(plat_totals.items(), key=lambda kv: kv[1], reverse=True)
    ) or "暂无作品播放数据"
    fan_line = " · ".join(f"{x['name']} {x['total']:,}" for x in fan_summary) or "暂无粉丝数据"
    top3_lines = "\n".join(
        f"  {i + 1}. 《{e['title'][:32]}》 {e['views']:,} 播放 · {e['inter']:,} 互动（{e['published_at'] or '日期未标'}）"
        for i, e in enumerate(episodes[:5])
    ) or "  （点击右上角「立即采流量」拉取真实作品数据）"
    weekly_report = (
        f"🗓 Park Studio 真实数据简报｜生成于 {now_str}\n"
        f"已采集作品：{len(works)} 条（跨平台归并 {len(episodes)} 期）\n"
        f"各平台累计播放：{plat_view_line}\n"
        f"各平台实测粉丝：{fan_line}（合计 {tot_fans:,}）\n"
        f"最近 5 期真实表现：\n{top3_lines}"
    )

    last_at_row = conn.execute("SELECT v FROM kv WHERE k='last_metrics_at'").fetchone()

    return {
        "hasLiveWorks": len(works) > 0,
        "totalWorks": len(works),
        "totalEpisodes": len(episodes),
        "lastMetricsAt": last_at_row["v"] if last_at_row else "未采集",
        "platformCounts": {
            pid: sum(1 for w in works if w["platform"] == pid)
            for pid in platforms.PLAT_ORDER
        },
        "episodes": episodes[:15],
        "works": works[:60],
        "douyin": {
            "count": len(dy_works),
            "medianViews": med_views,
            "medianLikes": med_likes,
            "favLikePct": fav_like_pct,
            "hit3xCount": hit_3x,
            "scatter": scatter,
        },
        "ageReviews": age_reviews,
        "insights": insights,
        "weeklyReport": weekly_report,
    }
