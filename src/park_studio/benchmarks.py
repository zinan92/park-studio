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
        structured = None
        kv_row = conn.execute("SELECT v FROM kv WHERE k=?", (f"bm_report:{r['id']}",)).fetchone()
        if kv_row and kv_row["v"]:
            try:
                structured = json.loads(kv_row["v"])
            except Exception:
                structured = None
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
            "structured": structured,
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


TEARDOWN_LENSES = [
    "个人经历",
    "情绪发泄",
    "现实痛点",
    "认知反差",
    "拆解过程",
    "给建议",
    "顺势聊结果",
]

MODE_DEFAULT_MODULES: dict[str, list[str]] = {
    "lite": ["mainline"],
    "standard": ["mainline", "opening", "segments", "angles7"],
    "deep": ["mainline", "opening", "segments", "angles7", "agenda", "pacing"],
}


def _build_teardown_prompt(
    *,
    title: str,
    author: str,
    url: str,
    transcript: str,
    positioning_text: str,
    mode: str,
    modules: list[str],
    custom_prompt: str,
) -> str:
    body_text = (transcript or "无逐字稿，请按标题与结构拆解")[:5500]
    if mode == "custom" and custom_prompt.strip():
        rendered = (
            custom_prompt.strip()
            .replace("{title}", title)
            .replace("{author}", author or "未知")
            .replace("{url}", url or "无")
            .replace("{transcript}", body_text)
            .replace("{positioning}", positioning_text or "无")
        )
        return (
            f"{rendered}\n\n"
            "请尽量返回 JSON 对象（若方便解析），包含 mainline（一句话主线）、why_hit（爆款原因列表）和 markdown（完整拆解报告正文）；"
            "也可直接输出结构化 Markdown。"
        )

    eff_mods = set(modules or MODE_DEFAULT_MODULES.get(mode, MODE_DEFAULT_MODULES["standard"]))
    schema_lines = [
        '- "mainline": 一句话主线（<=80字，讲清这条视频真正打中的核心观点）',
        '- "why_hit": 3-4 条为什么爆（字符串数组，每条具体到情绪/反差/结构，不写空话）',
        '- "hooks": 可借用的 2-3 个前 5 秒开头钩子（字符串数组）',
        '- "my_angle": 结合我方定位的一句话切入建议（<=120字）',
    ]
    if "opening" in eff_mods:
        schema_lines += [
            '- "opening": 开头 15 秒是怎么抓人的（对象：{"hook":"前3秒怎么打断滑动","promise":"给观众什么承诺"}）',
        ]
    if "segments" in eff_mods:
        schema_lines += [
            '- "segments": 全片结构分节数组（3-5 项，每项 {"part":"段落名","role":"这一段在留存/转化里的作用","summary":"1句话内容"}）',
        ]
    if "angles7" in eff_mods:
        schema_lines += [
            '- "universal_truth": 剥掉原视频外衣后，底层共通的 1 句核心真相（<=60字）',
            '- "angles": 基于 Dan Koe Find your angle 方法论，为我方生成的 7 个可换切入角度数组，lens 必须依次对应 ['
            + "、".join(TEARDOWN_LENSES)
            + ']；每项严格包含 {"lens":"角度名","say":"80-130字第一人称可直接开口念的短视频开头（口语自然、无废话、像真人在说话）","text":"这个角度后续如何展开（1-2句）","needs_own":"需要创作者自己补上的真实案例/数字/细节（没有就留空字符串）"}',
            '- "strongest": 从上面 7 个角度里挑出最适合我方定位的 Top 2（数组，每项 {"lens":"角度名","index":0到6的整数,"why":"为什么这两个最能打、不超过50字"}）',
        ]
    if "agenda" in eff_mods:
        schema_lines += [
            '- "agenda": 变现与人设动机拆解（对象：{"persona":"他在立什么人设","funnel":"暗藏的私域/产品/课程引导路径","risk":"直接照抄的雷区"}）',
        ]
    if "pacing" in eff_mods:
        schema_lines += [
            '- "pacing": 节奏与画面设计（对象：{"rhythm":"信息密度与转折节奏","visuals":"最值得抄的画面/字幕/B-roll 手法"}）',
        ]
    schema_lines.append('- "markdown": 完整可读的 Markdown 拆解报告总结（可选，便于归档）。')

    return (
        f"{positioning_text}\n\n"
        f"请以资深短视频内容策划视角拆解这条对标视频（模式：{mode}）：\n"
        f"标题：{title}\n作者：{author or '未知'}\n链接：{url or '无'}\n"
        f"已有正文/逐字稿：\n{body_text}\n\n"
        "严格返回一个合法 JSON 对象（不要加多余解释），字段如下：\n"
        + "\n".join(schema_lines)
    )


def _format_teardown_markdown(parsed: dict[str, Any], mode: str) -> str:
    parts: list[str] = []
    if parsed.get("mainline"):
        parts.append(f"## 主线\n{parsed['mainline']}")
    why = parsed.get("why_hit")
    if isinstance(why, list) and why:
        parts.append("## 为什么爆\n" + "\n".join(f"- {x}" for x in why))
    elif isinstance(why, str) and why.strip():
        parts.append(f"## 为什么爆\n{why.strip()}")

    opening = parsed.get("opening")
    if isinstance(opening, dict) and (opening.get("hook") or opening.get("promise")):
        parts.append(
            "## 开头抓手\n"
            + (f"- **前 3 秒钩子**：{opening.get('hook', '')}\n" if opening.get("hook") else "")
            + (f"- **核心承诺**：{opening.get('promise', '')}" if opening.get("promise") else "")
        )

    segs = parsed.get("segments")
    if isinstance(segs, list) and segs:
        lines = [
            f"- **{s.get('part', '')}**（{s.get('role', '')}）：{s.get('summary', '')}"
            for s in segs if isinstance(s, dict)
        ]
        if lines:
            parts.append("## 结构分节\n" + "\n".join(lines))

    if parsed.get("universal_truth"):
        parts.append(f"## 底层真相\n> {parsed['universal_truth']}")

    angles = parsed.get("angles")
    if isinstance(angles, list) and angles:
        alines = []
        for idx, a in enumerate(angles, 1):
            if not isinstance(a, dict):
                continue
            alines.append(
                f"### {idx}. {a.get('lens', '')}\n"
                f"> {a.get('say', '')}\n\n"
                f"{a.get('text', '')}"
                + (f"\n- *需补个人素材*：{a['needs_own']}" if a.get("needs_own") else "")
            )
        if alines:
            parts.append("## 7 个可换切入角度（Dan Koe）\n" + "\n\n".join(alines))

    agenda = parsed.get("agenda")
    if isinstance(agenda, dict) and any(agenda.values()):
        parts.append(
            "## 变现与人设动机\n"
            + (f"- **人设**：{agenda.get('persona', '')}\n" if agenda.get("persona") else "")
            + (f"- **转化路径**：{agenda.get('funnel', '')}\n" if agenda.get("funnel") else "")
            + (f"- **照抄雷区**：{agenda.get('risk', '')}" if agenda.get("risk") else "")
        )

    pacing = parsed.get("pacing")
    if isinstance(pacing, dict) and any(pacing.values()):
        parts.append(
            "## 节奏与画面设计\n"
            + (f"- **节奏**：{pacing.get('rhythm', '')}\n" if pacing.get("rhythm") else "")
            + (f"- **画面/字幕手法**：{pacing.get('visuals', '')}" if pacing.get("visuals") else "")
        )

    hooks = parsed.get("hooks")
    if isinstance(hooks, list) and hooks:
        parts.append("## 可借用开头钩子\n" + "\n".join(f"- {h}" for h in hooks))

    if parsed.get("my_angle"):
        parts.append(f"## 我方切入建议\n{parsed['my_angle']}")

    if parts:
        return "\n\n".join(parts)
    return str(parsed.get("markdown") or "").strip()


def ai_teardown_benchmark(
    conn: sqlite3.Connection,
    *,
    title: str,
    author: str = "",
    url: str = "",
    transcript: str = "",
    positioning_text: str = "",
    mode: str = "",
    modules: list[str] | None = None,
    custom_prompt: str = "",
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """调用本机 Coding Agent / API 生成 3 层可配置《爆款拆解报告》（支持 Dan Koe 7 角度）并持久化到 SQLite。"""
    cfg = cfg or config.load_config()
    eff_mode = (mode or str(cfg.get("teardownMode") or "standard")).strip().lower()
    if eff_mode not in ("lite", "standard", "deep", "custom"):
        eff_mode = "standard"
    eff_modules = list(modules) if modules is not None else (
        list(cfg.get("teardownModules") or MODE_DEFAULT_MODULES["standard"])
        if eff_mode == "custom"
        else list(MODE_DEFAULT_MODULES.get(eff_mode, MODE_DEFAULT_MODULES["standard"]))
    )
    eff_custom = custom_prompt if custom_prompt else str(cfg.get("teardownCustomPrompt") or "")

    prompt = _build_teardown_prompt(
        title=title,
        author=author,
        url=url,
        transcript=transcript,
        positioning_text=positioning_text,
        mode=eff_mode,
        modules=eff_modules,
        custom_prompt=eff_custom,
    )
    res = ai.run_prompt(prompt, cfg=cfg)
    parsed = ai.extract_json_block(res["text"])
    structured: dict[str, Any] = {"mode": eff_mode, "modules": eff_modules}
    if isinstance(parsed, dict):
        mainline = str(parsed.get("mainline") or "").strip()
        why_hit = parsed.get("why_hit") or ""
        if isinstance(why_hit, list):
            why_hit = "\n".join(f"- {x}" for x in why_hit)
        structured.update({k: v for k, v in parsed.items() if k != "markdown"})
        body = _format_teardown_markdown(parsed, eff_mode) or str(parsed.get("markdown") or "").strip()
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
    rid = cur.lastrowid
    conn.execute(
        "INSERT OR REPLACE INTO kv(k, v) VALUES (?, ?)",
        (f"bm_report:{rid}", json.dumps(structured, ensure_ascii=False)),
    )
    conn.commit()
    db.log_event(conn, "对标", f"{res['backend']}/{res['model']}", f"AI 拆解({eff_mode})", title[:30])
    return {
        "ok": True,
        "id": f"db:{rid}",
        "mode": eff_mode,
        "mainline": mainline,
        "whyHit": str(why_hit),
        "body": body,
        "structured": structured,
        "backend": res["backend"],
        "model": res["model"],
    }
