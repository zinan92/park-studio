"""只读扫描本地 Obsidian 笔记库（兼容任意标准 Obsidian 笔记目录）。

支持：
1. AI 日报按期/按条解析（快讯分区 + 视频更新 + 深读按 URL 挂载 + 本地日报管道原文匹配），严格对齐 xuanti 工作台体验。
2. 个人收藏 / Clippings / 原始输出 / K 线日报的只读扫描。
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from . import config

SKIP_DIRS = {".obsidian", ".git", ".trash", ".claude", ".codex", ".system", ".claudian", ".hermes", "node_modules"}
FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n?", re.DOTALL)
MD_HEADING_RE = re.compile(r"^#\s+(.+)$", re.MULTILINE)
DAILY_DAY_RE = re.compile(r"(20\d{2})-(\d{2})-(\d{2})|(\d{2})-(\d{2})-(\d{2})")
BULLET_RE = re.compile(r"^- \*\*(?P<src>.+?)\*\*\s*\|\s*(?P<rest>.+)$")
LINK_RE = re.compile(r"\[(?P<text>[^\]]+)\]\((?P<url>https?://[^)\s]+)\)")
HEADING_LINK_RE = re.compile(r"^###\s+\[(?P<text>[^\]]+)\]\((?P<url>https?://[^)\s]+)\)\s*$")
X_STATUS_RE = re.compile(r"/status(?:es)?/(\d+)")

ITEM_SECTIONS = ("快讯", "视频更新")
DEEP_SECTION = "深读"
SITES = (
    ("x.com", "X"),
    ("twitter.com", "X"),
    ("youtube.com", "YouTube"),
    ("youtu.be", "YouTube"),
    ("mp.weixin.qq.com", "公众号"),
    ("github.com", "GitHub"),
    ("douyin.com", "抖音"),
    ("xiaohongshu.com", "小红书"),
    ("bilibili.com", "B 站"),
)

# 缓存每一天 ~/park-io/_inbox/processed/<YY-MM-DD> 的 url_key -> Path 索引
_ORIG_CACHE: dict[tuple[str, float], dict[str, Path]] = {}


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    meta: dict[str, str] = {}
    for line in m.group(1).splitlines():
        found = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if found:
            val = found.group(2).strip()
            if val.startswith('"') and val.endswith('"'):
                try:
                    decoded = json.loads(val)
                    if isinstance(decoded, str):
                        val = decoded
                except ValueError:
                    val = val.strip('"')
            else:
                val = val.strip('"').strip("'")
            meta[found.group(1)] = val
    return meta, text[m.end():].strip()


def _strip_frontmatter(text: str) -> str:
    _, body = parse_frontmatter(text)
    return body


def _title_of(path: Path, body: str, meta: dict[str, str] | None = None) -> str:
    m = MD_HEADING_RE.search(body)
    if m:
        return re.sub(r"^文章标题[:：]\s*", "", m.group(1).strip())[:120]
    if meta and meta.get("title"):
        return re.sub(r"^文章标题[:：]\s*", "", meta["title"])[:120]
    name = re.sub(r"__[0-9a-f]{6,}$", "", path.stem)
    return name[:120]


def _excerpt_of(body: str, limit: int = 200) -> str:
    lines = [
        ln.strip()
        for ln in body.splitlines()
        if ln.strip() and not ln.strip().startswith("#") and not ln.strip().startswith("![") and not re.match(r"^source:\s", ln.strip())
    ]
    joined = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", " ".join(lines))
    joined = re.sub(r"[*_`>]+", "", joined)
    joined = re.sub(r"\s+", " ", joined).strip()
    return (joined[:limit] + "…") if len(joined) > limit else joined


def url_key(url: str | None) -> str:
    if not url:
        return ""
    parts = urlsplit(url.strip())
    host = parts.netloc.lower().removeprefix("www.").removeprefix("mobile.")
    if host in ("twitter.com", "x.com"):
        m = X_STATUS_RE.search(parts.path)
        if m:
            return f"x:{m.group(1)}"
        host = "x.com"
    if host in ("youtube.com", "m.youtube.com") and parts.query:
        v = re.search(r"(?:^|&)v=([^&]+)", parts.query)
        if v:
            return f"yt:{v.group(1)}"
    if host == "youtu.be":
        return f"yt:{parts.path.strip('/')}"
    return f"{host}{parts.path.rstrip('/')}"


def site_of(url: str | None) -> str:
    host = urlsplit(url or "").netloc.lower()
    return next((name for dom, name in SITES if host == dom or host.endswith("." + dom)), "网页" if host else "")


def _daily_day(name: str) -> str | None:
    m = DAILY_DAY_RE.search(name)
    if not m:
        return None
    if m.group(1):
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return f"20{m.group(4)}-{m.group(5)}-{m.group(6)}"


def _daily_edition(name: str) -> str:
    tail = DAILY_DAY_RE.sub("", Path(name).stem, count=1).strip("-_ ")
    return f"-{tail}" if tail else ""


def _issue_key(path: Path) -> str | None:
    day = _daily_day(path.name)
    if not day:
        return None
    return f"{day}{_daily_edition(path.name)}"


def _originals_index(items_root: Path | None, day: str) -> dict[str, Path]:
    if not items_root:
        return {}
    short_day = day[2:10] if len(day) >= 10 and day.startswith("20") else day[:8]
    candidates = [items_root / short_day, items_root / day[:10]]
    folder = next((c for c in candidates if c.is_dir()), None)
    if folder is None:
        return {}
    try:
        mtime = folder.stat().st_mtime
    except OSError:
        mtime = 0.0
    ck = (str(folder), mtime)
    if ck in _ORIG_CACHE:
        return _ORIG_CACHE[ck]

    index: dict[str, Path] = {}
    for p in folder.rglob("*.md"):
        if p.parent == folder:
            continue
        try:
            with p.open("r", encoding="utf-8", errors="replace") as fh:
                head = fh.read(4096)
        except OSError:
            continue
        meta, _ = parse_frontmatter(head if "\n---" in head else head + "\n---\n")
        u = meta.get("url") or meta.get("source")
        if u:
            index.setdefault(url_key(u), p)
    _ORIG_CACHE[ck] = index
    return index


def _item_id(urls: list[str], title: str) -> str:
    seed = urls[0] if urls else title
    return hashlib.sha1(seed.encode("utf-8")).hexdigest()[:10]


@dataclass
class _ParsedItem:
    section: str
    group: str
    author: str
    title: str
    urls: list[str]
    summary_lines: list[str] = field(default_factory=list)


def _parse_newsletter_markdown(markdown: str) -> tuple[str, list[dict[str, Any]], dict[str, str]]:
    title = ""
    parts: list[dict[str, Any]] = []
    deep_map: dict[str, str] = {}
    current_kind: str | None = None  # items | deep | other
    current_part: dict[str, Any] | None = None
    current_group_name = ""
    current_group: dict[str, Any] | None = None
    item: _ParsedItem | None = None
    deep_key: str | None = None

    def ensure_group(name: str) -> dict[str, Any]:
        nonlocal current_group
        assert current_part is not None
        for g in current_part["groups"]:
            if g["name"] == name:
                current_group = g
                return g
        g = {"name": name, "items": []}
        current_part["groups"].append(g)
        current_group = g
        return g

    def flush_item() -> None:
        nonlocal item
        if item is not None and current_part is not None:
            g = ensure_group(item.group)
            g["items"].append(item)
        item = None

    for raw in markdown.splitlines():
        line = raw.rstrip()
        if line.startswith("# ") and not title:
            title = line[2:].strip()
            continue
        if line.startswith("## "):
            flush_item()
            sec_name = line[3:].strip()
            base = sec_name.split("·")[0].strip()
            if base in ITEM_SECTIONS:
                current_kind = "items"
                current_part = {"name": base, "groups": []}
                parts.append(current_part)
            elif base == DEEP_SECTION:
                current_kind = "deep"
                current_part = None
            else:
                current_kind = "other"
                current_part = None
            current_group_name = ""
            current_group = None
            deep_key = None
            continue

        if current_kind == "deep":
            m = HEADING_LINK_RE.match(line)
            if m:
                deep_key = url_key(m.group("url"))
                deep_map[deep_key] = ""
            elif deep_key:
                if line.strip():
                    deep_map[deep_key] = (deep_map[deep_key] + "\n\n" + line.strip()).strip()
            continue

        if current_kind != "items" or current_part is None:
            continue

        if line.startswith("### "):
            flush_item()
            current_group_name = line[4:].strip()
            continue

        m = BULLET_RE.match(line)
        if m:
            flush_item()
            rest = m.group("rest")
            links = LINK_RE.findall(rest)
            it_title = links[0][0].strip() if links else rest.strip()
            urls = [u for _, u in links]
            item = _ParsedItem(
                section=current_part["name"],
                group=current_group_name,
                author=m.group("src").strip(),
                title=it_title,
                urls=urls,
            )
            continue

        if item is not None and line.strip():
            txt = line.strip()
            item.summary_lines.append(txt)
            for _, u in LINK_RE.findall(txt):
                if u not in item.urls:
                    item.urls.append(u)

    flush_item()
    return title, parts, deep_map


def list_newsletter_issues(cfg: dict[str, Any] | None = None, limit: int = 90) -> list[dict[str, Any]]:
    cfg = cfg or config.load_config()
    root = Path(str(cfg.get("obsidianPath") or "")).expanduser()
    folder = root / (cfg.get("obsidianFolders") or {}).get("newsletter", "006_ai daily newsletter")
    if not folder.is_dir():
        return []
    found: list[tuple[str, str, Path]] = []
    for p in folder.iterdir():
        if not p.is_file() or p.suffix.lower() != ".md" or p.name.startswith("."):
            continue
        key = _issue_key(p)
        if not key:
            continue
        found.append((_daily_day(p.name) or "", key, p))
    found.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return [
        {"day": key, "date": day, "path": p, "file": str(p.relative_to(root))}
        for day, key, p in found[:limit]
    ]


def parse_newsletter_issue(
    day: str | None = None,
    *,
    include_bodies: bool = False,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    cfg = cfg or config.load_config()
    issues = list_newsletter_issues(cfg)
    if not issues:
        return None
    days = [x["day"] for x in issues]
    picked = next((x for x in issues if x["day"] == day), issues[0])
    raw_text = picked["path"].read_text(encoding="utf-8", errors="replace")
    _, body = parse_frontmatter(raw_text)
    raw_title, raw_parts, deep_map = _parse_newsletter_markdown(body)

    items_root_raw = str(cfg.get("newsletterItemsPath") or "").strip()
    items_root = Path(items_root_raw).expanduser() if items_root_raw else None
    orig_index = _originals_index(items_root, picked["date"])

    out_parts: list[dict[str, Any]] = []
    total_items = 0
    for p in raw_parts:
        out_groups: list[dict[str, Any]] = []
        part_count = 0
        for g in p["groups"]:
            out_items: list[dict[str, Any]] = []
            for it in g["items"]:
                keys = [url_key(u) for u in it.urls if u]
                deep_text = next((deep_map[k] for k in keys if k in deep_map and deep_map[k]), "")
                orig_path = next((orig_index[k] for k in keys if k in orig_index), None)
                primary_url = it.urls[0] if it.urls else ""
                summary = "\n".join(it.summary_lines).strip()
                # 去掉 summary 里的 markdown 链接噪音，保留纯文本摘要
                summary_clean = re.sub(r"\[([^\]]+)\]\(https?://[^)]+\)", r"\1", summary)
                item_obj: dict[str, Any] = {
                    "id": _item_id(it.urls, it.title),
                    "author": it.author,
                    "site": site_of(primary_url),
                    "title": it.title,
                    "url": primary_url,
                    "summary": summary_clean,
                    "group": it.group,
                    "section": it.section,
                    "day": picked["date"],
                    "issueDay": picked["day"],
                    "hasDeep": bool(deep_text),
                    "hasOriginal": orig_path is not None,
                }
                if include_bodies:
                    item_obj["deep"] = deep_text
                    if orig_path is not None:
                        try:
                            _, ob = parse_frontmatter(orig_path.read_text(encoding="utf-8", errors="replace"))
                            item_obj["original"] = ob
                        except OSError:
                            item_obj["original"] = ""
                    else:
                        item_obj["original"] = ""
                out_items.append(item_obj)
            if out_items:
                out_groups.append({"name": g["name"], "items": out_items})
                part_count += len(out_items)
        if out_groups:
            out_parts.append({"name": p["name"], "count": part_count, "groups": out_groups})
            total_items += part_count

    display_title = f"每日 AI 情报 · {picked['day']}"
    return {
        "day": picked["day"],
        "date": picked["date"],
        "latest": picked["day"] == days[0],
        "title": display_title,
        "rawTitle": raw_title,
        "file": picked["file"],
        "days": days,
        "total": total_items,
        "parts": out_parts,
    }


def read_newsletter_item(day: str | None, item_id: str, *, cfg: dict[str, Any] | None = None) -> dict[str, Any] | None:
    issue = parse_newsletter_issue(day, include_bodies=False, cfg=cfg)
    if not issue:
        return None
    # 重新解析该期以提取 deep 与 original（仅读命中的那 1 个原文文件，毫秒级）
    cfg = cfg or config.load_config()
    issues = list_newsletter_issues(cfg)
    picked = next((x for x in issues if x["day"] == issue["day"]), None)
    if not picked:
        return None
    _, body = parse_frontmatter(picked["path"].read_text(encoding="utf-8", errors="replace"))
    _, _, deep_map = _parse_newsletter_markdown(body)
    items_root_raw = str(cfg.get("newsletterItemsPath") or "").strip()
    items_root = Path(items_root_raw).expanduser() if items_root_raw else None
    orig_index = _originals_index(items_root, picked["date"])

    for p in issue["parts"]:
        for g in p["groups"]:
            for it in g["items"]:
                if it["id"] == item_id:
                    k = url_key(it.get("url"))
                    deep_text = deep_map.get(k, "")
                    orig_text = ""
                    orig_path = orig_index.get(k)
                    if orig_path is not None:
                        try:
                            _, ob = parse_frontmatter(orig_path.read_text(encoding="utf-8", errors="replace"))
                            # 若原文开头重复了与 # 标题相同的第一行，保留自然 Markdown 交给前端渲染
                            orig_text = ob
                        except OSError:
                            orig_text = ""
                    return {**it, "deep": deep_text, "original": orig_text}
    return None


def _scan_dir(root: Path, sub: Path, tag: str, limit: int = 25) -> list[dict[str, Any]]:
    if not sub.is_dir():
        return []
    files: list[Path] = []
    for p in sub.rglob("*.md"):
        if any(part in SKIP_DIRS or part.startswith(".") for part in p.relative_to(sub).parts):
            continue
        if p.name.startswith("_") or p.name.lower() == "readme.md":
            continue
        files.append(p)
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)

    out: list[dict[str, Any]] = []
    for p in files[:limit]:
        try:
            raw = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        meta, body = parse_frontmatter(raw)
        stat = p.stat()
        rel = str(p.relative_to(root))
        url = meta.get("url") or meta.get("source") or ""
        if url and not re.match(r"^https?://", url):
            url = ""
        out.append({
            "id": rel,
            "tag": tag,
            "file": rel,
            "title": _title_of(p, body, meta),
            "author": meta.get("author") or "",
            "site": site_of(url) if url else "",
            "url": url,
            "date": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
            "words": len(re.sub(r"\s+", "", body)),
            "excerpt": _excerpt_of(body),
            "body": body[:16000],
        })
    return out


def vault_status(cfg: dict[str, Any] | None = None) -> dict[str, Any]:
    cfg = cfg or config.load_config()
    root = Path(str(cfg.get("obsidianPath") or "")).expanduser()
    exists = root.is_dir()
    folders = cfg.get("obsidianFolders") or {}
    counts: dict[str, int] = {}
    if exists:
        for key, rel in folders.items():
            d = root / rel
            counts[key] = sum(1 for p in d.rglob("*.md") if not p.name.startswith("_") and p.name.lower() != "readme.md") if d.is_dir() else 0
    return {
        "path": str(root),
        "mounted": exists,
        "counts": counts,
    }


def scan_bucket(bucket: str, *, limit: int = 20, cfg: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    cfg = cfg or config.load_config()
    root = Path(str(cfg.get("obsidianPath") or "")).expanduser()
    if not root.is_dir():
        return []
    folders = cfg.get("obsidianFolders") or {}

    if bucket == "newsletter":
        return _scan_dir(root, root / folders.get("newsletter", "006_ai daily newsletter"), "AI 日报", limit=limit)
    if bucket == "saved":
        a = _scan_dir(root, root / folders.get("saved", "002_个人收藏"), "个人收藏", limit=limit)
        b = _scan_dir(root, root / folders.get("clippings", "002_clippings"), "剪藏", limit=limit)
        merged = sorted(a + b, key=lambda x: x["date"], reverse=True)
        return merged[:limit]
    if bucket == "writing":
        items = _scan_dir(root, root / folders.get("writing", "003_park原始输出"), "原始输出", limit=limit)
        if not items:
            items = _scan_dir(root, root, "Obsidian", limit=limit)
        return items
    if bucket == "kline":
        return _scan_dir(root, root / folders.get("kline", "007_kline daily newsletter"), "K 线日报", limit=limit)
    return _scan_dir(root, root, "Obsidian", limit=limit)


def read_note(rel_path: str, *, cfg: dict[str, Any] | None = None) -> dict[str, Any] | None:
    cfg = cfg or config.load_config()
    root = Path(str(cfg.get("obsidianPath") or "")).expanduser().resolve()
    target = (root / rel_path).resolve()
    if not str(target).startswith(str(root)) or not target.is_file():
        return None
    meta, body = parse_frontmatter(target.read_text(encoding="utf-8", errors="replace"))
    return {
        "file": rel_path,
        "title": _title_of(target, body, meta),
        "body": body,
        "words": len(re.sub(r"\s+", "", body)),
    }
