"""对标爆款库与 AI 爆款拆解引擎（读取 Obsidian 002_对标内容 + SQLite 对标账号/新增拆解）。

支持：
1. 只读解析 Obsidian 对标文件夹中的真实拆解笔记（author / likes / multiple_of_median / source / 主线 / 为什么爆 / 完整逐字稿）；
2. 管理追踪的对标账号（SQLite benchmark_accounts），支持添加抖音/B站/YouTube 对标账号并通过专用 Chrome 抓最新作品算倍数；
3. 调用本机 Coding Agent（Gemini CLI / Claude Code / Codex）对任意视频/逐字稿一键生成结构化《爆款拆解报告》并持久化到 SQLite。
"""
from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import median
from typing import Any

from . import ai, cdp, config, db, vault

CN = timezone(timedelta(hours=8))


def _extract_section(body: str, heading: str) -> str:
    m = re.search(rf"^##\s*{re.escape(heading)}\s*\n(.*?)(?=^##\s|\Z)", body, re.M | re.S)
    return m.group(1).strip() if m else ""


def _parse_benchmark_md(path: Path) -> dict[str, Any] | None:
    try:
        raw = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    meta, body = vault.parse_frontmatter(raw)
    title = str(meta.get("title") or "").strip()
    if not title:
        hm = re.search(r"^#\s+(.+)$", body, re.M)
        title = hm.group(1).strip() if hm else path.stem
    author = str(meta.get("author") or "").strip()
    if not author:
        # 从文件名 "2026-08-27 dontbesilent 聊赚钱 ..." 提取
        fm = re.match(r"^\d{4}-\d{2}-\d{2}\s+(\S+)", path.stem)
        author = fm.group(1) if fm else "对标账号"
    source = str(meta.get("source") or meta.get("url") or "").strip()
    published = str(meta.get("published") or meta.get("date") or "").strip()
    if not published:
        dm = re.match(r"^(\d{4}-\d{2}-\d{2})", path.stem)
        published = dm.group(1) if dm else ""
    day = published[:10] if len(published) >= 10 else ""
    try:
        likes = int(float(str(meta.get("likes") or "0").replace(",", "")))
    except ValueError:
        likes = 0
    try:
        mult = round(float(str(meta.get("multiple_of_median") or "0")), 1)
    except ValueError:
        mult = 0.0

    plat = "douyin"
    low_src = source.lower()
    if "bilibili" in low_src:
        plat = "bilibili"
    elif "youtube" in low_src or "youtu.be" in low_src:
        plat = "youtube"
    elif "xiaohongshu" in low_src or "xhslink" in low_src:
        plat = "xhs"
    elif "x.com" in low_src or "twitter.com" in low_src:
        plat = "x"

    mainline = _extract_section(body, "主线")
    why_hit = _extract_section(body, "为什么爆")
    # 摘要优先取主线，再取正文首段
    excerpt = (mainline or why_hit or vault._excerpt_of(body))[:180]
    return {
        "id": f"md:{path.name}",
        "kind": "vault",
        "title": title,
        "author": author,
        "platform": plat,
        "url": source,
        "published": day,
        "likes": likes,
        "multiple": mult,
        "mainline": mainline,
        "whyHit": why_hit,
        "excerpt": excerpt,
        "path": str(path),
        "body": body[:24000],
    }


def list_benchmarks(
    conn: sqlite3.Connection,
    *,
    cfg: dict[str, Any] | None = None,
    author: str = "",
    sort: str = "multiple",
    limit: int = 120,
) -> dict[str, Any]:
    cfg = cfg or config.load_config()
    vroot = Path(str(cfg.get("obsidianPath") or "")).expanduser()
    bench_folder_name = str((cfg.get("obsidianFolders") or {}).get("benchmarks") or "002_对标内容")
    bdir = vroot / bench_folder_name

    items: list[dict[str, Any]] = []
    if bdir.is_dir():
        for p in sorted(bdir.glob("*.md"), key=lambda x: x.name, reverse=True):
            parsed = _parse_benchmark_md(p)
            if parsed:
                items.append(parsed)

    # 合并 SQLite 中新增抓取或 AI 拆解的对标条目
    rows = conn.execute(
        """SELECT id, title, author, platform, url, published, likes, multiple, mainline, why_hit, body, created_at
           FROM benchmark_items ORDER BY id DESC"""
    ).fetchall()
    seen_urls = {it["url"] for it in items if it.get("url")}
    for r in rows:
        if r["url"] and r["url"] in seen_urls:
            continue
        items.append({
            "id": f"db:{r['id']}",
            "kind": "db",
            "title": r["title"],
            "author": r["author"],
            "platform": r["platform"],
            "url": r["url"],
            "published": (r["published"] or r["created_at"] or "")[:10],
            "likes": int(r["likes"] or 0),
            "multiple": round(float(r["multiple"] or 0), 1),
            "mainline": r["mainline"] or "",
            "whyHit": r["why_hit"] or "",
            "excerpt": (r["mainline"] or r["why_hit"] or (r["body"] or "")[:160])[:180],
            "path": "",
            "body": r["body"] or "",
        })

    # 统计全部对标作者（按作品数排序）
    author_counts: dict[str, int] = {}
    for it in items:
        a = it["author"]
        author_counts[a] = author_counts.get(a, 0) + 1
    authors = [{"name": a, "count": c} for a, c in sorted(author_counts.items(), key=lambda kv: (-kv[1], kv[0]))]

    # 追踪的对标账号表
    tracked = [
        dict(r)
        for r in conn.execute("SELECT id, name, platform, url, last_fetched_at, works_count FROM benchmark_accounts ORDER BY id DESC").fetchall()
    ]

    filtered = [it for it in items if not author or it["author"] == author]
    if sort == "likes":
        filtered.sort(key=lambda x: (x["likes"], x["multiple"], x["published"]), reverse=True)
    elif sort == "latest":
        filtered.sort(key=lambda x: (x["published"], x["multiple"], x["likes"]), reverse=True)
    else:
        filtered.sort(key=lambda x: (x["multiple"], x["likes"], x["published"]), reverse=True)

    hit_3x = sum(1 for it in items if (it.get("multiple") or 0) >= 3.0)
    # 列表返回精简字段（不含 2 万字全文，点开单条再读详情）
    slim = [{k: v for k, v in it.items() if k != "body"} for it in filtered[:limit]]
    return {
        "folder": str(bdir),
        "mounted": bdir.is_dir(),
        "total": len(items),
        "hit3x": hit_3x,
        "authors": authors,
        "tracked": tracked,
        "items": slim,
    }


def get_benchmark_detail(conn: sqlite3.Connection, item_id: str, *, cfg: dict[str, Any] | None = None) -> dict[str, Any] | None:
    cfg = cfg or config.load_config()
    if item_id.startswith("md:"):
        fname = item_id[3:]
        vroot = Path(str(cfg.get("obsidianPath") or "")).expanduser()
        bench_folder_name = str((cfg.get("obsidianFolders") or {}).get("benchmarks") or "002_对标内容")
        bdir = (vroot / bench_folder_name).resolve()
        target = (bdir / fname).resolve()
        if bdir not in target.parents or not target.is_file():
            return None
        return _parse_benchmark_md(target)
    if item_id.startswith("db:"):
        try:
            rid = int(item_id[3:])
        except ValueError:
            return None
        r = conn.execute("SELECT * FROM benchmark_items WHERE id=?", (rid,)).fetchone()
        if not r:
            return None
        return {
            "id": f"db:{r['id']}",
            "kind": "db",
            "title": r["title"],
            "author": r["author"],
            "platform": r["platform"],
            "url": r["url"],
            "published": (r["published"] or r["created_at"] or "")[:10],
            "likes": int(r["likes"] or 0),
            "multiple": round(float(r["multiple"] or 0), 1),
            "mainline": r["mainline"] or "",
            "whyHit": r["why_hit"] or "",
            "excerpt": (r["mainline"] or r["why_hit"] or "")[:180],
            "body": r["body"] or "",
        }
    return None


def add_benchmark_account(conn: sqlite3.Connection, name: str, platform: str, url: str) -> dict[str, Any]:
    ts = db.now_iso()
    cur = conn.execute(
        "INSERT INTO benchmark_accounts(name, platform, url, last_fetched_at, works_count, created_at) VALUES (?,?,?,'未抓取',0,?)",
        (name.strip(), platform.strip() or "douyin", url.strip(), ts),
    )
    conn.commit()
    db.log_event(conn, "对标", platform, "添加对标账号", name.strip())
    return {"id": cur.lastrowid, "name": name.strip(), "platform": platform, "url": url.strip(), "last_fetched_at": "未抓取", "works_count": 0}


def delete_benchmark_account(conn: sqlite3.Connection, acc_id: int) -> None:
    conn.execute("DELETE FROM benchmark_accounts WHERE id=?", (acc_id,))
    conn.commit()


async def fetch_account_works_cdp(conn: sqlite3.Connection, acc_id: int, *, cfg: dict[str, Any] | None = None) -> dict[str, Any]:
    """用专用 Chrome 打开对标账号主页（抖音/B站/YouTube），抓取最近作品并自动计算「几倍平时」。"""
    row = conn.execute("SELECT * FROM benchmark_accounts WHERE id=?", (acc_id,)).fetchone()
    if not row:
        raise ValueError("对标账号不存在")
    cfg = cfg or config.load_config()
    st = cdp.chrome_status(cfg)
    if not st["online"]:
        st = cdp.ensure_chrome(cfg, foreground=False)

    url = str(row["url"] or "").strip()
    plat = str(row["platform"] or "douyin")
    name = str(row["name"] or "对标账号")
    if not url.startswith("http"):
        raise ValueError("请填完整主页链接（https:// 开头）")

    scraped: list[dict[str, Any]] = []
    async with cdp.CDPClient(st["ws_url"], cmd_timeout=18.0) as client:
        async def fn(sid: str, _tid: str) -> None:
            await asyncio.sleep(4.5)
            if plat == "bilibili":
                # B 站 UP 主空间：支持直接从 space.bilibili.com/<mid> 提取
                m_mid = re.search(r"space\.bilibili\.com/(\d+)", url)
                if m_mid:
                    data = await client.evaluate(
                        sid,
                        f"fetch('https://api.bilibili.com/x/space/wbi/arc/search?mid={m_mid.group(1)}&ps=20&pn=1',{{credentials:'include'}}).then(r=>r.json()).catch(()=>null)",
                    )
                    for v in (((data or {}).get("data") or {}).get("list") or {}).get("vlist") or []:
                        scraped.append({
                            "title": str(v.get("title") or "").strip(),
                            "url": f"https://www.bilibili.com/video/{v.get('bvid')}",
                            "likes": int(v.get("play") or 0),
                            "published": datetime.fromtimestamp(int(v.get("created") or 0), tz=CN).strftime("%Y-%m-%d") if v.get("created") else "",
                        })
            if not scraped:
                # 通用 DOM 抓取（适配抖音主页 / YouTube 频道页 / 小红书主页）
                dom_items = await client.evaluate(
                    sid,
                    """(() => {
                      const out = [];
                      const seen = new Set();
                      for (const a of document.querySelectorAll('a[href*="/video/"], a[href*="/watch?v="], a[href*="/explore/"]')) {
                        const href = a.href || '';
                        if (!href || seen.has(href)) continue;
                        const text = (a.innerText || a.getAttribute('title') || '').replace(/\\s+/g, ' ').trim();
                        if (text.length < 4) continue;
                        seen.add(href);
                        out.push({ title: text.slice(0, 90), url: href });
                        if (out.length >= 16) break;
                      }
                      return out;
                    })()""",
                )
                for it in dom_items or []:
                    nums = re.findall(r"(\d+(?:\.\d+)?)\s*(万|w|k)?", it["title"], re.I)
                    likes = 0
                    if nums:
                        val = float(nums[-1][0])
                        u = nums[-1][1].lower()
                        likes = int(val * (10000 if u in ("万", "w") else 1000 if u == "k" else 1))
                    scraped.append({"title": it["title"], "url": it["url"], "likes": likes, "published": datetime.now(CN).strftime("%Y-%m-%d")})

        await client.with_tab(url, fn, wait_s=0.0)

    ts = db.now_iso()
    med = median([x["likes"] for x in scraped if x["likes"] > 0]) if any(x["likes"] > 0 for x in scraped) else 0
    saved = 0
    for it in scraped:
        mult = round(it["likes"] / med, 1) if med > 0 and it["likes"] > 0 else 1.0
        exists = conn.execute("SELECT id FROM benchmark_items WHERE url=?", (it["url"],)).fetchone()
        if exists:
            conn.execute("UPDATE benchmark_items SET likes=?, multiple=? WHERE id=?", (it["likes"], mult, exists["id"]))
        else:
            conn.execute(
                """INSERT INTO benchmark_items(title, author, platform, url, published, likes, multiple, mainline, why_hit, body, created_at)
                   VALUES (?,?,?,?,?,?,?,'','','',?)""",
                (it["title"], name, plat, it["url"], it["published"], it["likes"], mult, ts),
            )
        saved += 1
    now_str = datetime.now(CN).strftime("%m-%d %H:%M")
    conn.execute("UPDATE benchmark_accounts SET last_fetched_at=?, works_count=? WHERE id=?", (now_str, saved, acc_id))
    conn.commit()
    db.log_event(conn, "对标", plat, f"抓取 {name}", f"入库 {saved} 条")
    return {"ok": True, "fetched": saved, "name": name}


def ai_teardown_benchmark(
    conn: sqlite3.Connection,
    *,
    title: str,
    author: str = "",
    url: str = "",
    transcript: str = "",
    positioning_text: str = "",
) -> dict[str, Any]:
    """调用本机 Coding Agent 生成结构化《爆款拆解报告》并持久化到 SQLite benchmark_items。"""
    prompt = (
        f"{positioning_text}\n\n"
        f"请拆解这条对标视频：\n标题：{title}\n作者：{author or '未知'}\n链接：{url or '无'}\n"
        f"已有正文/逐字稿：\n{(transcript or '无逐字稿，请按标题与结构拆解')[:4500]}\n\n"
        "严格返回一个 JSON 对象，字段必须包含：\n"
        '- "mainline": 一句话主线（<=80字）\n'
        '- "why_hit": 3-4条为什么爆（换行列表）\n'
        '- "hooks": 可借用的2个开头钩子（数组）\n'
        '- "my_angle": 结合我方定位的切入角度（<=120字）\n'
        '- "markdown": 完整可读的 Markdown 拆解报告（含主线、为什么爆、结构节奏、我方怎么借题发挥）。'
    )
    res = ai.run_prompt(prompt)
    parsed = ai.extract_json_block(res["text"])
    if isinstance(parsed, dict):
        mainline = str(parsed.get("mainline") or "").strip()
        why_hit = parsed.get("why_hit") or ""
        if isinstance(why_hit, list):
            why_hit = "\n".join(f"- {x}" for x in why_hit)
        body = str(parsed.get("markdown") or "").strip() or f"## 主线\n{mainline}\n\n## 为什么爆\n{why_hit}\n\n## 我方切入\n{parsed.get('my_angle', '')}"
    else:
        mainline = title[:60]
        why_hit = ""
        body = res["text"]

    ts = db.now_iso()
    cur = conn.execute(
        """INSERT INTO benchmark_items(title, author, platform, url, published, likes, multiple, mainline, why_hit, body, created_at)
           VALUES (?,?,?,?,?,?,0,?,?,?,?)""",
        (title.strip(), author.strip() or "AI 拆解", "douyin", url.strip(), datetime.now(CN).strftime("%Y-%m-%d"), 0, mainline, str(why_hit), body, ts),
    )
    conn.commit()
    db.log_event(conn, "对标", f"{res['backend']}/{res['model']}", "AI 爆款拆解", title[:30])
    return {
        "ok": True,
        "id": f"db:{cur.lastrowid}",
        "mainline": mainline,
        "whyHit": str(why_hit),
        "body": body,
        "backend": res["backend"],
        "model": res["model"],
    }
