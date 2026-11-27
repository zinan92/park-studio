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


def _fnum(v: Any) -> float | None:
    if v in (None, "", "-", "—"):
        return None
    try:
        return float(str(v).strip())
    except (TypeError, ValueError):
        return None


def _inum(v: Any) -> int | None:
    f = _fnum(v)
    return int(round(f)) if f is not None else None


def parse_douyin_work_list(payload: str | dict[str, Any]) -> tuple[list[dict[str, Any]], bool, str]:
    """解析抖音创作者后台 work_list（同时合并 aweme_list 基础数据与 items[].metrics 留存/完播/涨粉/封面点击率）。

    传原始 JSON 字符串时由 Python json.loads 无损解析 64 位 item.id，避免 JS Number 精度丢失。
    """
    if isinstance(payload, str):
        try:
            data = json.loads(payload)
        except ValueError:
            return [], False, "0"
    else:
        data = payload or {}
    if not isinstance(data, dict):
        return [], False, "0"

    raw_items = data.get("items") or []
    metrics_by_id: dict[str, dict[str, Any]] = {}
    metrics_by_ts: dict[int, dict[str, Any]] = {}
    for it in raw_items:
        if not isinstance(it, dict):
            continue
        m = it.get("metrics") or {}
        if not isinstance(m, dict) or not m:
            continue
        iid = str(it.get("id") or it.get("aweme_id") or "").strip()
        if iid:
            metrics_by_id[iid] = m
        cts = _inum(it.get("create_time")) or 0
        if cts:
            metrics_by_ts[cts] = m

    out: list[dict[str, Any]] = []
    aweme_list = data.get("aweme_list") or []
    for idx, a in enumerate(aweme_list):
        if not isinstance(a, dict):
            continue
        wid = str(a.get("aweme_id") or "").strip()
        if not wid:
            continue
        st = a.get("statistics") or {}
        ts = int(a.get("create_time") or 0)
        dur_ms = int((a.get("video") or {}).get("duration") or a.get("duration") or 0)
        dur_s = dur_ms // 1000 if dur_ms > 2000 else dur_ms

        # 精准匹配 items[].metrics：1) exact id -> 2) create_time -> 3) 同长度同下标兜底
        m = metrics_by_id.get(wid) or (metrics_by_ts.get(ts) if ts else None)
        if m is None and idx < len(raw_items) and isinstance(raw_items[idx], dict):
            cand = raw_items[idx].get("metrics")
            if isinstance(cand, dict) and cand:
                m = cand
        m = m or {}

        raw_extra: dict[str, Any] = {"desc": a.get("desc") or ""}
        bounce_2s = _fnum(m.get("bounce_rate_2s"))
        comp_5s = _fnum(m.get("completion_rate_5s"))
        comp = _fnum(m.get("completion_rate"))
        avg_s = _fnum(m.get("avg_view_second"))
        avg_prop = _fnum(m.get("avg_view_proportion"))
        cover_ctr = _fnum(m.get("cover_click_rate"))
        cover_show = _inum(m.get("cover_show"))
        sub_cnt = _inum(m.get("subscribe_count"))
        unsub_cnt = _inum(m.get("unsubscribe_count"))
        home_visits = _inum(m.get("homepage_visit_count"))
        fan_view_prop = _fnum(m.get("fan_view_proportion"))

        if bounce_2s is not None:
            raw_extra["bounce_2s"] = round(bounce_2s, 4)
            raw_extra["retention_2s"] = round(max(0.0, 1.0 - bounce_2s), 4)
        if comp_5s is not None:
            raw_extra["completion_5s"] = round(comp_5s, 4)
        if comp is not None:
            raw_extra["completion"] = round(comp, 4)
        if avg_s is not None:
            raw_extra["avg_view_s"] = round(avg_s, 1)
        if avg_prop is not None:
            raw_extra["avg_view_pct"] = round(avg_prop, 4)
        if cover_ctr is not None:
            raw_extra["cover_ctr"] = round(cover_ctr, 4)
        if cover_show is not None:
            raw_extra["cover_show"] = cover_show
        if sub_cnt is not None:
            raw_extra["fans_gained"] = sub_cnt
        if unsub_cnt is not None:
            raw_extra["fans_lost"] = unsub_cnt
        if sub_cnt is not None:
            raw_extra["net_fans"] = sub_cnt - (unsub_cnt or 0)
        if home_visits is not None:
            raw_extra["home_visits"] = home_visits
        if fan_view_prop is not None:
            raw_extra["fan_view_pct"] = round(fan_view_prop, 4)

        views = _inum(m.get("view_count"))
        if views is None:
            views = int(st.get("play_count") or 0)

        out.append({
            "platform": "douyin",
            "work_id": wid,
            "title": _clean_title(a.get("desc") or a.get("item_title") or ""),
            "url": f"https://www.douyin.com/video/{wid}",
            "published_at": _ts_to_day(ts),
            "published_ts": ts,
            "duration_sec": max(0, int(dur_s)),
            "views": max(0, int(views)),
            "likes": int(st.get("digg_count") or _inum(m.get("like_count")) or 0),
            "comments": int(st.get("comment_count") or _inum(m.get("comment_count")) or 0),
            "favorites": int(st.get("collect_count") or _inum(m.get("favorite_count")) or 0),
            "shares": int(st.get("share_count") or _inum(m.get("share_count")) or 0),
            "raw": raw_extra,
        })

    has_more = bool(data.get("has_more"))
    next_cursor = str(data.get("max_cursor") or "0")
    return out, has_more, next_cursor


async def _collect_douyin(client: cdp.CDPClient) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen: set[str] = set()

    async def fn(sid: str, _tid: str) -> None:
        if not await _wait_origin(client, sid, "douyin.com", timeout_s=10.0):
            return
        await asyncio.sleep(1.5)
        cursor = "0"
        for _ in range(3):
            raw_text = await client.evaluate(
                sid,
                f"""(async () => {{
                  const r = await fetch('/janus/douyin/creator/pc/work_list?status=0&count=30&max_cursor={cursor}&scene=star_atlas&device_platform=android&aid=1128&support_h265=1', {{credentials:'include'}});
                  return await r.text();
                }})()""",
            )
            if not isinstance(raw_text, str) or not raw_text.strip().startswith("{"):
                break
            batch, has_more, next_cursor = parse_douyin_work_list(raw_text)
            for row in batch:
                if row["work_id"] in seen:
                    continue
                seen.add(row["work_id"])
                items.append(row)
            if not has_more or not next_cursor or next_cursor == cursor:
                break
            cursor = next_cursor
            await asyncio.sleep(0.8)

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


async def _collect_global_dom_generic(
    client: cdp.CDPClient,
    *,
    platform: str,
    url: str,
    host_substr: str,
    link_selector: str,
) -> list[dict[str, Any]]:
    """通用海外平台（Instagram / Threads / LinkedIn / Meta / TikTok）已发作品 DOM 采集器。"""
    items: list[dict[str, Any]] = []

    async def fn(sid: str, _tid: str) -> None:
        if not await _wait_origin(client, sid, host_substr, timeout_s=10.0):
            return
        await asyncio.sleep(3.5)
        rows = await client.evaluate(
            sid,
            f"""(() => {{
              const out = [];
              const seen = new Set();
              for (const a of document.querySelectorAll({json.dumps(link_selector)})) {{
                const href = a.href || '';
                if (!href || seen.has(href)) continue;
                seen.add(href);
                const card = a.closest('article, [role="row"], tr, li, div') || a;
                const txt = (card.innerText || a.innerText || a.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim();
                if (txt.length < 3) continue;
                out.push({{ href, text: txt.slice(0, 260) }});
                if (out.length >= 20) break;
              }}
              return out;
            }})()""",
        )
        today_s = datetime.now(CN).strftime("%Y-%m-%d")
        for idx, r in enumerate(rows or []):
            href = str(r.get("href") or "")
            txt = str(r.get("text") or "")
            m_views = re.search(r"([\d,.]+\s*[KkMm万]?)\s*(?:views|plays|impressions|播放|浏览)", txt, re.I)
            m_likes = re.search(r"([\d,.]+\s*[KkMm万]?)\s*(?:likes|reactions|赞)", txt, re.I)
            m_comm = re.search(r"([\d,.]+\s*[KkMm万]?)\s*(?:comments|replies|评论)", txt, re.I)
            wid = re.sub(r"[^A-Za-z0-9_-]+", "_", href)[-48:] or f"{platform}_{idx}"
            items.append({
                "platform": platform,
                "work_id": wid,
                "title": _clean_title(txt),
                "url": href,
                "published_at": today_s,
                "published_ts": 0,
                "duration_sec": 0,
                "views": _parse_count(m_views.group(1)) if m_views else 0,
                "likes": _parse_count(m_likes.group(1)) if m_likes else 0,
                "comments": _parse_count(m_comm.group(1)) if m_comm else 0,
                "favorites": 0,
                "shares": 0,
                "raw": {},
            })

    await client.with_tab(url, fn, wait_s=0.0)
    return items


async def _collect_instagram(client: cdp.CDPClient) -> list[dict[str, Any]]:
    return await _collect_global_dom_generic(
        client, platform="instagram", url="https://www.instagram.com/", host_substr="instagram.com",
        link_selector='a[href*="/reel/"], a[href*="/p/"]',
    )


async def _collect_threads(client: cdp.CDPClient) -> list[dict[str, Any]]:
    return await _collect_global_dom_generic(
        client, platform="threads", url="https://www.threads.net/", host_substr="threads.",
        link_selector='a[href*="/post/"]',
    )


async def _collect_linkedin(client: cdp.CDPClient) -> list[dict[str, Any]]:
    return await _collect_global_dom_generic(
        client, platform="linkedin", url="https://www.linkedin.com/in/me/recent-activity/all/", host_substr="linkedin.com",
        link_selector='a[href*="/feed/update/"], a[href*="/posts/"]',
    )


async def _collect_meta(client: cdp.CDPClient) -> list[dict[str, Any]]:
    return await _collect_global_dom_generic(
        client, platform="meta", url="https://business.facebook.com/latest/posts/published_posts", host_substr="facebook.com",
        link_selector='a[href*="facebook.com"], a[href*="instagram.com"]',
    )


async def _collect_tiktok(client: cdp.CDPClient) -> list[dict[str, Any]]:
    return await _collect_global_dom_generic(
        client, platform="tiktok", url="https://www.tiktok.com/tiktokstudio/content", host_substr="tiktok.com",
        link_selector='a[href*="/video/"]',
    )


COLLECTORS = {
    "douyin": _collect_douyin,
    "channels": _collect_channels,
    "bilibili": _collect_bilibili,
    "youtube": _collect_youtube,
    "xhs": _collect_xhs,
    "instagram": _collect_instagram,
    "threads": _collect_threads,
    "linkedin": _collect_linkedin,
    "meta": _collect_meta,
    "tiktok": _collect_tiktok,
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
        # 合并保留历史 raw_json（避免部分刷新覆盖掉留存/完播/涨粉等深层指标）
        old_row = conn.execute(
            "SELECT raw_json FROM platform_works WHERE platform=? AND work_id=?",
            (pid, wid),
        ).fetchone()
        merged_raw: dict[str, Any] = {}
        if old_row and old_row["raw_json"]:
            try:
                old_obj = json.loads(old_row["raw_json"])
                if isinstance(old_obj, dict):
                    merged_raw.update(old_obj)
            except Exception:
                pass
        for k, v in (w.get("raw") or {}).items():
            if v is not None and v != "":
                merged_raw[k] = v
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
                json.dumps(merged_raw, ensure_ascii=False), ts_iso,
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
    """通过专用 Chrome CDP 依次采集各已启用平台的真实已发作品与播放/互动数据，记录精确状态与报错原因。"""
    cfg = cfg or config.load_config()
    st = cdp.chrome_status(cfg)
    if not st["online"]:
        st = cdp.ensure_chrome(cfg, foreground=False)

    ps_rows = {
        r["platform"]: {"state": r["state"], "disabled": bool(r["disabled"])}
        for r in conn.execute("SELECT platform, state, disabled FROM platform_status").fetchall()
    }
    disabled = {pid for pid, info in ps_rows.items() if info["disabled"]}
    enabled_all = [p for p in (target_platforms or list(platforms.PLAT_ORDER)) if p in platforms.PLATFORM_SPECS and p not in disabled]

    per_plat: dict[str, dict[str, Any]] = {}
    errors: list[dict[str, str]] = []
    total_saved = 0
    now_str = datetime.now(CN).strftime("%Y-%m-%d %H:%M:%S")

    # 先把不支持作品采集的已启用平台显式标记为 unsupported，避免界面显示误导性的 0 条
    for pid in enabled_all:
        if pid not in COLLECTORS:
            pname = platforms.PLATFORM_SPECS[pid]["name"]
            note = platforms.PLATFORM_CAPABILITIES.get(pid, {}).get("note") or "暂不支持作品明细自动采集"
            db.record_sync_state(conn, pid, "works", "unsupported", count=0, error_msg=note, at_str=now_str)
            per_plat[pid] = {"ok": False, "status": "unsupported", "count": 0, "error": note}

    wanted = [p for p in enabled_all if p in COLLECTORS]

    async with cdp.CDPClient(st["ws_url"], cmd_timeout=18.0) as client:
        for pid in wanted:
            pname = platforms.PLATFORM_SPECS[pid]["name"]
            try:
                rows = await COLLECTORS[pid](client)
                n = upsert_works(conn, rows)
                total_saved += n
                tot_v = sum(int(r.get("views") or 0) for r in rows)
                if n > 0:
                    db.record_sync_state(conn, pid, "works", "ok", count=n, error_msg="", at_str=now_str)
                    per_plat[pid] = {"ok": True, "status": "ok", "count": n, "views": tot_v, "updatedAt": now_str}
                    db.log_event(conn, "采流量", pname, "采集作品流量", f"实测 {n} 条作品 · 累计 {tot_v:,} 播放")
                else:
                    # 区分“未登录”与“已登录但未读到作品（可能是页面改版或确实未发布）”
                    pstate = (ps_rows.get(pid) or {}).get("state", "warn")
                    if pstate != "ok":
                        reason = f"{pname} 尚未登录或登录态过期，请先去「系统」点登录"
                        db.record_sync_state(conn, pid, "works", "not_logged_in", count=0, error_msg=reason, at_str=now_str)
                        per_plat[pid] = {"ok": False, "status": "not_logged_in", "count": 0, "error": reason}
                        errors.append({"platform": pid, "name": pname, "kind": "works", "status": "not_logged_in", "error": reason})
                        db.log_event(conn, "采流量", pname, "采集作品流量", "未登录（跳过）")
                    else:
                        reason = f"{pname} 已登录但本次未解析到作品（可能暂无作品或页面结构已改版）"
                        db.record_sync_state(conn, pid, "works", "error", count=0, error_msg=reason, at_str=now_str)
                        per_plat[pid] = {"ok": False, "status": "error", "count": 0, "error": reason}
                        errors.append({"platform": pid, "name": pname, "kind": "works", "status": "error", "error": reason})
                        db.log_event(conn, "采流量", pname, "采集作品流量", "未解析到作品（可能改版）")
            except Exception as exc:
                err_txt = f"{pname} 采集异常：{str(exc)[:140]}"
                db.record_sync_state(conn, pid, "works", "error", count=0, error_msg=err_txt, at_str=now_str)
                per_plat[pid] = {"ok": False, "status": "error", "count": 0, "error": err_txt}
                errors.append({"platform": pid, "name": pname, "kind": "works", "status": "error", "error": err_txt})
                db.log_event(conn, "采流量", pname, "采集作品流量", f"采集异常：{str(exc)[:50]}")

    conn.execute("INSERT OR REPLACE INTO kv(k, v) VALUES ('last_metrics_at', ?)", (now_str,))
    conn.commit()

    return {
        "ok": True,
        "collected": total_saved,
        "platforms": per_plat,
        "errors": errors,
        "last_metrics_at": now_str,
        "syncState": db.get_sync_state_map(conn),
        "platformStatus": platforms.get_platform_status_map(conn),
        "analytics": build_analytics(conn),
        "daemonLogs": [dict(r) for r in conn.execute("SELECT ts, episode AS ep, platform AS plat, action, result FROM daemon_logs ORDER BY id DESC LIMIT 30").fetchall()],
    }


def _load_episode_overrides(conn: sqlite3.Connection) -> dict[str, str]:
    rows = conn.execute("SELECT work_key, group_id FROM episode_merges").fetchall()
    return {str(r["work_key"]): str(r["group_id"]) for r in rows}


def merge_episode_works(conn: sqlite3.Connection, work_keys: list[str]) -> dict[str, Any]:
    """手动将多个跨平台作品（格式 'platform:work_id'）归并为同一期。"""
    cleaned = [str(k).strip() for k in work_keys if ":" in str(k).strip()]
    if len(cleaned) < 2:
        raise ValueError("至少需要选择 2 条作品才能合并为同一期")
    existing = _load_episode_overrides(conn)
    # 若其中已有手动合并组，优先复用该 group_id
    gid = next((existing[k] for k in cleaned if k in existing and not existing[k].startswith("split:")), "")
    if not gid:
        gid = f"manual:{int(datetime.now(CN).timestamp() * 1000)}"
    ts = db.now_iso()
    for wk in cleaned:
        conn.execute(
            "INSERT OR REPLACE INTO episode_merges(work_key, group_id, updated_at) VALUES (?,?,?)",
            (wk, gid, ts),
        )
    conn.commit()
    db.log_event(conn, "复盘", "跨平台归并", "手动合并期次", f"已将 {len(cleaned)} 条作品合并为同一期")
    return {"ok": True, "groupId": gid, "count": len(cleaned)}


def split_episode_work(conn: sqlite3.Connection, work_key: str) -> dict[str, Any]:
    """将某条作品从当前跨平台归并组中手动拆出为独立一期。"""
    wk = str(work_key or "").strip()
    if ":" not in wk:
        raise ValueError("work_key 格式应为 platform:work_id")
    ts = db.now_iso()
    conn.execute(
        "INSERT OR REPLACE INTO episode_merges(work_key, group_id, updated_at) VALUES (?,?,?)",
        (wk, f"split:{wk}", ts),
    )
    conn.commit()
    db.log_event(conn, "复盘", "跨平台归并", "手动拆出作品", wk)
    return {"ok": True, "workKey": wk}


def reset_episode_merges(conn: sqlite3.Connection) -> dict[str, Any]:
    conn.execute("DELETE FROM episode_merges")
    conn.commit()
    db.log_event(conn, "复盘", "跨平台归并", "重置手动归并", "已恢复自动归并规则")
    return {"ok": True}


def _group_episodes(works: list[dict[str, Any]], overrides: dict[str, str] | None = None) -> list[dict[str, Any]]:
    """把多平台发布的同一期视频按手动归并覆盖 + 标题相似度/发布时间自动归并为跨平台单期卡片。"""
    overrides = overrides or {}
    groups: list[dict[str, Any]] = []
    manual_groups: dict[str, dict[str, Any]] = {}
    ordered = sorted(works, key=lambda x: (int(x.get("published_ts") or 0), int(x.get("views") or 0)), reverse=True)

    def _add_to_group(g: dict[str, Any], w: dict[str, Any]) -> None:
        g["platforms"][w["platform"]] = w
        if int(w.get("published_ts") or 0) > g["published_ts"]:
            g["published_ts"] = int(w.get("published_ts") or 0)
            if w.get("published_at"):
                g["published_at"] = w["published_at"]
        if not g["duration_sec"] and w.get("duration_sec"):
            g["duration_sec"] = int(w["duration_sec"])
        if w["platform"] in ("bilibili", "youtube") and 6 <= len(w["title"]) <= 36:
            g["title"] = w["title"]

    auto_works: list[dict[str, Any]] = []
    for w in ordered:
        wk = f"{w['platform']}:{w['work_id']}"
        ov = overrides.get(wk)
        if ov and ov.startswith("split:"):
            groups.append({
                "title": w["title"],
                "published_at": w["published_at"],
                "published_ts": int(w.get("published_ts") or 0),
                "duration_sec": int(w.get("duration_sec") or 0),
                "platforms": {w["platform"]: w},
                "manual": True,
            })
        elif ov:
            if ov not in manual_groups:
                g = {
                    "title": w["title"],
                    "published_at": w["published_at"],
                    "published_ts": int(w.get("published_ts") or 0),
                    "duration_sec": int(w.get("duration_sec") or 0),
                    "platforms": {w["platform"]: w},
                    "manual": True,
                }
                manual_groups[ov] = g
                groups.append(g)
            else:
                if w["platform"] not in manual_groups[ov]["platforms"]:
                    _add_to_group(manual_groups[ov], w)
        else:
            auto_works.append(w)

    for w in auto_works:
        matched = None
        for g in groups:
            if g.get("manual"):
                continue
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
                "manual": False,
            })
        else:
            _add_to_group(matched, w)

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
            "manualMerged": bool(g.get("manual")),
            "workKeys": [f"{pid}:{w['work_id']}" for pid, w in g["platforms"].items()],
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
                    "raw": w.get("raw") or {},
                }
                for pid, w in g["platforms"].items()
            },
        })
    return out


def _safe_raw(raw_json: Any) -> dict[str, Any]:
    if isinstance(raw_json, dict):
        return raw_json
    if not raw_json:
        return {}
    try:
        obj = json.loads(raw_json)
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def _pct_or_none(val: Any) -> float | None:
    f = _fnum(val)
    if f is None:
        return None
    # 兼容 0-1 小数与 0-100 百分数
    return round(f * 100, 1) if f <= 1.0 else round(f, 1)


def build_analytics(conn: sqlite3.Connection) -> dict[str, Any]:
    """基于 SQLite 真实采集的 platform_works、work_snapshots 与 followers_daily 生成全量复盘与大屏结论。"""
    rows = conn.execute(
        """SELECT platform, work_id, title, url, published_at, published_ts, duration_sec,
                  views, likes, comments, favorites, shares, raw_json, collected_at
           FROM platform_works
           ORDER BY published_ts DESC, views DESC"""
    ).fetchall()
    works: list[dict[str, Any]] = []
    for r in rows:
        d = dict(r)
        d["raw"] = _safe_raw(d.pop("raw_json", None))
        works.append(d)
    overrides = _load_episode_overrides(conn)
    episodes = _group_episodes(works, overrides=overrides)

    # 1. 抖音作品分析（含 2秒跳出/留存、5秒完播、全片完播、均看时长、封面点击率、单条涨粉、主页访问）
    dy_works = [w for w in works if w["platform"] == "douyin"]
    dy_views = [int(w["views"]) for w in dy_works]
    dy_likes = [int(w["likes"]) for w in dy_works]
    dy_favs = [int(w["favorites"]) for w in dy_works]
    med_views = int(round(median(dy_views))) if dy_views else 0
    med_likes = int(round(median(dy_likes))) if dy_likes else 0
    tot_dy_likes = sum(dy_likes)
    tot_dy_favs = sum(dy_favs)
    fav_like_pct = round((tot_dy_favs / tot_dy_likes) * 100, 1) if tot_dy_likes else 0.0

    vals_5s: list[float] = []
    vals_b2s: list[float] = []
    vals_comp: list[float] = []
    vals_avg_s: list[float] = []
    vals_ctr: list[float] = []
    tot_dy_fans_gained = 0
    tot_dy_home_visits = 0
    has_fans_gained = False

    scatter: list[dict[str, Any]] = []
    hit_3x = 0
    for w in dy_works:
        mult = round(w["views"] / med_views, 1) if med_views > 0 else 1.0
        if mult >= 3.0:
            hit_3x += 1
        raw = w.get("raw") or {}
        c5s = _pct_or_none(raw.get("completion_5s"))
        b2s = _pct_or_none(raw.get("bounce_2s"))
        stay2s = round(max(0.0, 100.0 - b2s), 1) if b2s is not None else _pct_or_none(raw.get("retention_2s"))
        comp = _pct_or_none(raw.get("completion"))
        avg_s = _fnum(raw.get("avg_view_s"))
        ctr = _pct_or_none(raw.get("cover_ctr"))
        fg = _inum(raw.get("fans_gained"))
        nf = _inum(raw.get("net_fans"))
        hv = _inum(raw.get("home_visits"))
        fvp = _pct_or_none(raw.get("fan_view_pct"))

        if c5s is not None:
            vals_5s.append(c5s)
        if b2s is not None:
            vals_b2s.append(b2s)
        if comp is not None:
            vals_comp.append(comp)
        if avg_s is not None:
            vals_avg_s.append(round(avg_s, 1))
        if ctr is not None:
            vals_ctr.append(ctr)
        if fg is not None:
            tot_dy_fans_gained += fg
            has_fans_gained = True
        if hv is not None:
            tot_dy_home_visits += hv

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
            "completion5sPct": c5s,
            "bounce2sPct": b2s,
            "stay2sPct": stay2s,
            "completionPct": comp,
            "avgViewS": round(avg_s, 1) if avg_s is not None else None,
            "coverCtrPct": ctr,
            "fansGained": fg,
            "netFans": nf,
            "homeVisits": hv,
            "fanViewPct": fvp,
            "diagTag": "",
            "diagTone": "",
        })

    med_5s = round(median(vals_5s), 1) if vals_5s else None
    med_b2s = round(median(vals_b2s), 1) if vals_b2s else None
    med_stay2s = round(max(0.0, 100.0 - med_b2s), 1) if med_b2s is not None else None
    med_comp = round(median(vals_comp), 1) if vals_comp else None
    med_avg_s = round(median(vals_avg_s), 1) if vals_avg_s else None
    med_ctr = round(median(vals_ctr), 1) if vals_ctr else None
    has_retention = bool(vals_5s or vals_b2s or vals_comp or vals_avg_s)

    # 基于账号自身中位数打诊断标签，真正区分出优势项与短板项
    for item in scatter:
        mult = item["mult"]
        c5s = item["completion5sPct"]
        b2s = item["bounce2sPct"]
        ctr = item["coverCtrPct"]
        fg = item["fansGained"] or 0
        if mult >= 3.0:
            item["diagTag"], item["diagTone"] = ("🔥 爆款 · 涨粉王" if fg >= 500 else "🔥 3× 爆款"), "good"
        elif b2s is not None and med_b2s is not None and b2s >= max(42.0, med_b2s + 6.0):
            item["diagTag"], item["diagTone"] = "⚠️ 2s 跳出高 · 改开头", "warn"
        elif c5s is not None and med_5s is not None and c5s >= max(42.0, med_5s + 6.0):
            item["diagTag"], item["diagTone"] = "⚡ 5s 完播极强", "good"
        elif fg >= 300:
            item["diagTag"], item["diagTone"] = "🧲 高转粉", "good"
        elif ctr is not None and med_ctr is not None and ctr >= med_ctr + 10.0:
            item["diagTag"], item["diagTone"] = "🎯 封面极吸睛", "accent"
        elif ctr is not None and med_ctr is not None and ctr <= max(14.0, med_ctr - 10.0):
            item["diagTag"], item["diagTone"] = "🖼 封面偏弱", "warn"
        elif item["likes"] > 0 and (item["favorites"] / item["likes"]) >= 0.9:
            item["diagTag"], item["diagTone"] = "💎 高收藏干货", "accent"
        elif mult < 0.6 and med_views > 0:
            item["diagTag"], item["diagTone"] = "📉 低于中位", "warn"

    # 抖音留存诊断洞察（对比 3× 爆款 vs 普通视频）
    retention_insights: list[dict[str, str]] = []
    if has_retention:
        hits_5s = [x["completion5sPct"] for x in scatter if x["mult"] >= 3.0 and x["completion5sPct"] is not None]
        norm_5s = [x["completion5sPct"] for x in scatter if x["mult"] < 3.0 and x["completion5sPct"] is not None]
        if hits_5s and norm_5s:
            h5, n5 = round(median(hits_5s), 1), round(median(norm_5s), 1)
            diff = round(h5 - n5, 1)
            retention_insights.append({
                "cls": "g" if diff >= 0 else "o",
                "tag": "5秒留存",
                "html": f"你的 3× 爆款 5 秒完播中位数 <b>{h5}%</b> vs 普通作品 <b>{n5}%</b>（差值 <b>{'+' if diff >= 0 else ''}{diff}%</b>），前 5 秒直接决定推流池大小。",
            })
        elif med_5s is not None and med_stay2s is not None:
            retention_insights.append({
                "cls": "b",
                "tag": "开头留存",
                "html": f"近 {len(vals_5s)} 条抖音实测 <b>2 秒留存 {med_stay2s}%</b>（跳出 {med_b2s}%）、<b>5 秒完播 {med_5s}%</b>、平均观看 <b>{med_avg_s or 0} 秒</b>。",
            })
        top_fan_w = max((x for x in scatter if (x["fansGained"] or 0) > 0), key=lambda x: x["fansGained"] or 0, default=None)
        if top_fan_w:
            retention_insights.append({
                "cls": "g",
                "tag": "涨粉王",
                "html": f"单条最能涨粉的是「<b>{top_fan_w['title'][:24]}</b>」单条涨粉 <b>+{top_fan_w['fansGained']:,}</b>（主页访问 {top_fan_w['homeVisits'] or 0:,} · 封面点击 {top_fan_w['coverCtrPct'] or 0}%）。",
            })
        worst_b2s = max((x for x in scatter if x["bounce2sPct"] is not None), key=lambda x: x["bounce2sPct"] or 0, default=None)
        if worst_b2s and (worst_b2s["bounce2sPct"] or 0) >= 42.0:
            retention_insights.append({
                "cls": "o",
                "tag": "跳出预警",
                "html": f"「<b>{worst_b2s['title'][:22]}</b>」2 秒跳出高达 <b>{worst_b2s['bounce2sPct']}%</b>，前 2 秒信息密度/画面冲突不足，建议复盘开场第一句。",
            })
        if med_ctr is not None:
            retention_insights.append({
                "cls": "p",
                "tag": "封面点击",
                "html": f"抖音封面点击率中位数 <b>{med_ctr}%</b>，累计通过作品带来 <b>+{tot_dy_fans_gained:,}</b> 涨粉与 <b>{tot_dy_home_visits:,}</b> 次主页访问。",
            })
    elif dy_works:
        retention_insights.append({
            "cls": "o",
            "tag": "留存待同步",
            "html": "点右上角「<b>立即采流量</b>」即可从抖音创作者后台同步每条视频的 <b>2 秒跳出率、5 秒完播率、全片完播、均看时长、封面点击率与单条涨粉</b>。",
        })

    # 2. 跨平台单期对比与多日快照（最多 20 期，附主力平台归因、留存、诊断结论）
    snap_rows = conn.execute(
        "SELECT day, platform, work_id, age_days, views, likes, favorites FROM work_snapshots ORDER BY day ASC"
    ).fetchall()
    snaps_by_work: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for sr in snap_rows:
        snaps_by_work.setdefault((sr["platform"], sr["work_id"]), []).append(dict(sr))

    ep_views_all = [int(e["views"]) for e in episodes if int(e["views"]) > 0]
    ep_med_views = int(round(median(ep_views_all))) if ep_views_all else 0

    age_reviews: list[dict[str, Any]] = []
    for i, ep in enumerate(episodes[:20]):
        prev = episodes[i + 1] if i + 1 < len(episodes) else None
        prev_views = prev["views"] if prev else 0
        ratio = round(ep["views"] / prev_views, 1) if prev_views > 0 else None
        mult_acc = round(ep["views"] / ep_med_views, 1) if ep_med_views > 0 else 1.0

        day_totals: dict[str, dict[str, int]] = {}
        for pid, pw in ep["platforms"].items():
            for s in snaps_by_work.get((pid, pw["work_id"]), []):
                d = day_totals.setdefault(s["day"], {"age": s["age_days"], "views": 0, "likes": 0, "favorites": 0})
                d["views"] += int(s["views"])
                d["likes"] += int(s["likes"])
                d["favorites"] += int(s["favorites"])
                d["age"] = max(d["age"], int(s["age_days"]))
        snapshots = [{"day": d, **v} for d, v in sorted(day_totals.items())]

        breakdown: list[dict[str, Any]] = []
        tot_v = max(1, int(ep["views"] or 0))
        for pid, pw in sorted(ep["platforms"].items(), key=lambda kv: int(kv[1].get("views") or 0), reverse=True):
            pv = int(pw.get("views") or 0)
            p_inter = int(pw.get("likes") or 0) + int(pw.get("comments") or 0) + int(pw.get("favorites") or 0) + int(pw.get("shares") or 0)
            praw = pw.get("raw") or {}
            b2s = _pct_or_none(praw.get("bounce_2s"))
            breakdown.append({
                "platform": pid,
                "name": platforms.PLATFORM_SPECS.get(pid, {}).get("name", pid),
                "views": pv,
                "sharePct": round((pv / tot_v) * 100, 1) if ep["views"] else 0.0,
                "likes": int(pw.get("likes") or 0),
                "favorites": int(pw.get("favorites") or 0),
                "comments": int(pw.get("comments") or 0),
                "shares": int(pw.get("shares") or 0),
                "inter": p_inter,
                "interRate": round((p_inter / pv) * 100, 1) if pv else 0.0,
                "url": pw.get("url") or "",
                "published_at": pw.get("published_at") or "",
                "stay2sPct": round(max(0.0, 100.0 - b2s), 1) if b2s is not None else None,
                "completion5sPct": _pct_or_none(praw.get("completion_5s")),
                "completionPct": _pct_or_none(praw.get("completion")),
                "avgViewS": _fnum(praw.get("avg_view_s")),
                "coverCtrPct": _pct_or_none(praw.get("cover_ctr")),
                "fansGained": _inum(praw.get("fans_gained")),
            })

        lead = breakdown[0] if breakdown else None
        dy_p = next((x for x in breakdown if x["platform"] == "douyin"), None)
        verdict_parts: list[str] = []
        if lead and ep["views"] > 0:
            verdict_parts.append(f"{lead['name']}贡献 {lead['sharePct']}% 流量为主力阵地")
        if mult_acc >= 2.5:
            verdict_parts.append(f"达全盘中位数 {mult_acc}×，属于明确爆款选题")
        elif mult_acc <= 0.5 and ep_med_views > 0:
            verdict_parts.append(f"仅为全盘中位数 {mult_acc}×，需检查选题切口或封面标题")
        if dy_p and dy_p.get("completion5sPct") is not None:
            verdict_parts.append(f"抖音 5 秒完播 {dy_p['completion5sPct']}% · 2 秒留存 {dy_p['stay2sPct']}%")
        if ep["platformCount"] == 1:
            verdict_parts.append("仅在单平台采到，建议检查其余平台是否漏发或标题差异过大")

        age_reviews.append({
            "id": ep["id"],
            "title": ep["title"],
            "nick": ep["nick"],
            "published_at": ep["published_at"],
            "duration_sec": ep["duration_sec"],
            "platformCount": ep["platformCount"],
            "manualMerged": bool(ep.get("manualMerged")),
            "workKeys": ep.get("workKeys") or [],
            "diagMeta": {
                "method": "规则推断",
                "sampleCount": len(ep_views_all),
                "lowSample": len(ep_views_all) < 10,
            },
            "views": ep["views"],
            "likes": ep["likes"],
            "favorites": ep["favorites"],
            "comments": ep["comments"],
            "shares": ep["shares"],
            "inter": ep["inter"],
            "interRate": ep["interRate"],
            "multVsAccount": mult_acc,
            "prevViews": prev_views,
            "prevTitle": prev["nick"] if prev else "",
            "ratio": ratio,
            "leadPlatform": lead["platform"] if lead else "",
            "leadName": lead["name"] if lead else "",
            "leadSharePct": lead["sharePct"] if lead else 0.0,
            "verdict": "；".join(verdict_parts) if verdict_parts else "已采集跨平台实测数据。",
            "platformBreakdown": breakdown,
            "platforms": {
                pid: {k: v for k, v in pw.items() if k != "raw"}
                for pid, pw in ep["platforms"].items()
            },
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

    # 4. 动态「人话结论」（100% 来自真实采集数据）
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
        ret_bit = f" · 5s 完播 <b>{med_5s}%</b>" if med_5s is not None else ""
        insights.append({
            "cls": "p",
            "tag": "抖音",
            "html": f"近 {len(dy_works)} 条抖音实测中位播放 <b>{med_views:,}</b>{ret_bit}，收藏/赞比 <b>{fav_like_pct}%</b>，3× 以上爆款 <b>{hit_3x} 条</b>。",
        })
    elif not episodes:
        insights.append({
            "cls": "o",
            "tag": "待采集",
            "html": "尚未采集各平台已发作品数据，点击右上角「<b>立即采数</b>」即可从专用 Chrome 实时拉取真实播放与互动。",
        })

    # 5. 结构化周报（weeklyBrief：可视化叙事复盘）+ 可复制 Markdown 周报（weeklyReport）
    now_str = datetime.now(CN).strftime("%Y-%m-%d %H:%M")
    plat_stats: dict[str, dict[str, Any]] = {}
    for w in works:
        pid = w["platform"]
        st = plat_stats.setdefault(pid, {"count": 0, "views": 0, "inter": 0})
        st["count"] += 1
        st["views"] += int(w["views"] or 0)
        st["inter"] += int(w["likes"] or 0) + int(w["comments"] or 0) + int(w["favorites"] or 0) + int(w["shares"] or 0)

    fan_map = {x["platform"]: x for x in fan_summary}
    all_seen_plats = list(dict.fromkeys(list(plat_stats.keys()) + list(fan_map.keys())))
    platform_health: list[dict[str, Any]] = []
    tot_all_views = sum(x["views"] for x in plat_stats.values())
    for pid in all_seen_plats:
        ps = plat_stats.get(pid, {"count": 0, "views": 0, "inter": 0})
        fs = fan_map.get(pid, {"total": 0, "d7": 0})
        avg_v = int(round(ps["views"] / ps["count"])) if ps["count"] else 0
        ir = round((ps["inter"] / ps["views"]) * 100, 1) if ps["views"] else 0.0
        share_v = round((ps["views"] / tot_all_views) * 100, 1) if tot_all_views else 0.0
        role = "核心主阵地" if share_v >= 50 else ("成长分发" if ps["views"] > 0 else ("存量关注" if fs["total"] > 0 else "待启动"))
        platform_health.append({
            "platform": pid,
            "name": platforms.PLATFORM_SPECS.get(pid, {}).get("name", pid),
            "fans": fs["total"],
            "d7Fans": fs["d7"],
            "works": ps["count"],
            "views": ps["views"],
            "avgViews": avg_v,
            "interRate": ir,
            "viewSharePct": share_v,
            "role": role,
        })
    platform_health.sort(key=lambda x: (x["views"], x["fans"]), reverse=True)

    # 发生了什么（叙事卡片）
    what_happened: list[dict[str, str]] = []
    if episodes:
        latest = episodes[0]
        latest_mult = round(latest["views"] / ep_med_views, 1) if ep_med_views else 1.0
        what_happened.append({
            "tone": "good" if latest_mult >= 1.2 else ("warn" if latest_mult < 0.7 else "accent"),
            "tag": "最新一期表现",
            "title": f"《{latest['nick']}》全网 {latest['views']:,} 播放（{latest_mult}× 全盘中位）",
            "detail": f"发布于 {latest['published_at'] or '近期'}，覆盖 {latest['platformCount']} 个平台，互动 {latest['inter']:,}（互动率 {latest['interRate']}%）。"
                      + ("高于平时表现，说明这个切口受众买单。" if latest_mult >= 1.2 else ("低于平时中位数，建议回看前 5 秒和标题动机。" if latest_mult < 0.7 else "表现符合账号基本盘，保持稳定节奏。")),
        })
    if fan_summary:
        lead_f = max(fan_summary, key=lambda x: x["d7"])
        what_happened.append({
            "tone": "good" if tot_d7 > 0 else "accent",
            "tag": "粉丝增长结构",
            "title": f"全网总粉 {tot_fans:,}（近 7 天 {'+' if tot_d7 >= 0 else ''}{tot_d7:,}）",
            "detail": (f"近 7 天增量主要由 {lead_f['name']} 贡献（{'+' if lead_f['d7'] >= 0 else ''}{lead_f['d7']:,}）。" if tot_d7 > 0 else "近 7 天粉丝波动平缓，主力粉丝池在 " + lead_f["name"] + f"（{lead_f['total']:,}）。")
                      + (f"抖音已采作品累计直接涨粉 +{tot_dy_fans_gained:,}。" if has_fans_gained else ""),
        })
    if has_retention:
        what_happened.append({
            "tone": "good" if (med_5s or 0) >= 35 else "warn",
            "tag": "开头与留存体检",
            "title": f"抖音 2 秒留存 {med_stay2s or 0}% · 5 秒完播 {med_5s or 0}% · 均看 {med_avg_s or 0}s",
            "detail": f"封面点击率中位数 {med_ctr or 0}%，全片完播中位数 {med_comp or 0}%。"
                      + ("前 5 秒钩子健康，继续把核心结果/冲突压到前 3 秒。" if (med_5s or 0) >= 35 else "5 秒完播偏弱，下期剪辑优先砍掉寒暄、直接抛反差结论。"),
        })
    elif dy_works:
        what_happened.append({
            "tone": "accent",
            "tag": "内容变现/干货信号",
            "title": f"抖音收藏/赞比 {fav_like_pct}% · 3× 以上爆款 {hit_3x} 条",
            "detail": f"账号中位播放 {med_views:,}、中位点赞 {med_likes:,}；高收藏赞比说明用户把你的视频当成可复用的实操指南。",
        })
    if platform_health:
        top_p = platform_health[0]
        weak_p = [x for x in platform_health if x["works"] > 0 and x["viewSharePct"] < 5]
        what_happened.append({
            "tone": "accent",
            "tag": "多平台分发格局",
            "title": f"{top_p['name']} 占全网 {top_p['viewSharePct']}% 播放，跨平台长尾待放大",
            "detail": (f"{' / '.join(x['name'] for x in weak_p[:3])} 已分发但流量占比偏低，建议在打包页按平台独立改写标题动机与封面大字，海外 IG/LinkedIn 直接发英文图文卡或纯文字。"
                       if weak_p else "当前各已采平台分发均衡，建议持续保持多平台同日上线以便做 1/3/7 天同龄复盘。"),
        })

    # 红黑榜：Top 3 爆款 vs 需优化作品
    winners = [
        {
            "title": e["title"],
            "published_at": e["published_at"],
            "views": e["views"],
            "inter": e["inter"],
            "interRate": e["interRate"],
            "platformCount": e["platformCount"],
            "reason": f"全网中位数 {round(e['views'] / ep_med_views, 1) if ep_med_views else 1.0}× · 互动率 {e['interRate']}%",
        }
        for e in sorted(episodes, key=lambda x: x["views"], reverse=True)[:3]
    ]
    recent_pool = [x for x in scatter[:12] if x["views"] > 0]
    watchouts = [
        {
            "title": x["title"],
            "published_at": x["published_at"],
            "views": x["views"],
            "mult": x["mult"],
            "bounce2sPct": x["bounce2sPct"],
            "completion5sPct": x["completion5sPct"],
            "coverCtrPct": x["coverCtrPct"],
            "reason": (
                f"2秒跳出 {x['bounce2sPct']}% 偏高，开头没留住人"
                if (x["bounce2sPct"] or 0) >= 42
                else (
                    f"封面点击率 {x['coverCtrPct']}% 偏低，建议换反差大字"
                    if x["coverCtrPct"] is not None and x["coverCtrPct"] < 14
                    else f"播放仅为账号中位数 {x['mult']}×，建议复盘选题切口"
                )
            ),
        }
        for x in sorted(recent_pool, key=lambda z: z["views"])[:3]
    ]

    # 下周行动清单
    next_actions: list[dict[str, str]] = []
    if winners:
        next_actions.append({
            "priority": "P0",
            "title": f"围绕最高代表作《{winners[0]['title'][:18]}》做 1 条续集或反向视角",
            "detail": f"该题材已验证拿到 {winners[0]['views']:,} 播放，直接点「反推选题」生成 3 个延续切口，复用成功动机。",
            "hash": "#review/douyin",
            "cta": "去反推续集 ›",
        })
    if has_retention and (med_b2s or 0) >= 35:
        next_actions.append({
            "priority": "P1",
            "title": f"下期剪辑把前 2 秒跳出率从 {med_b2s}% 压到 32% 以内",
            "detail": "去掉“大家好我是…”寒暄，前 2 秒直接出结果画面或冲突数字，并在剪辑页用高密度动效抓住前 5 秒。",
            "hash": "#cut",
            "cta": "去剪辑工作台 ›",
        })
    else:
        next_actions.append({
            "priority": "P1",
            "title": "坚持每期 6 动机标题测试 + 三比例封面一次打包",
            "detail": "同内容在抖音/视频号/B站/YouTube 差异化投放，IG/Meta/LinkedIn 自动切英文图文卡与纯文字，零额外人力拿海外增量。",
            "hash": "#pub-pack",
            "cta": "去发布打包 ›",
        })
    next_actions.append({
        "priority": "P2",
        "title": "保持每天一次自动采数，跑出 1/3/7 天同龄复盘曲线",
        "detail": "连续采满 7 天后，可按发布第 1/3/7 天精准横向对比不同选题的冷启动推流斜率。",
        "hash": "#review/age",
        "cta": "看跨平台单期复盘 ›",
    })

    if episodes:
        lead_ep = winners[0]
        headline = (
            f"全网实测 {tot_fans:,} 粉（近 7 天 {'+' if tot_d7 >= 0 else ''}{tot_d7:,}），"
            f"已复盘 {len(works)} 条作品（{len(episodes)} 期）；代表作《{lead_ep['title'][:18]}》拿到 {lead_ep['views']:,} 播放"
            + (f"，抖音 5 秒完播中位数 {med_5s}%。" if med_5s is not None else "。")
        )
    else:
        headline = "尚未采集真实作品数据，点击右上角「立即采流量」即可自动生成可执行数据周报。"

    ai_memo_row = conn.execute("SELECT v FROM kv WHERE k='weekly_ai_memo'").fetchone()
    ai_memo = None
    if ai_memo_row and ai_memo_row["v"]:
        try:
            ai_memo = json.loads(ai_memo_row["v"])
        except Exception:
            ai_memo = None

    weekly_brief = {
        "generatedAt": now_str,
        "headline": headline,
        "aiMemo": ai_memo,
        "kpis": [
            {"lab": "全网实测总粉", "val": f"{tot_fans:,}", "sub": f"近 7 天 {'+' if tot_d7 >= 0 else ''}{tot_d7:,}", "tone": "good" if tot_d7 > 0 else ""},
            {"lab": "已入库作品 / 期次", "val": f"{len(works)} / {len(episodes)}", "sub": f"累计 {tot_all_views:,} 播放", "tone": ""},
            {"lab": "抖音中位播放", "val": f"{med_views:,}" if med_views else "–", "sub": f"3× 爆款 {hit_3x} 条 · 收藏赞比 {fav_like_pct}%", "tone": "accent"},
            {
                "lab": "抖音 5s 完播 / 2s 留存",
                "val": f"{med_5s}% / {med_stay2s}%" if (med_5s is not None and med_stay2s is not None) else "待采留存",
                "sub": f"均看 {med_avg_s}s · 封面点击 {med_ctr}%" if med_avg_s is not None else "点右上角「立即采流量」同步",
                "tone": "good" if (med_5s or 0) >= 35 else "",
            },
            {
                "lab": "作品直接涨粉",
                "val": f"+{tot_dy_fans_gained:,}" if has_fans_gained else "–",
                "sub": f"主页访问 {tot_dy_home_visits:,}" if tot_dy_home_visits else "来自抖音创作者后台",
                "tone": "good" if tot_dy_fans_gained > 0 else "",
            },
        ],
        "whatHappened": what_happened,
        "platformHealth": platform_health,
        "winners": winners,
        "watchouts": watchouts,
        "nextWeekActions": next_actions,
    }

    plat_view_line = " · ".join(f"{x['name']} {x['views']:,}" for x in platform_health if x["views"] > 0) or "暂无作品播放数据"
    fan_line = " · ".join(f"{x['name']} {x['total']:,}" for x in fan_summary) or "暂无粉丝数据"
    top3_lines = "\n".join(
        f"  {i + 1}. 《{e['title'][:32]}》 {e['views']:,} 播放 · {e['inter']:,} 互动（{e['published_at'] or '日期未标'}）"
        for i, e in enumerate(episodes[:5])
    ) or "  （点击右上角「立即采流量」拉取真实作品数据）"
    action_lines = "\n".join(f"  - [{a['priority']}] {a['title']}" for a in next_actions)
    weekly_report = (
        f"🗓 Park Studio 真实数据周报｜{now_str}\n"
        f"一句话结论：{headline}\n\n"
        f"【核心盘面】\n"
        f"- 全网粉丝：{fan_line}（合计 {tot_fans:,}，7日 {'+' if tot_d7 >= 0 else ''}{tot_d7:,}）\n"
        f"- 累计播放：{plat_view_line}\n"
        + (f"- 抖音留存体检：2秒留存 {med_stay2s}% · 5秒完播 {med_5s}% · 均看 {med_avg_s}s · 封面点击 {med_ctr}% · 作品涨粉 +{tot_dy_fans_gained:,}\n" if has_retention else "")
        + f"\n【最近 5 期表现】\n{top3_lines}\n\n"
        f"【下周行动建议】\n{action_lines}"
    )

    last_at_row = conn.execute("SELECT v FROM kv WHERE k='last_metrics_at'").fetchone()

    return {
        "hasLiveWorks": len(works) > 0,
        "totalWorks": len(works),
        "totalEpisodes": len(episodes),
        "lastMetricsAt": last_at_row["v"] if last_at_row else "未采集",
        "hasManualOverrides": bool(overrides),
        "syncState": db.get_sync_state_map(conn),
        "platformCounts": {
            pid: sum(1 for w in works if w["platform"] == pid)
            for pid in platforms.PLAT_ORDER
        },
        "episodes": episodes[:20],
        "works": works[:60],
        "douyin": {
            "count": len(dy_works),
            "sampleCount": len(dy_works),
            "lowSample": 0 < len(dy_works) < 10,
            "diagMethod": "基于账号中位数规则推断",
            "medianViews": med_views,
            "medianLikes": med_likes,
            "favLikePct": fav_like_pct,
            "hit3xCount": hit_3x,
            "hasRetention": has_retention,
            "median2sBouncePct": med_b2s,
            "median2sStayPct": med_stay2s,
            "median5sPct": med_5s,
            "medianCompletionPct": med_comp,
            "medianAvgViewS": med_avg_s,
            "medianCoverCtrPct": med_ctr,
            "totalFansGained": tot_dy_fans_gained if has_fans_gained else None,
            "totalHomeVisits": tot_dy_home_visits if tot_dy_home_visits else None,
            "retentionInsights": retention_insights,
            "scatter": scatter,
        },
        "ageReviews": age_reviews,
        "insights": insights,
        "weeklyBrief": weekly_brief,
        "weeklyReport": weekly_report,
    }
