"""只读扫描本地 Obsidian 笔记库（兼容 Park 的 /Users/wendy/park-hands 及任意通用 Obsidian 目录）。"""
from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Any

from . import config

SKIP_DIRS = {".obsidian", ".git", ".trash", ".claude", ".codex", ".system", ".claudian", ".hermes", "node_modules"}
FRONTMATTER_RE = re.compile(r"\A---\s*\n.*?\n---\s*\n?", re.DOTALL)
MD_HEADING_RE = re.compile(r"^#\s+(.+)$", re.MULTILINE)


def _strip_frontmatter(text: str) -> str:
    return FRONTMATTER_RE.sub("", text).strip()


def _title_of(path: Path, body: str) -> str:
    m = MD_HEADING_RE.search(body)
    if m:
        return m.group(1).strip()[:120]
    name = path.stem
    name = re.sub(r"__[0-9a-f]{6,}$", "", name)
    return name[:120]


def _excerpt_of(body: str, limit: int = 220) -> str:
    lines = [ln.strip() for ln in body.splitlines() if ln.strip() and not ln.strip().startswith("#") and not ln.strip().startswith("![")]
    joined = " ".join(lines)
    joined = re.sub(r"\s+", " ", joined)
    return (joined[:limit] + "…") if len(joined) > limit else joined


def _scan_dir(root: Path, sub: Path, tag: str, limit: int = 25) -> list[dict[str, Any]]:
    if not sub.is_dir():
        return []
    files: list[Path] = []
    for p in sub.rglob("*.md"):
        if any(part in SKIP_DIRS or part.startswith(".") for part in p.relative_to(sub).parts):
            continue
        if p.name.startswith("_"):
            continue
        files.append(p)
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)

    out: list[dict[str, Any]] = []
    for p in files[:limit]:
        try:
            raw = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        body = _strip_frontmatter(raw)
        stat = p.stat()
        rel = str(p.relative_to(root))
        out.append({
            "id": rel,
            "tag": tag,
            "file": rel,
            "title": _title_of(p, body),
            "date": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
            "words": len(re.sub(r"\s+", "", body)),
            "excerpt": _excerpt_of(body),
            "body": body[:12000],
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
            counts[key] = sum(1 for p in d.rglob("*.md") if not p.name.startswith("_")) if d.is_dir() else 0
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
            # 通用 Obsidian 库兜底：扫描根目录最近更新的 md 文件
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
    body = _strip_frontmatter(target.read_text(encoding="utf-8", errors="replace"))
    return {
        "file": rel_path,
        "title": _title_of(target, body),
        "body": body,
        "words": len(re.sub(r"\s+", "", body)),
    }
