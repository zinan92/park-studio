"""100% MIT 开源自研多平台 CDP 自动填表发布引擎与自动取链器。

核心原则：
1. 零闭源插件依赖：全部基于本机专用 Chrome CDP (:9333) 完成文件上传、标题/正文/话题填写与提交前截图存档。
2. 安全护栏：国内 4 家（抖音 / 小红书 / B 站 / 视频号）严格「只填不点发」，保存提交前 JPEG 截图并停留在 `awaiting_user`，由创作者亲自核对点最后一下发布。
3. 自动取链回填：发布后扫描各平台创作者后台已发布列表，按标题前缀匹配并写回作品链接与实测播放/互动数据到 SQLite。
"""
from __future__ import annotations

import asyncio
import json
import sqlite3
from pathlib import Path
from typing import Any

from . import cdp, config, db, platforms

UPLOAD_URLS: dict[str, str] = {
    "douyin": "https://creator.douyin.com/creator-micro/content/upload",
    "xhs": "https://creator.xiaohongshu.com/publish/publish?source=official&target=video",
    "bilibili": "https://member.bilibili.com/platform/upload/video/frame",
    "channels": "https://channels.weixin.qq.com/platform/post/create",
    "youtube": "https://studio.youtube.com/",
    "x": "https://x.com/compose/post",
    "wechat": "https://mp.weixin.qq.com/",
}

DOMESTIC_MANUAL = {"douyin", "xhs", "bilibili", "channels"}


def check_mp4_faststart(path: Path) -> dict[str, Any]:
    """纯 Python 校验 MP4 是否满足 faststart（moov atom 在 mdat 之前），不依赖外部 ffprobe。"""
    if not path.is_file():
        return {"exists": False, "faststart": False, "size_mb": 0.0, "note": "未指定或找不到本地视频文件"}
    size_mb = round(path.stat().st_size / (1024 * 1024), 1)
    try:
        with path.open("rb") as fh:
            head = fh.read(131072)
        moov = head.find(b"moov")
        mdat = head.find(b"mdat")
        ok = moov != -1 and (mdat == -1 or moov < mdat)
        return {
            "exists": True,
            "faststart": ok,
            "size_mb": size_mb,
            "note": f"{size_mb} MB · faststart {'✓' if ok else '建议 ffmpeg -movflags +faststart'}",
        }
    except OSError as exc:
        return {"exists": True, "faststart": False, "size_mb": size_mb, "note": str(exc)}


def preflight_episode(ep: dict[str, Any]) -> dict[str, Any]:
    vp = Path(ep.get("videoPath") or "").expanduser() if ep.get("videoPath") else None
    cv = Path(ep.get("coverVPath") or "").expanduser() if ep.get("coverVPath") else None
    ch = Path(ep.get("coverHPath") or "").expanduser() if ep.get("coverHPath") else None
    video_info = check_mp4_faststart(vp) if vp else {"exists": False, "faststart": False, "size_mb": 0.0, "note": "尚未绑定本地成片路径"}
    return {
        "video": video_info,
        "cover_v": bool(cv and cv.is_file()),
        "cover_h": bool(ch and ch.is_file()),
        "has_copy": bool((ep.get("publishJson") or {}).get("title") or ep.get("title")),
    }


def list_episodes(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT * FROM publish_episodes ORDER BY episode DESC, id DESC").fetchall()
    out: list[dict[str, Any]] = []
    for r in rows:
        tasks_rows = conn.execute("SELECT * FROM publish_tasks WHERE episode_id=?", (r["id"],)).fetchall()
        tasks: dict[str, Any] = {}
        for t in tasks_rows:
            shot = t["screenshot_path"] or ""
            tasks[t["platform"]] = {
                "state": t["state"],
                "detail": t["detail"],
                "url": t["url"],
                "screenshot": shot,
                "hasScreenshot": bool(shot and Path(shot).is_file()),
                "updatedAt": (t["updated_at"] or "")[:16].replace("T", " "),
                "m": json.loads(t["metrics_json"] or "{}") or None,
            }
        ep = {
            "id": r["id"],
            "episode": r["episode"],
            "nick": r["nick"],
            "title": r["title"],
            "campaign": r["campaign"],
            "schedule": r["schedule"],
            "videoPath": r["video_path"],
            "coverVPath": r["cover_v_path"],
            "coverHPath": r["cover_h_path"],
            "publishJson": json.loads(r["publish_json"] or "{}"),
            "tasks": tasks,
        }
        ep["preflight"] = preflight_episode(ep)
        out.append(ep)
    return out


def get_episode(conn: sqlite3.Connection, episode_id: int) -> dict[str, Any] | None:
    return next((e for e in list_episodes(conn) if e["id"] == episode_id), None)


def pack_episode(
    conn: sqlite3.Connection,
    episode_id: int,
    *,
    video_path: str | None = None,
    cover_v_path: str | None = None,
    cover_h_path: str | None = None,
    schedule: str | None = None,
    publish_json: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """保存并落盘 ~/.park-studio/projects/EP{n}/publish.json，返回最新工程与 preflight 校验。"""
    ep = get_episode(conn, episode_id)
    if not ep:
        raise ValueError("找不到该发布期次")

    vp = video_path if video_path is not None else ep["videoPath"]
    cv = cover_v_path if cover_v_path is not None else ep["coverVPath"]
    ch = cover_h_path if cover_h_path is not None else ep["coverHPath"]
    sched = schedule if schedule is not None else ep["schedule"]
    pjson = publish_json if publish_json is not None else ep["publishJson"]
    pjson = {
        **pjson,
        "episode": ep["episode"],
        "title": pjson.get("title") or ep["title"],
        "schedule": sched,
        "utm_campaign": pjson.get("utm_campaign") or ep["campaign"],
        "video_path": vp,
        "cover_v_path": cv,
        "cover_h_path": ch,
    }
    ts = db.now_iso()
    conn.execute(
        """UPDATE publish_episodes
           SET video_path=?, cover_v_path=?, cover_h_path=?, schedule=?, publish_json=?, updated_at=?
           WHERE id=?""",
        (vp, cv, ch, sched, json.dumps(pjson, ensure_ascii=False), ts, episode_id),
    )
    conn.commit()

    ep_dir = config.projects_dir() / f"EP{ep['episode']}"
    ep_dir.mkdir(parents=True, exist_ok=True)
    out_file = ep_dir / "publish.json"
    out_file.write_text(json.dumps(pjson, ensure_ascii=False, indent=2), encoding="utf-8")
    db.log_event(conn, f"EP{ep['episode']}", "打包", "导出 publish.json", str(out_file))
    updated = get_episode(conn, episode_id)
    assert updated is not None
    return {"ok": True, "path": str(out_file), "episode": updated}


def _copy_for_platform(ep: dict[str, Any], pid: str) -> tuple[str, str, list[str]]:
    pj = ep.get("publishJson") or {}
    p_over = (pj.get("platforms") or {}).get(pid) or {}
    title = str(p_over.get("title") or pj.get("title") or ep.get("title") or "").strip()
    desc = str(p_over.get("text") or p_over.get("description") or pj.get("description") or title).strip()
    tags = [str(t).lstrip("#").strip() for t in (p_over.get("tags") or pj.get("tags") or []) if str(t).strip()]
    return title, desc, tags


async def _wait_for_selector(client: cdp.CDPClient, sid: str, selector: str, *, timeout_s: float = 12.0) -> bool:
    """轮询等待 SPA 页面的目标输入元素真正挂载到 DOM。"""
    import time

    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        try:
            ok = await client.evaluate(sid, f"!!document.querySelector({json.dumps(selector)})")
            if ok:
                return True
        except Exception:
            pass
        await asyncio.sleep(0.6)
    return False


async def _set_input_value(client: cdp.CDPClient, sid: str, selector: str, value: str, *, wait_s: float = 10.0) -> bool:
    if not await _wait_for_selector(client, sid, selector, timeout_s=wait_s):
        return False
    js = f"""(() => {{
      const el = document.querySelector({json.dumps(selector)});
      if (!el) return false;
      el.focus();
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, {json.dumps(value)});
      else el.value = {json.dumps(value)};
      el.dispatchEvent(new Event('input', {{ bubbles: true }}));
      el.dispatchEvent(new Event('change', {{ bubbles: true }}));
      return true;
    }})()"""
    return bool(await client.evaluate(sid, js))


async def _focus_and_insert(client: cdp.CDPClient, sid: str, selector: str, text: str, *, wait_s: float = 12.0) -> bool:
    """等待元素挂载 → 用原生 CDP 鼠标点击真实聚焦（兼容 X DraftJS / React 编辑器）→ Input.insertText 写入。"""
    if not await _wait_for_selector(client, sid, selector, timeout_s=wait_s):
        return False
    rect = await client.evaluate(
        sid,
        f"""(() => {{
          const el = document.querySelector({json.dumps(selector)});
          if (!el) return null;
          el.scrollIntoView({{ block: 'center' }});
          el.focus();
          const r = el.getBoundingClientRect();
          return {{ x: r.left + Math.min(24, r.width / 2), y: r.top + Math.min(18, r.height / 2) }};
        }})()""",
    )
    if not isinstance(rect, dict):
        return False
    active_sid = client._session_aliases.get(sid, sid)
    x, y = float(rect["x"]), float(rect["y"])
    await client.send("Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1}, session_id=active_sid)
    await client.send("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1}, session_id=active_sid)
    await asyncio.sleep(0.25)
    await client.insert_text(sid, text)
    return True


async def fill_platform(
    conn: sqlite3.Connection,
    episode_id: int,
    pid: str,
    *,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """在专用 Chrome (:9333) 打开对应平台创作页、上传成片（若有）、填好标题/正文/标签并截图留档。

    国内 4 家（douyin/xhs/bilibili/channels）严格只填不点发，保留标签页打开供创作者亲自点最后一下发布！
    """
    if pid not in UPLOAD_URLS:
        raise ValueError(f"不支持的平台：{pid}")
    ep = get_episode(conn, episode_id)
    if not ep:
        raise ValueError("找不到该发布期次")

    cfg = cfg or config.load_config()
    st = cdp.ensure_chrome(cfg, foreground=True)
    title, desc, tags = _copy_for_platform(ep, pid)
    tag_line = " ".join(f"#{t}" for t in tags)
    full_body = f"{desc}\n{tag_line}".strip() if tag_line and "#" not in desc else desc
    video_file = Path(ep["videoPath"]).expanduser() if ep.get("videoPath") else None
    has_video = bool(video_file and video_file.is_file())

    shots_dir = config.projects_dir() / f"EP{ep['episode']}" / "publish_shots"
    shots_dir.mkdir(parents=True, exist_ok=True)
    shot_path = shots_dir / f"{pid}.jpg"

    filled_notes: list[str] = []

    async with cdp.CDPClient(st["ws_url"]) as client:
        tid = await client.create_tab(UPLOAD_URLS[pid], active=True)
        await client.send("Target.activateTarget", {"targetId": tid})
        await asyncio.sleep(0.8)
        sid = await client.attach(tid)

        # 等待页面离开 about:blank 并完成基础加载
        href = ""
        for _ in range(8):
            await asyncio.sleep(1.3)
            try:
                href = str(await client.evaluate(sid, "location.href") or "")
            except Exception:
                continue
            if href and href != "about:blank" and not href.startswith("chrome://"):
                break

        low = href.lower()
        if any(k in low for k in ("passport.", "/login", "accounts.google.com")):
            ts = db.now_iso()
            conn.execute(
                """INSERT INTO publish_tasks(episode_id, platform, state, detail, url, screenshot_path, metrics_json, updated_at)
                   VALUES (?,?, 'failed', '该平台尚未登录，请先在专用 Chrome 扫码登录', '', '', '{}', ?)
                   ON CONFLICT(episode_id, platform) DO UPDATE SET state='failed', detail=excluded.detail, updated_at=excluded.updated_at""",
                (episode_id, pid, ts),
            )
            conn.commit()
            return {"ok": False, "reason": "平台未登录，已在专用 Chrome 打开登录页，扫码后重试"}

        # 1. 如绑定了本地视频文件，等待上传框挂载并通过原生 CDP setFileInputFiles 自动注入
        if has_video and video_file is not None:
            uploaded = False
            for sel in ("input[type=file][accept*='video']", "input[data-testid=fileInput]", "input[type=file]"):
                if not await _wait_for_selector(client, sid, sel, timeout_s=6.0):
                    continue
                try:
                    if await client.set_file_input(sid, sel, [str(video_file)]):
                        filled_notes.append(f"已自动选片 {video_file.name}")
                        uploaded = True
                        await asyncio.sleep(3.5)
                        break
                except Exception:
                    continue
            if not uploaded:
                filled_notes.append("未找到视频上传框，请在页面手动拖入成片")
        elif pid in ("douyin", "xhs", "bilibili", "channels", "youtube"):
            filled_notes.append("未在「发布 → 打包」绑定本地 .mp4（抖音/小红书/B站需先选片才会出现标题和文案框）")

        # 2. 按平台等待输入框挂载并填写标题 / 文案（绝不点击最终发布按钮！）
        try:
            if pid == "x":
                if await _focus_and_insert(client, sid, "[data-testid=tweetTextarea_0]", full_body[:275], wait_s=14.0):
                    filled_notes.append("已自动填入 X 文案")
                else:
                    filled_notes.append("未等到 X 发帖输入框挂载")
            elif pid == "douyin":
                if has_video:
                    if await _set_input_value(client, sid, "input[placeholder*='标题'], input[placeholder*='作品标题']", title[:30], wait_s=14.0):
                        filled_notes.append("已填抖音标题")
                    if await _focus_and_insert(client, sid, ".zone-container[contenteditable=true], [contenteditable=true]", full_body[:400], wait_s=6.0):
                        filled_notes.append("已填简介与话题")
            elif pid == "xhs":
                if has_video:
                    if await _set_input_value(client, sid, "input[placeholder*='标题']", title[:20], wait_s=14.0):
                        filled_notes.append("已填小红书标题")
                    if await _focus_and_insert(client, sid, "#post-textarea, [contenteditable=true]", full_body[:600], wait_s=6.0):
                        filled_notes.append("已填正文与标签")
            elif pid == "bilibili":
                if has_video:
                    if await _set_input_value(client, sid, "input[placeholder*='标题']", title[:80], wait_s=14.0):
                        filled_notes.append("已填 B 站标题")
            elif pid == "channels":
                if has_video:
                    if await _focus_and_insert(client, sid, "[contenteditable=true]", full_body[:500], wait_s=12.0):
                        filled_notes.append("已填视频号描述")
            elif pid == "youtube":
                if has_video:
                    if await _focus_and_insert(client, sid, "#textbox", title[:100], wait_s=14.0):
                        filled_notes.append("已填 YouTube 标题")
            elif pid == "wechat":
                filled_notes.append("已打开公众号后台（准备图文/草稿发布）")
        except Exception as exc:
            filled_notes.append(f"部分字段待人工补全({str(exc)[:40]})")

        # 3. 截取提交前存档 JPEG（不关标签页，留给用户直接点最后一下「发布」）
        try:
            await client.capture_screenshot(sid, shot_path)
            filled_notes.append("已截图留档")
        except Exception:
            shot_path = Path("")

    detail = " · ".join(filled_notes) + " · 请在专用 Chrome 核对后亲自点「发布」"
    ts = db.now_iso()
    conn.execute(
        """INSERT INTO publish_tasks(episode_id, platform, state, detail, url, screenshot_path, metrics_json, updated_at)
           VALUES (?,?, 'awaiting_user', ?, '', ?, '{}', ?)
           ON CONFLICT(episode_id, platform) DO UPDATE SET
             state='awaiting_user', detail=excluded.detail, screenshot_path=excluded.screenshot_path, updated_at=excluded.updated_at""",
        (episode_id, pid, detail, str(shot_path) if shot_path else "", ts),
    )
    conn.commit()
    pname = platforms.PLATFORM_SPECS[pid]["name"]
    db.log_event(conn, f"EP{ep['episode']}", pname, "专用 Chrome 填表", detail[:60])
    return {
        "ok": True,
        "platform": pid,
        "state": "awaiting_user",
        "detail": detail,
        "screenshot": str(shot_path) if shot_path else "",
        "episode": get_episode(conn, episode_id),
    }


async def sync_platform_link(
    conn: sqlite3.Connection,
    episode_id: int,
    pid: str,
    *,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """扫描已登录创作者后台的已发布列表，按标题前缀自动取回真实发布链接与播放数。"""
    if pid not in platforms.PLATFORM_SPECS:
        raise ValueError(f"不支持的平台：{pid}")
    ep = get_episode(conn, episode_id)
    if not ep:
        raise ValueError("找不到该发布期次")

    cfg = cfg or config.load_config()
    st = cdp.chrome_status(cfg)
    if not st["online"]:
        st = cdp.ensure_chrome(cfg, foreground=False)

    title, _, _ = _copy_for_platform(ep, pid)
    needle = title[:12]

    found_url = ""
    found_metrics: dict[str, int] = {}

    async with cdp.CDPClient(st["ws_url"]) as client:
        if pid == "bilibili":
            async def scan_bili(sid: str, _tid: str) -> None:
                nonlocal found_url, found_metrics
                await asyncio.sleep(2.0)
                data = await client.evaluate(
                    sid,
                    "fetch('/x/web/archives?status=is_pubing,pubed&pn=1&ps=10',{credentials:'include'}).then(r=>r.json()).catch(()=>null)",
                )
                for it in ((data or {}).get("data") or {}).get("arc_audits") or []:
                    arc = it.get("Archive") or {}
                    if needle and needle in str(arc.get("title") or ""):
                        bvid = arc.get("bvid")
                        if bvid:
                            found_url = f"https://www.bilibili.com/video/{bvid}"
                        stat = it.get("stat") or {}
                        found_metrics = {"views": int(stat.get("view") or 0), "likes": int(stat.get("like") or 0)}
                        break

            await client.with_tab("https://member.bilibili.com/platform/home", scan_bili, wait_s=0.0)

        elif pid == "xhs":
            async def scan_xhs(sid: str, _tid: str) -> None:
                nonlocal found_url, found_metrics
                await asyncio.sleep(2.5)
                data = await client.evaluate(
                    sid,
                    "fetch('/api/galaxy/creator/note/user/posted?tab=0',{credentials:'include'}).then(r=>r.json()).catch(()=>null)",
                )
                for n in ((data or {}).get("data") or {}).get("notes") or []:
                    if needle and needle in str(n.get("display_title") or ""):
                        nid = n.get("id")
                        if nid:
                            found_url = f"https://www.xiaohongshu.com/explore/{nid}"
                        found_metrics = {"views": int(n.get("view_count") or 0), "likes": int(n.get("likes") or 0)}
                        break

            await client.with_tab("https://creator.xiaohongshu.com/statistics/fans-data", scan_xhs, wait_s=0.0)

        elif pid == "channels":
            async def scan_ch(sid: str, _tid: str) -> None:
                nonlocal found_url, found_metrics
                await asyncio.sleep(2.5)
                data = await client.evaluate(
                    sid,
                    "fetch('/cgi-bin/mmfinderassistant-bin/post/post_list',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pageSize:10,currentPage:1}),credentials:'include'}).then(r=>r.json()).catch(()=>null)",
                )
                for item in ((data or {}).get("data") or {}).get("list") or []:
                    desc_t = str((item.get("desc") or {}).get("description") or "")
                    if needle and needle in desc_t:
                        found_url = "https://channels.weixin.qq.com/platform/post/list"
                        found_metrics = {"views": int(item.get("readCount") or 0), "likes": int(item.get("likeCount") or 0)}
                        break

            await client.with_tab("https://channels.weixin.qq.com/platform/statistic/follower", scan_ch, wait_s=0.0)

        elif pid == "x":
            async def scan_x(sid: str, _tid: str) -> None:
                nonlocal found_url
                await asyncio.sleep(3.5)
                prof = await client.evaluate(sid, "(document.querySelector('a[data-testid=AppTabBar_Profile_Link]')||{}).href||''")
                if not prof:
                    return
                await client.evaluate(sid, f"(location.href={json.dumps(prof)}, 1)")
                await asyncio.sleep(4.5)
                hit = await client.evaluate(
                    sid,
                    f"""(() => {{
                      const a = [...document.querySelectorAll('article')].find(x => (x.innerText || '').includes({json.dumps(needle)}));
                      const t = a && a.querySelector('time');
                      return t && t.parentElement ? t.parentElement.href : '';
                    }})()""",
                )
                if hit:
                    found_url = str(hit)

            await client.with_tab("https://x.com/home", scan_x, wait_s=0.0)

        elif pid == "youtube":
            async def scan_yt(sid: str, _tid: str) -> None:
                nonlocal found_url
                await asyncio.sleep(4.0)
                href = str(await client.evaluate(sid, "location.href") or "")
                import re as _re

                m = _re.search(r"/channel/([^/?]+)", href)
                if not m:
                    return
                await client.evaluate(sid, f"(location.href='https://studio.youtube.com/channel/{m.group(1)}/videos/upload',1)")
                await asyncio.sleep(5.0)
                hit = await client.evaluate(
                    sid,
                    f"""(() => {{
                      const row = [...document.querySelectorAll('ytcp-video-row')].find(r => (r.innerText || '').includes({json.dumps(needle)}));
                      const a = row && row.querySelector('a[href*="/video/"]');
                      return a ? 'https://youtu.be/' + a.href.split('/video/')[1].split('/')[0] : '';
                    }})()""",
                )
                if hit:
                    found_url = str(hit)

            await client.with_tab("https://studio.youtube.com/", scan_yt, wait_s=0.0)

    pname = platforms.PLATFORM_SPECS[pid]["name"]
    if found_url:
        ts = db.now_iso()
        conn.execute(
            """INSERT INTO publish_tasks(episode_id, platform, state, detail, url, screenshot_path, metrics_json, updated_at)
               VALUES (?,?, 'published', '已从创作者后台自动取回作品链接', ?, '', ?, ?)
               ON CONFLICT(episode_id, platform) DO UPDATE SET
                 state='published', detail=excluded.detail, url=excluded.url, metrics_json=excluded.metrics_json, updated_at=excluded.updated_at""",
            (episode_id, pid, found_url, json.dumps(found_metrics, ensure_ascii=False), ts),
        )
        conn.commit()
        db.log_event(conn, f"EP{ep['episode']}", pname, "自动取链成功", found_url)
        return {"ok": True, "found": True, "url": found_url, "metrics": found_metrics, "episode": get_episode(conn, episode_id)}

    db.log_event(conn, f"EP{ep['episode']}", pname, "自动取链", f"后台暂未匹配到「{needle}」")
    return {
        "ok": True,
        "found": False,
        "reason": f"{pname}后台暂未匹配到含「{needle}」的新作品（刚点发可能有 1-3 分钟延迟，也可直接手动贴链确认）",
        "episode": get_episode(conn, episode_id),
    }


def mark_platform(
    conn: sqlite3.Connection,
    episode_id: int,
    pid: str,
    *,
    state: str,
    url: str = "",
    detail: str = "",
) -> dict[str, Any]:
    if pid not in platforms.PLATFORM_SPECS:
        raise ValueError(f"不支持的平台：{pid}")
    ep = get_episode(conn, episode_id)
    if not ep:
        raise ValueError("找不到该发布期次")
    ts = db.now_iso()
    det = detail.strip() or ("已人工确认发布" if state == "published" else "已更新状态")
    conn.execute(
        """INSERT INTO publish_tasks(episode_id, platform, state, detail, url, screenshot_path, metrics_json, updated_at)
           VALUES (?,?,?,?,?,'','{}',?)
           ON CONFLICT(episode_id, platform) DO UPDATE SET
             state=excluded.state, detail=excluded.detail,
             url=CASE WHEN excluded.url != '' THEN excluded.url ELSE url END,
             updated_at=excluded.updated_at""",
        (episode_id, pid, state, det, url.strip(), ts),
    )
    conn.commit()
    db.log_event(conn, f"EP{ep['episode']}", platforms.PLATFORM_SPECS[pid]["name"], "更新发布状态", f"{state} {url}".strip())
    return {"ok": True, "episode": get_episode(conn, episode_id)}
