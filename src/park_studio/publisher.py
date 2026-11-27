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

from . import ai, cdp, config, db, platforms, projects

UPLOAD_URLS: dict[str, str] = {
    "douyin": "https://creator.douyin.com/creator-micro/content/upload",
    "xhs": "https://creator.xiaohongshu.com/publish/publish?from=menu&target=video",
    "bilibili": "https://member.bilibili.com/platform/upload/video/frame",
    "channels": "https://channels.weixin.qq.com/platform/post/create",
    "youtube": "https://studio.youtube.com/",
    "x": "https://x.com/compose/post",
    "wechat": "https://mp.weixin.qq.com/",
    "tiktok": "https://www.tiktok.com/tiktokstudio/upload",
    "instagram": "https://www.instagram.com/",
    "threads": "https://www.threads.net/",
    "linkedin": "https://www.linkedin.com/feed/",
    "meta": "https://business.facebook.com/latest/composer",
}

DOMESTIC_MANUAL = {"douyin", "xhs", "bilibili", "channels", "tiktok", "instagram", "threads", "linkedin", "meta"}


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


def import_from_project_dir(conn: sqlite3.Connection, folder: str, *, cfg: dict[str, Any] | None = None) -> dict[str, Any]:
    """一键从标准期次文件夹（含 final/上传/）自动载入成片、3 张封面、文案.txt 并写入 publish_episodes。"""
    p = Path(folder).expanduser().resolve()
    if not p.is_dir():
        raise ValueError(f"找不到工程目录：{folder}")

    info = projects.inspect_episode_dir(p)
    copy_data = info.get("copyData") or {}
    existing_pj = info.get("publishJson") or {}
    title = copy_data.get("title") or existing_pj.get("title") or info["title"]
    nick = title[:24]
    ts = db.now_iso()

    # 若该工程目录已经导入过（按 campaign=folder_name 匹配），直接更新它；否则新建一期
    campaign = p.name[:60]
    row = conn.execute("SELECT * FROM publish_episodes WHERE campaign=?", (campaign,)).fetchone()
    if row:
        ep_id = int(row["id"])
        ep_num = int(row["episode"])
    else:
        max_ep = conn.execute("SELECT COALESCE(MAX(episode), 42) FROM publish_episodes").fetchone()[0]
        ep_num = int(max_ep) + 1
        cur = conn.execute(
            """INSERT INTO publish_episodes(episode, nick, title, campaign, schedule, video_path, cover_v_path, cover_h_path, publish_json, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                ep_num,
                nick,
                title,
                campaign,
                f"{info['date']}T19:00:00+08:00" if info.get("date") else "",
                info["videoPath"],
                info["coverVPath"],
                info["cover169Path"] or info["coverHPath"],
                "{}",
                ts,
                ts,
            ),
        )
        ep_id = int(cur.lastrowid)
        for pid in platforms.PLAT_ORDER:
            conn.execute(
                """INSERT OR IGNORE INTO publish_tasks(episode_id, platform, state, detail, url, screenshot_path, metrics_json, updated_at)
                   VALUES (?,?, 'planned', '已从工程目录自动载入素材，点「填这一家」开跑', '', '', '{}', ?)""",
                (ep_id, pid, ts),
            )
        conn.commit()

    merged_platforms = dict(existing_pj.get("platforms") or {})
    for pid, pdata in (copy_data.get("platforms") or {}).items():
        merged_platforms[pid] = {**(merged_platforms.get(pid) or {}), **pdata}

    pjson = {
        **existing_pj,
        "episode": ep_num,
        "folder": str(p),
        "title": title,
        "description": copy_data.get("description") or existing_pj.get("description") or title,
        "tags": copy_data.get("tags") or existing_pj.get("tags") or [],
        "utm_campaign": campaign,
        "video_path": info["videoPath"],
        "cover_v_path": info["coverVPath"],
        "cover_h_path": info["coverHPath"],
        "cover_169_path": info["cover169Path"],
        "copy_txt_path": info["copyPath"],
        "platforms": merged_platforms,
    }
    res = pack_episode(
        conn,
        ep_id,
        video_path=info["videoPath"],
        cover_v_path=info["coverVPath"],
        cover_h_path=info["cover169Path"] or info["coverHPath"],
        publish_json=pjson,
    )
    # 同步一份 publish.json 到工程自己的 final/上传/ 目录（如果存在且可写），让 AI 与人始终读同一份标准包
    upload_dir = p / "final" / "上传"
    if upload_dir.is_dir():
        try:
            (upload_dir / "publish.json").write_text(json.dumps(pjson, ensure_ascii=False, indent=2), encoding="utf-8")
        except OSError:
            pass
    db.log_event(conn, f"EP{ep_num}", "工程包", "自动载入标准目录", p.name[:44])
    return {**res, "project": info}


def _copy_for_platform(ep: dict[str, Any], pid: str) -> tuple[str, str, list[str]]:
    pj = ep.get("publishJson") or {}
    p_over = (pj.get("platforms") or {}).get(pid) or {}
    title = str(p_over.get("title") or pj.get("title") or ep.get("title") or "").strip()
    desc = str(p_over.get("text") or p_over.get("description") or pj.get("description") or title).strip()
    tags = [str(t).lstrip("#").strip() for t in (p_over.get("tags") or pj.get("tags") or []) if str(t).strip()]
    return title, desc, tags


PLATFORM_LOCALIZE_PROFILES: dict[str, dict[str, str]] = {
    "douyin": {"lang": "zh", "format": "video", "style": "抖音短视频：标题≤28字强钩子反差，正文简短口语带互动提问，3-5个中文话题"},
    "xhs": {"lang": "zh", "format": "video", "style": "小红书：标题≤20字带痛点/数字，正文分点易扫读+收藏引导，4-6个精准中文标签"},
    "bilibili": {"lang": "zh", "format": "video", "style": "B站：信息密度高的清晰标题≤45字，简介含核心看点与工具说明，3-5个中文标签"},
    "channels": {"lang": "zh", "format": "video", "style": "微信视频号：克制真诚的转发友好口吻，标题≤30字，正文1-3句干货总结，3-4个标签"},
    "wechat": {"lang": "zh", "format": "image_text", "style": "微信公众号图文：标题有判断力与点击欲，正文提炼为结构清晰的图文长帖"},
    "youtube": {"lang": "zh", "format": "video", "style": "YouTube（默认面向华语观众发中文视频）：高搜索性中文主标题≤45字（可夹关键英文技术词），清晰中文简介+核心看点+中英混合标签"},
    "x": {"lang": "en", "format": "text", "style": "X / Twitter (standalone English text post, DO NOT mention watching a Chinese video): sharp 1-line hook + punchy builder insight <=260 chars, 1-2 natural hashtags"},
    "tiktok": {"lang": "en", "format": "image_text", "style": "TikTok (standalone English visual/photo post): curiosity-gap short caption <=150 chars + 4-5 English hashtags"},
    "instagram": {"lang": "en", "format": "image_text", "style": "Instagram (standalone English visual card / carousel post, DO NOT upload or reference Chinese-speaking video): strong opening hook + scannable 3-bullet value caption + save CTA, 5-6 English hashtags"},
    "threads": {"lang": "en", "format": "text", "style": "Threads (standalone English conversational post, no video): candid builder hot take <=300 chars, zero corporate fluff, 0-2 tags"},
    "linkedin": {"lang": "en", "format": "text", "style": "LinkedIn (standalone English text/thought-leadership post, DO NOT mention Chinese video): sharp insight hook + 3-4 crisp bullet takeaways from the content + thoughtful question for founders/builders, 3-4 professional hashtags"},
    "meta": {"lang": "en", "format": "image_text", "style": "Meta Business Suite / Facebook & IG (standalone English visual post, no Chinese video): engaging hook + 2-3 sentence clear summary, 3-5 English hashtags"},
}


def platform_strategy_for(pid: str, cfg: dict[str, Any] | None = None) -> dict[str, str]:
    cfg = cfg or config.load_config()
    base = PLATFORM_LOCALIZE_PROFILES.get(pid, {"lang": "en", "format": "text"})
    over = ((cfg.get("platformStrategy") or {}).get(pid) or {})
    lang = str(over.get("lang") or base.get("lang") or "en").lower()
    fmt = str(over.get("format") or base.get("format") or "video").lower()
    if lang not in ("zh", "en", "bilingual"):
        lang = base.get("lang", "en")
    if fmt not in ("video", "image_text", "text"):
        fmt = base.get("format", "video")
    return {"lang": lang, "format": fmt}


def localize_episode_copy(
    conn: sqlite3.Connection,
    episode_id: int,
    *,
    target_platforms: list[str] | None = None,
    lang_overrides: dict[str, str] | None = None,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """用本机 AI 一次把原稿/逐字稿按各平台「语言（中/英/双语）× 载体（视频/图文/纯文字）」做本地化改写，写入 publish.json.platforms。"""
    from . import covers

    ep = get_episode(conn, episode_id)
    if not ep:
        raise ValueError("找不到该发布期次")
    cfg = cfg or config.load_config()
    pj = dict(ep.get("publishJson") or {})
    src_title = str(pj.get("title") or ep.get("title") or "").strip()
    src_desc = _resolve_episode_transcript(conn, ep, explicit=str(pj.get("transcript") or pj.get("description") or ""))
    src_tags = pj.get("tags") or []

    if target_platforms:
        plats = [p for p in target_platforms if p in platforms.PLAT_ORDER]
    else:
        ps = platforms.get_platform_status_map(conn)
        plats = [p for p in platforms.PLAT_ORDER if not ps.get(p, {}).get("disabled")]
    if not plats:
        raise ValueError("当前没有已启用的平台，请先在「系统」勾选至少 1 个平台")

    overrides = lang_overrides or {}
    plat_lines = []
    target_strats: dict[str, dict[str, str]] = {}
    need_en_card = False
    for pid in plats:
        prof = PLATFORM_LOCALIZE_PROFILES.get(pid, {"lang": "en", "format": "text", "style": "Natural creator style"})
        strat = platform_strategy_for(pid, cfg)
        if overrides.get(pid) in ("zh", "en", "bilingual"):
            strat["lang"] = str(overrides[pid])
        target_strats[pid] = strat
        if strat["lang"] == "en" and strat["format"] == "image_text":
            need_en_card = True
        lang_hint = (
            "English (native, idiomatic transcreation — NEVER literal translation, zero Chinese characters)"
            if strat["lang"] == "en"
            else ("中英双语（中文主干 + 英文精炼摘要/关键词）" if strat["lang"] == "bilingual" else "简体中文（地道创作者口吻，自然不生硬）")
        )
        fmt_hint = (
            "配视频发布的标题与简介"
            if strat["format"] == "video"
            else ("独立图文帖（不传中文视频，请把核心干货提炼为可独立阅读的图文帖，并额外输出英文卡片标题 card_headline 和 3 条要点 card_bullets）" if strat["format"] == "image_text" else "独立纯文字帖（不传视频，把核心观点写成能独立传播的文字帖，绝不写“看上面视频”）")
        )
        plat_lines.append(f'- "{pid}": 语言={lang_hint}；载体={fmt_hint}；风格={prof["style"]}')

    prompt = (
        "你是一位精通中英文跨平台内容分发的资深创作者与本地化编辑。\n"
        f"原始标题：{src_title}\n"
        f"原始逐字稿 / 正文内容：\n{src_desc[:3600]}\n"
        f"原始标签：{', '.join(str(t) for t in src_tags[:10]) or '无'}\n\n"
        "请为下面每个目标平台生成专属版本（英文纯文字/图文平台必须写成可独立阅读的地道英文内容，绝不提及中文口播视频）：\n"
        + "\n".join(plat_lines)
        + "\n\n严格只返回一个 JSON 对象，key 为上面列出的平台 ID，每个 value 格式为：\n"
        '{"lang":"en|zh|bilingual","format":"video|image_text|text","title":"平台标题","description":"平台正文/简介","tags":["不带#号的标签1","标签2"],"card_headline":"(仅图文平台需要，简短卡片大字)","card_bullets":["(仅图文平台需要，要点1)","要点2","要点3"]}'
    )
    res = ai.run_prompt(prompt, cfg=cfg, timeout=120)
    parsed = ai.extract_json_block(res["text"])
    if not isinstance(parsed, dict):
        raise ai.AIError("AI 返回的跨平台适配结果无法解析为 JSON，请重试")

    plat_map = dict(pj.get("platforms") or {})
    localized_count = 0
    card_seed: tuple[str, list[str]] | None = None
    for pid in plats:
        item = parsed.get(pid)
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        desc = str(item.get("description") or item.get("text") or "").strip()
        raw_tags = item.get("tags") or []
        if isinstance(raw_tags, str):
            raw_tags = [x.strip() for x in raw_tags.replace("，", ",").split(",") if x.strip()]
        tags = [str(t).lstrip("#").strip() for t in raw_tags if str(t).strip()][:8]
        strat = target_strats[pid]
        if title or desc:
            eff_lang = str(item.get("lang") or strat["lang"]).lower()
            fallback_title = (desc.splitlines()[0][:84] if eff_lang == "en" and desc else src_title)
            c_head = str(item.get("card_headline") or "").strip()
            c_bul = [str(x).strip() for x in (item.get("card_bullets") or []) if str(x).strip()][:3]
            if eff_lang == "en" and strat["format"] == "image_text" and not card_seed:
                card_seed = (c_head or title or fallback_title, c_bul)
            plat_map[pid] = {
                **(plat_map.get(pid) or {}),
                "lang": eff_lang,
                "format": strat["format"],
                "title": title or fallback_title,
                "description": desc or title or src_desc,
                "tags": tags,
                **({"card_headline": c_head, "card_bullets": c_bul} if (c_head or c_bul) else {}),
            }
            localized_count += 1

    if localized_count == 0:
        raise ai.AIError("未能解析出任何平台的适配文案，请重试")

    # 若启用了英文图文平台（如 IG / Meta），顺手自动生成 1 张纯英文杂志图文卡片 PNG（绝不传中文口播视频）
    en_card_path = str(pj.get("en_card_path") or "")
    if need_en_card and card_seed:
        try:
            _ep_dir, up_dir = covers._target_upload_dir(ep, cfg)
            made = covers.generate_english_visual_card(up_dir, headline=card_seed[0], bullets=card_seed[1])
            if made:
                en_card_path = made
                pj["en_card_path"] = en_card_path
        except Exception:
            pass

    pj["platforms"] = plat_map
    packed = pack_episode(conn, episode_id, publish_json=pj)
    db.log_event(conn, f"EP{ep['episode']}", f"{res['backend']}/{res['model']}", "AI 分平台本地化适配", f"已生成 {localized_count} 个平台文案")
    return {
        "ok": True,
        "localized": localized_count,
        "platforms": plat_map,
        "enCardPath": en_card_path,
        "episode": packed["episode"],
        "path": packed["path"],
        "backend": res["backend"],
        "model": res["model"],
    }


TITLE_MOTIVES = ["反差感", "真实冲突", "硬数字", "场景后果", "悬念缺口", "硬结果"]


def _resolve_episode_transcript(conn: sqlite3.Connection, ep: dict[str, Any], explicit: str = "") -> str:
    if (explicit or "").strip():
        return explicit.strip()[:5000]
    pj = ep.get("publishJson") or {}
    for k in ("transcript", "description"):
        val = str(pj.get(k) or "").strip()
        if len(val) >= 30:
            return val[:5000]
    # 兜底：尝试从关联的剪辑工程逐字稿或同标题选题正文读取
    cut = conn.execute("SELECT lines_json FROM cut_projects WHERE episode=? OR title=? ORDER BY id DESC LIMIT 1", (ep.get("episode"), ep.get("title"))).fetchone()
    if cut and cut["lines_json"]:
        try:
            lines = json.loads(cut["lines_json"])
            txt = "\n".join(str(x.get("text") or "") for x in lines if isinstance(x, dict))
            if len(txt.strip()) >= 20:
                return txt.strip()[:5000]
        except Exception:
            pass
    topic = conn.execute("SELECT body FROM topics WHERE title=? ORDER BY id DESC LIMIT 1", (ep.get("title"),)).fetchone()
    if topic and str(topic["body"] or "").strip():
        return str(topic["body"]).strip()[:5000]
    return str(pj.get("description") or ep.get("title") or "").strip()


def generate_title_candidates(
    conn: sqlite3.Connection,
    episode_id: int,
    *,
    transcript: str = "",
    angle: str = "",
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """按 Topic Studio dbs-title-cover-intro 方法论生成 6 个不同动机的备选标题 + 点击理由 + 封面大字 + 简介/话题。"""
    ep = get_episode(conn, episode_id)
    if not ep:
        raise ValueError("找不到该发布期次")
    cfg = cfg or config.load_config()
    pj = dict(ep.get("publishJson") or {})
    src_title = str(pj.get("title") or ep.get("title") or "").strip()
    body_txt = _resolve_episode_transcript(conn, ep, explicit=transcript)

    prompt = (
        "你是顶级短视频标题与封面策划专家（遵循 dbs-title-cover-intro 原则：标题是广告，用目标观众日常大白话，绝不用「震惊/颠覆/必看/真相/秘密」等空洞词，所有数字与事实必须忠于原文绝不编造）。\n"
        f"当前主题：{src_title}\n"
        f"{f'创作者期望切入角度：{angle}' if angle else ''}\n"
        f"口播逐字稿 / 稿件内容：\n{body_txt or '（仅提供主题，请直接围绕主题构思）'}\n\n"
        f"请输出 **6 个彼此角度完全不同的备选标题**，动机依次覆盖：{', '.join(TITLE_MOTIVES)}。\n"
        "严格只返回一个 JSON 对象，格式如下：\n"
        "{\n"
        '  "candidates": [\n'
        '    {"motive": "反差感", "title": "<=26字高点击大白话标题", "reason": "<=24字大白话解释观众为什么会点", "cover_text": "<=14字适合放封面中央的极简视觉大字"}\n'
        "  ],\n"
        '  "description": "100-180字口语化通用视频简介",\n'
        '  "tags": ["不带#号的话题1", "话题2", "话题3", "话题4", "话题5"]\n'
        "}"
    )
    res = ai.run_prompt(prompt, cfg=cfg, timeout=120)
    parsed = ai.extract_json_block(res["text"])
    if not isinstance(parsed, dict) or not isinstance(parsed.get("candidates"), list):
        raise ai.AIError("AI 返回的 6 备选标题格式无法解析为 JSON，请重试")

    candidates: list[dict[str, str]] = []
    for idx, item in enumerate(parsed["candidates"][:6]):
        if not isinstance(item, dict):
            continue
        t = str(item.get("title") or "").strip()
        if not t:
            continue
        motive = str(item.get("motive") or TITLE_MOTIVES[idx % len(TITLE_MOTIVES)]).strip()
        reason = str(item.get("reason") or "").strip()
        cover_text = str(item.get("cover_text") or t[:14]).strip()
        candidates.append({"motive": motive, "title": t, "reason": reason, "cover_text": cover_text})
    if not candidates:
        raise ai.AIError("未生成有效备选标题，请重试")

    desc = str(parsed.get("description") or "").strip()
    tags = [str(x).lstrip("#").strip() for x in (parsed.get("tags") or []) if str(x).strip()][:8]
    pj["title_candidates"] = candidates
    if desc and (not pj.get("description") or pj.get("description") == src_title):
        pj["description"] = desc
    if tags and not pj.get("tags"):
        pj["tags"] = tags
    if body_txt and not pj.get("transcript"):
        pj["transcript"] = body_txt
    packed = pack_episode(conn, episode_id, publish_json=pj)
    db.log_event(conn, f"EP{ep['episode']}", f"{res['backend']}/{res['model']}", "生成 6 动机备选标题", f"共 {len(candidates)} 个候选")
    return {
        "ok": True,
        "candidates": candidates,
        "description": desc,
        "tags": tags,
        "episode": packed["episode"],
        "backend": res["backend"],
        "model": res["model"],
    }


def pick_title_candidate(
    conn: sqlite3.Connection,
    episode_id: int,
    *,
    index: int | None = None,
    title: str = "",
    cover_text: str = "",
) -> dict[str, Any]:
    """选定某条备选标题（同步更新发布期次主标题、简称与封面大字）。"""
    ep = get_episode(conn, episode_id)
    if not ep:
        raise ValueError("找不到该发布期次")
    pj = dict(ep.get("publishJson") or {})
    cands = pj.get("title_candidates") or []
    picked_title = title.strip()
    picked_cover = cover_text.strip()
    if index is not None and 0 <= index < len(cands):
        c = cands[index]
        picked_title = picked_title or str(c.get("title") or "").strip()
        picked_cover = picked_cover or str(c.get("cover_text") or picked_title[:14]).strip()
        pj["picked_title_idx"] = index
    if not picked_title:
        raise ValueError("标题不能为空")

    pj["title"] = picked_title
    pj["cover_headline"] = picked_cover or picked_title[:14]
    conn.execute(
        "UPDATE publish_episodes SET title=?, nick=?, updated_at=? WHERE id=?",
        (picked_title, picked_title[:24], db.now_iso(), episode_id),
    )
    conn.commit()
    packed = pack_episode(conn, episode_id, publish_json=pj)
    db.log_event(conn, f"EP{ep['episode']}", "选标题", "采用备选标题", picked_title[:36])
    return {"ok": True, "title": picked_title, "coverHeadline": pj["cover_headline"], "episode": packed["episode"]}


_DEEP_QUERY_FN = """
function __psQueryAllDeep(root, sel, out) {
  if (!root) return out;
  try {
    for (const el of root.querySelectorAll(sel)) out.push(el);
  } catch (e) {}
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) __psQueryAllDeep(el.shadowRoot, sel, out);
  }
  return out;
}
function __psQueryDeep(sel, nth = 0) {
  const list = __psQueryAllDeep(document, sel, []);
  return list[nth] || null;
}
"""


def _is_login_url(href: str) -> bool:
    low = (href or "").lower()
    return any(k in low for k in ("passport.", "/login", "login.html", "accounts.google.com"))


async def _wait_for_selector(client: cdp.CDPClient, sid: str, selector: str, *, nth: int = 0, timeout_s: float = 12.0) -> bool:
    """轮询等待 SPA 页面的目标输入元素真正挂载到 DOM（支持递归穿透 Shadow DOM）。"""
    import time

    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        try:
            ok = await client.evaluate(sid, f"(() => {{ {_DEEP_QUERY_FN} return !!__psQueryDeep({json.dumps(selector)}, {nth}); }})()")
            if ok:
                return True
        except Exception:
            pass
        await asyncio.sleep(0.6)
    return False


async def _click_selector(client: cdp.CDPClient, sid: str, selector: str, *, nth: int = 0, wait_s: float = 10.0) -> bool:
    if not await _wait_for_selector(client, sid, selector, nth=nth, timeout_s=wait_s):
        return False
    return bool(
        await client.evaluate(
            sid,
            f"(() => {{ {_DEEP_QUERY_FN} const el = __psQueryDeep({json.dumps(selector)}, {nth}); if (!el) return false; el.click(); return true; }})()",
        )
    )


async def _set_input_value(client: cdp.CDPClient, sid: str, selector: str, value: str, *, nth: int = 0, wait_s: float = 10.0) -> bool:
    if not await _wait_for_selector(client, sid, selector, nth=nth, timeout_s=wait_s):
        return False
    js = f"""(() => {{
      {_DEEP_QUERY_FN}
      const el = __psQueryDeep({json.dumps(selector)}, {nth});
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


async def _focus_and_insert(
    client: cdp.CDPClient,
    sid: str,
    selector: str,
    text: str,
    *,
    nth: int = 0,
    clear_first: bool = False,
    wait_s: float = 12.0,
) -> bool:
    """等待元素挂载 → 用原生 CDP 鼠标点击真实聚焦（兼容 X DraftJS / YouTube Polymer / 视频号 wujie）→ Input.insertText 写入。"""
    if not await _wait_for_selector(client, sid, selector, nth=nth, timeout_s=wait_s):
        return False
    rect = await client.evaluate(
        sid,
        f"""(() => {{
          {_DEEP_QUERY_FN}
          const el = __psQueryDeep({json.dumps(selector)}, {nth});
          if (!el) return null;
          el.scrollIntoView({{ block: 'center' }});
          el.focus();
          const r = el.getBoundingClientRect();
          return {{ x: r.left + Math.min(24, Math.max(4, r.width / 2)), y: r.top + Math.min(18, Math.max(4, r.height / 2)) }};
        }})()""",
    )
    if not isinstance(rect, dict):
        return False
    active_sid = client._session_aliases.get(sid, sid)
    x, y = float(rect["x"]), float(rect["y"])
    await client.send("Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y, "button": "left", "clickCount": 1}, session_id=active_sid)
    await client.send("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y, "button": "left", "clickCount": 1}, session_id=active_sid)
    await asyncio.sleep(0.25)
    if clear_first:
        await client.clear_focused_text(sid)
        await asyncio.sleep(0.15)
    await client.insert_text(sid, text)
    return True


async def fill_platform(
    conn: sqlite3.Connection,
    episode_id: int,
    pid: str,
    *,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """在专用 Chrome (:9333) 打开对应平台创作页、上传成片（若有）、填好标题/正文/标签/封面并截图留档。

    所有平台均严格「只填不点发布」，保留标签页打开供创作者亲自核对后点最后一下发布！
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
    # 抖音标题和简介是上下两个紧邻框，若简介与标题相同则只填话题避免重复
    douyin_body = tag_line if (desc == title and tag_line) else full_body
    video_file = Path(ep["videoPath"]).expanduser() if ep.get("videoPath") else None
    has_video = bool(video_file and video_file.is_file())
    cover_h_file = Path(ep["coverHPath"]).expanduser() if ep.get("coverHPath") else None
    has_cover_h = bool(cover_h_file and cover_h_file.is_file())

    shots_dir = config.projects_dir() / f"EP{ep['episode']}" / "publish_shots"
    shots_dir.mkdir(parents=True, exist_ok=True)
    shot_path = shots_dir / f"{pid}.jpg"

    filled_notes: list[str] = []

    def _fail_login(msg: str) -> dict[str, Any]:
        ts_now = db.now_iso()
        conn.execute(
            """INSERT INTO publish_tasks(episode_id, platform, state, detail, url, screenshot_path, metrics_json, updated_at)
               VALUES (?,?, 'failed', ?, '', '', '{}', ?)
               ON CONFLICT(episode_id, platform) DO UPDATE SET state='failed', detail=excluded.detail, updated_at=excluded.updated_at""",
            (episode_id, pid, msg, ts_now),
        )
        conn.commit()
        return {"ok": False, "platform": pid, "state": "failed", "reason": msg}

    async with cdp.CDPClient(st["ws_url"]) as client:
        tid = await client.create_tab(UPLOAD_URLS[pid], active=True)
        await client.send("Target.activateTarget", {"targetId": tid})
        await asyncio.sleep(0.8)
        sid = await client.attach(tid)

        # 等待页面离开 about:blank 并稳定下来（吸收 B站/视频号 的 JS 延迟登录跳转）
        href = ""
        for _ in range(10):
            await asyncio.sleep(1.2)
            try:
                href = str(await client.evaluate(sid, "location.href") or "")
            except Exception:
                continue
            if href and href != "about:blank" and not href.startswith("chrome://"):
                await asyncio.sleep(1.5)
                try:
                    href = str(await client.evaluate(sid, "location.href") or href)
                except Exception:
                    pass
                break

        if not href or href == "about:blank":
            return _fail_login(f"{platforms.PLATFORM_SPECS[pid]['name']} 页面加载超时（请检查网络/代理后重试）")

        if _is_login_url(href):
            return _fail_login("该平台登录已过期，已在专用 Chrome 打开登录页，扫码后重试")

        # YouTube Studio 需要先点顶部 ↑ 上传按钮才会弹出文件上传框
        if pid == "youtube" and has_video:
            if await _click_selector(client, sid, "#upload-icon, ytcp-icon-button#upload-icon", wait_s=10.0):
                await asyncio.sleep(2.0)

        # 抖音：若顶部弹出「你还有上次未发布的视频，是否继续编辑？[继续编辑][放弃]」，先点「放弃」腾出干净上传区
        if pid == "douyin":
            dismissed_draft = await client.evaluate(
                sid,
                """(() => {
                  const body = (document.body && document.body.innerText) || '';
                  if (!body.includes('未发布的视频')) return false;
                  for (const el of document.querySelectorAll('button, a, span, div')) {
                    if ((el.innerText || '').trim() === '放弃') { el.click(); return true; }
                  }
                  return false;
                })()""",
            )
            if dismissed_draft:
                await asyncio.sleep(1.5)
                filled_notes.append("已自动清理上次未发布草稿提示")

        # LinkedIn / Instagram / Threads 需要先点「新建帖子」按钮才会弹出编辑器
        if pid == "linkedin":
            await _click_selector(client, sid, "button.share-box-feed-entry__trigger, button[aria-label*='Start a post'], button[aria-label*='开始发帖']", wait_s=8.0)
            await asyncio.sleep(1.5)
        elif pid == "instagram":
            await _click_selector(client, sid, "svg[aria-label='New post'], svg[aria-label='新帖子'], a[href='#'] svg[aria-label*='Create']", wait_s=8.0)
            await asyncio.sleep(1.5)
        elif pid == "threads":
            await _click_selector(client, sid, "svg[aria-label='Create'], div[role=button][aria-label*='Create'], div[role=button][aria-label*='发帖']", wait_s=8.0)
            await asyncio.sleep(1.5)

        # 公众号：若已登录首页（URL 带 token），直接跳到新建图文草稿编辑器
        if pid == "wechat":
            import re

            m_tok = re.search(r"[?&]token=(\d+)", href)
            if m_tok:
                edit_url = (
                    f"https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2"
                    f"&action=edit&isNew=1&type=77&createType=0&token={m_tok.group(1)}&lang=zh_CN"
                )
                await client.send("Page.navigate", {"url": edit_url}, session_id=client._session_aliases.get(sid, sid))
                await asyncio.sleep(4.5)
            else:
                return _fail_login("公众号尚未登录（未检测到 token），请扫码后重试")

        # 1. 按当前平台的载体策略（video / image_text / text）决定上传视频、上传英文图文卡，还是纯文字发帖（绝不把中文口播视频错传给英文图文/文字平台！）
        strat = platform_strategy_for(pid, cfg)
        fmt = strat["format"]
        pj_cur = ep.get("publishJson") or {}
        en_card_raw = str(pj_cur.get("en_card_path") or "").strip()
        en_card_file = Path(en_card_raw).expanduser() if en_card_raw else None
        has_en_card = bool(en_card_file and en_card_file.is_file())

        media_to_upload: Path | None = None
        media_kind = "none"
        if fmt == "video" and has_video and video_file is not None and pid != "wechat":
            media_to_upload = video_file
            media_kind = "video"
        elif fmt == "image_text" and pid != "wechat":
            if strat["lang"] == "en" and has_en_card and en_card_file is not None:
                media_to_upload = en_card_file
                media_kind = "image"
            elif has_cover_v and cover_v_file is not None:
                media_to_upload = cover_v_file
                media_kind = "image"
            elif has_cover_h and cover_h_file is not None:
                media_to_upload = cover_h_file
                media_kind = "image"

        video_required_plats = {pid} if (fmt == "video" and pid != "wechat") else set()
        image_required_plats = {pid} if (fmt == "image_text" and pid in ("instagram", "meta", "tiktok")) else set()
        uploaded_ok = False
        text_filled_ok = False
        if fmt == "text":
            filled_notes.append(f"纯文字模式（{strat['lang'].upper()} · 不传视频）")
        elif media_to_upload is not None:
            sels = ("input[type=file]",) if pid in ("youtube", "tiktok", "instagram", "meta", "linkedin") else (
                "input.upload-input",
                "input[type=file][accept*='video']",
                "input[type=file][accept*='.mp4']",
                "input[data-testid=fileInput]",
                "input[type=file]",
            )
            for sel in sels:
                if not await _wait_for_selector(client, sid, sel, timeout_s=6.0):
                    try:
                        cur_href = str(await client.evaluate(sid, "location.href") or "")
                        if _is_login_url(cur_href):
                            return _fail_login("该平台登录已过期，已在专用 Chrome 打开登录页，扫码后重试")
                    except Exception:
                        pass
                    continue
                try:
                    if await client.set_file_input(sid, sel, [str(media_to_upload)]):
                        tag_lbl = "已自动传英文图文卡" if media_kind == "image" else "已自动选片"
                        filled_notes.append(f"{tag_lbl} {media_to_upload.name}")
                        uploaded_ok = True
                        await asyncio.sleep(5.0 if pid in ("youtube", "tiktok", "meta") else 3.5)
                        break
                except Exception:
                    continue
            if not uploaded_ok:
                filled_notes.append("未找到媒体上传框或上传未生效")
        elif pid in video_required_plats:
            filled_notes.append("未在「发布 → 打包」绑定本地 .mp4（视频平台需先选片才会出现标题和文案框）")

        # 2. 按平台等待输入框挂载并填写标题 / 文案 / 封面（绝不点击最终发布按钮！）
        try:
            if pid == "x":
                if await _focus_and_insert(client, sid, "[data-testid=tweetTextarea_0]", full_body[:275], wait_s=14.0):
                    filled_notes.append("已自动填入 X 文案")
                    text_filled_ok = True
                else:
                    filled_notes.append("未等到 X 发帖输入框挂载")
            elif pid == "douyin":
                if uploaded_ok:
                    if await _set_input_value(client, sid, "input[placeholder*='标题'], input[placeholder*='作品标题']", title[:30], wait_s=14.0):
                        filled_notes.append("已填抖音标题")
                        text_filled_ok = True
                    if douyin_body and await _focus_and_insert(client, sid, ".zone-container[contenteditable=true], [contenteditable=true]", douyin_body[:400], wait_s=6.0):
                        filled_notes.append("已填简介与话题")
                        text_filled_ok = True
            elif pid == "xhs":
                if uploaded_ok:
                    if await _set_input_value(client, sid, "input[placeholder*='标题']", title[:20], wait_s=14.0):
                        filled_notes.append("已填小红书标题")
                        text_filled_ok = True
                    if await _focus_and_insert(client, sid, ".tiptap.ProseMirror, .ProseMirror, #post-textarea, [contenteditable=true]", full_body[:600], wait_s=6.0):
                        filled_notes.append("已填正文与标签")
                        text_filled_ok = True
            elif pid == "bilibili":
                if uploaded_ok:
                    if await _set_input_value(client, sid, "input[placeholder*='标题']", title[:80], wait_s=14.0):
                        filled_notes.append("已填 B 站标题")
                        text_filled_ok = True
                    # 关闭 B 站首次弹出的「开启通知 → 知道了」引导弹窗
                    await client.evaluate(
                        sid,
                        """(() => {
                          for (const btn of document.querySelectorAll('button, .bcc-button, [role=button]')) {
                            const tx = (btn.innerText || '').trim();
                            if (tx === '知道了' || tx === '我知道了') { btn.click(); break; }
                          }
                        })()""",
                    )
                    await asyncio.sleep(0.3)
            elif pid == "channels":
                if uploaded_ok:
                    if await _focus_and_insert(client, sid, "[contenteditable=true]", full_body[:500], wait_s=12.0):
                        filled_notes.append("已填视频号描述")
                        text_filled_ok = True
            elif pid == "youtube":
                if uploaded_ok:
                    if await _focus_and_insert(client, sid, "#textbox", title[:100], nth=0, clear_first=True, wait_s=14.0):
                        filled_notes.append("已填 YouTube 标题")
                        text_filled_ok = True
                    if full_body and await _focus_and_insert(client, sid, "#textbox", full_body[:4500], nth=1, wait_s=6.0):
                        filled_notes.append("已填 YouTube 简介与标签")
                        text_filled_ok = True
                    if has_cover_h and cover_h_file is not None and await _wait_for_selector(client, sid, "input#file-loader", timeout_s=5.0):
                        if await client.set_file_input(sid, "input#file-loader", [str(cover_h_file)]):
                            filled_notes.append(f"已上传 16:9 封面 {cover_h_file.name}")
                            await asyncio.sleep(1.5)
            elif pid == "tiktok":
                if uploaded_ok:
                    if await _focus_and_insert(client, sid, ".public-DraftEditor-content, [contenteditable=true]", full_body[:2000], wait_s=14.0):
                        filled_notes.append("已填 TikTok 文案与话题")
                        text_filled_ok = True
            elif pid in ("instagram", "meta"):
                if uploaded_ok:
                    if await _focus_and_insert(client, sid, "div[role=textbox][contenteditable=true], textarea[aria-label*='caption'], [contenteditable=true]", full_body[:2000], wait_s=12.0):
                        filled_notes.append(f"已填 {platforms.PLATFORM_SPECS[pid]['name']} 文案")
                        text_filled_ok = True
            elif pid == "threads":
                if await _focus_and_insert(client, sid, "div[role=textbox][contenteditable=true], [contenteditable=true]", full_body[:480], wait_s=12.0):
                    filled_notes.append("已填 Threads 文案")
                    text_filled_ok = True
            elif pid == "linkedin":
                if await _focus_and_insert(client, sid, ".ql-editor, div[role=textbox][contenteditable=true]", full_body[:2800], wait_s=12.0):
                    filled_notes.append("已填 LinkedIn 正文")
                    text_filled_ok = True
            elif pid == "wechat":
                # 先关掉公众号编辑器首次弹出的功能引导弹窗（「我知道了」）
                await client.evaluate(
                    sid,
                    """(() => {
                      for (const btn of document.querySelectorAll('button, .weui-desktop-btn')) {
                        if ((btn.innerText || '').trim() === '我知道了') { btn.click(); break; }
                      }
                    })()""",
                )
                await asyncio.sleep(0.5)
                if await _set_input_value(client, sid, "#title, textarea[placeholder*='标题'], input[placeholder*='标题']", title[:64], wait_s=12.0):
                    filled_notes.append("已填公众号标题")
                    text_filled_ok = True
                if await _focus_and_insert(client, sid, ".ProseMirror, [contenteditable=true]", full_body[:4000], wait_s=8.0):
                    filled_notes.append("已填公众号正文草稿")
                    text_filled_ok = True
        except Exception as exc:
            filled_notes.append(f"部分字段待人工补全({str(exc)[:40]})")

        # 3. 截取提交前存档 JPEG（不关标签页，留给用户直接核对或重试）
        try:
            await client.capture_screenshot(sid, shot_path)
            filled_notes.append("已截图留档")
        except Exception:
            shot_path = None

    # 4. 严格验证门禁：绝不报「假成功」——视频模式须传视频+填文本，图文模式须传图+填文本，纯文字模式须填入正文！
    verified = False
    if pid in video_required_plats or pid in image_required_plats:
        verified = bool(uploaded_ok and text_filled_ok)
    else:
        verified = bool(text_filled_ok)

    ts = db.now_iso()
    pname = platforms.PLATFORM_SPECS[pid]["name"]
    if verified:
        final_state = "awaiting_user"
        detail = " · ".join(filled_notes) + " · 请在专用 Chrome 核对后亲自点「发布」"
    else:
        final_state = "failed"
        miss_why = (
            "视频未成功上传"
            if (pid in video_required_plats and not uploaded_ok)
            else ("英文图文卡未成功上传" if (pid in image_required_plats and not uploaded_ok) else "未检测到标题/文案输入框或写入失败")
        )
        detail = f"填表未通过校验（{miss_why}）：" + " · ".join(filled_notes)

    conn.execute(
        """INSERT INTO publish_tasks(episode_id, platform, state, detail, url, screenshot_path, metrics_json, updated_at)
           VALUES (?,?, ?, ?, '', ?, '{}', ?)
           ON CONFLICT(episode_id, platform) DO UPDATE SET
             state=excluded.state, detail=excluded.detail, screenshot_path=excluded.screenshot_path, updated_at=excluded.updated_at""",
        (episode_id, pid, final_state, detail, str(shot_path) if shot_path else "", ts),
    )
    conn.commit()
    db.log_event(conn, f"EP{ep['episode']}", pname, "专用 Chrome 填表" if verified else "填表校验失败", detail[:60])
    return {
        "ok": verified,
        "platform": pid,
        "state": final_state,
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
