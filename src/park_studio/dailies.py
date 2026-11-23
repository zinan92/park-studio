"""搞钱日报（Pete 商业机会卡/流量卡 + 个人收藏/剪藏按天聚合）与开发日报（本地 Git 仓库真实变更日志）。

严格对齐 topic-studio 管理员版的信源结构与字段，100% 本地只读，零外部服务器依赖。
"""
from __future__ import annotations

import json
import re
import sqlite3
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

from . import config, vault

CN = timezone(timedelta(hours=8))
PETE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
PETE_IMAGE_MAX = 4_000_000

_LINE_HEAD = re.compile(r"^\*\*这条能带来什么[：:]")
_LINE_LINK = re.compile(r"^原?链接[：:]")
_LINE_RESULT = re.compile(r"^\*\*结果[：:]\s*\*\*\s*(.+)$")
_LINE_SEC = re.compile(r"^\*\*([^*\n]{1,30}?)[：:]\s*\*\*\s*(.*)$")
_STAT = re.compile(r"^([$¥￥]?\d[\d,.]*\s*(?:万|亿|[kKMw])?%?\+?(?:\s*(?:元|张|件|套|个|条)(?![一-鿿]))?(?:\s*/\s*[天月年])?)\s*(.*)$")
_STAT_URL = re.compile(r"\s*(https?://\S+)\s*$")
_STAT_MDLINK = re.compile(r"\s*\[[^\]]*\]\((https?://[^)\s]+)\)\s*$")
_REFERENCE_IMAGE = re.compile(r"TrustMRR|同种生意", re.I)

_WORDS = (
    ("增长", "增长"), ("成本", "成本"), ("MRR", "MRR"), ("收入", "收入"), ("营收", "收入"),
    ("成交", "成交"), ("播放", "播放"), ("浏览", "浏览"), ("曝光", "曝光"), ("收藏", "收藏"),
    ("点赞", "点赞"), ("star", "Star"), ("注册", "注册"), ("粉", "涨粉"),
)
_MONEY_WORDS = {"收入", "MRR", "成交"}
_TRAFFIC_WORDS = {"播放", "浏览", "曝光", "收藏", "点赞", "Star", "注册", "涨粉"}
_FILLER = re.compile(r"[（(][^）)]*[）)]|《[^》]*》|该帖|该片|帖文自述|作者自述|视频口述|作者|帖文|数量|同上")
_FLOW_KEYS = {"放哪一格": "放哪一格", "适合": "适合谁", "前置条件": "前置条件"}


def _short_label(label: str) -> str:
    plain = re.sub(r"[（(][^）)]*[）)]", "", label)
    low = plain.lower()
    for key, word in _WORDS:
        if key.lower() in low:
            return word
    return re.sub(r"\s+", " ", _FILLER.sub("", plain)).strip()[:12]


def _rank_stat(r: dict[str, Any]) -> int:
    if r["label"] in _MONEY_WORDS or (r["value"][:1] in "$¥￥" and r["label"] not in ("成本", "增长")):
        return 0
    return 1 if r["label"] in _TRAFFIC_WORDS else 2


def _parse_stat(item: str) -> dict[str, Any]:
    url = _STAT_MDLINK.search(item) or _STAT_URL.search(item)
    if url:
        item = item[: url.start()].strip()
    m = _STAT.match(item)
    return {
        "value": m.group(1).strip() if m else item,
        "label": _short_label(m.group(2).strip()) if m else "",
        "url": url.group(1) if url else None,
    }


def layout_moneycard(body: str) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    sections: list[dict[str, str]] = []
    for line in (body or "").splitlines():
        text = line.strip()
        if _LINE_HEAD.match(text) or _LINE_LINK.match(text):
            continue
        m = _LINE_RESULT.match(text)
        if m:
            results += [_parse_stat(it) for it in re.split(r"\s*[｜|]\s*", m.group(1).strip()) if it]
            continue
        m = _LINE_SEC.match(text)
        if m:
            sections.append({"label": m.group(1).strip(), "text": m.group(2).strip()})
        elif sections:
            sections[-1]["text"] += "\n" + line
        elif text:
            sections.append({"label": "", "text": line})
    for sec in sections:
        sec["text"] = re.sub(r"\n{3,}", "\n\n", sec["text"]).strip()
    proof = next((s for s in sections if s["label"].startswith("已证明")), None)
    has_target = any(s["label"] == "目标客户" for s in sections)
    rest: list[dict[str, str]] = []
    for s in sections:
        if s is proof or s["label"].startswith("没证明") or not s["text"]:
            continue
        if s["label"] == "钱从谁那来":
            if has_target:
                continue
            s = {**s, "label": "目标客户"}
        rest.append(s)
    rest.sort(key=lambda s: 0 if s["label"] == "目标客户" else 1)
    results.sort(key=_rank_stat)
    return {"results": results[:4], "proof": None if results else proof, "sections": rest}


def _resolve_pete_image(raw_path: str, pics_root: Path) -> Path | None:
    if not pics_root.is_dir():
        return None
    cand = Path(raw_path).expanduser()
    if not cand.is_file():
        # 兼容 ~/park-io/011_pete/图/... 与 vault/011_pete/图/... 的不同前缀
        m = re.search(r"011_pete/图/(.+)$", raw_path)
        if m:
            cand = pics_root / m.group(1)
        else:
            cand = pics_root / Path(raw_path).name
    try:
        resolved = cand.resolve()
    except OSError:
        return None
    if resolved.suffix.lower() not in PETE_EXT or not resolved.is_file():
        return None
    if pics_root.resolve() not in resolved.parents:
        return None
    if resolved.stat().st_size > PETE_IMAGE_MAX:
        return None
    return resolved


def _parse_pete_card(block: str, day6: str, root: Path, pics_root: Path) -> dict[str, Any] | None:
    head, _, rest = block.partition("\n")
    m = re.match(r"^\s*(\d{1,2})[.、]\s*【([^】]*)】\s*(.+?)\s*$", head)
    if not m:
        return None
    verdict = next((v for v in ("值得试", "观察") if m.group(2).startswith(v)), None)
    if verdict is None:
        return None
    images: list[dict[str, str]] = []
    body_lines: list[str] = []
    in_pics = False
    for line in rest.splitlines():
        if re.match(r"^(?:[-*]\s*)?(?:\*\*)?(?:配图|样图)", line.strip()):
            in_pics = True
            continue
        if in_pics:
            pm = re.match(r"^\s*\d+[.)]\s*`([^`]+)`\s*(?:（(.*)）)?\s*$", line)
            if pm:
                caption = (pm.group(2) or "").strip()
                if not _REFERENCE_IMAGE.search(caption):
                    img = _resolve_pete_image(pm.group(1), pics_root)
                    if img is not None:
                        rel = str(img.relative_to(pics_root.resolve()))
                        images.append({"src": f"/api/source/pete-image?path={quote(rel)}", "caption": caption})
                continue
            if not line.strip():
                continue
            in_pics = False
        if re.match(r"^\s*内部[：:]", line) or line.strip() == "---":
            continue
        body_lines.append(line)
    text = re.sub(r"\n{3,}", "\n\n", "\n".join(body_lines)).strip()
    url_m = re.search(r"^原?链接[：:]\s*(https?://[^\s｜|]+)", text, re.M)
    hl_m = re.search(r"^\*\*这条能带来什么[：:](.+?)\*\*\s*$", text, re.M)
    day_iso = f"20{day6[:2]}-{day6[2:4]}-{day6[4:]}"
    return {
        "id": f"pete:{day6}:{m.group(1)}",
        "day": day_iso,
        "verdict": verdict,
        "title": m.group(3).strip(),
        "headline": hl_m.group(1).strip() if hl_m else "",
        "url": url_m.group(1) if url_m else "",
        "body": text,
        "images": images,
        **layout_moneycard(text),
    }


def _parse_pete_flow_card(block: str, day6: str, root: Path, pics_root: Path) -> dict[str, Any] | None:
    head, _, rest = block.partition("\n")
    m = re.match(r"^\s*(\d{1,2})[.、]", head)
    if not m:
        return None
    fields: dict[str, str] = {}
    results: list[str] = []
    images: list[dict[str, str]] = []
    for line in rest.splitlines():
        text = re.sub(r"^【流量卡】\s*", "", line.strip())
        if text.startswith("**结果"):
            results.append(text)
            continue
        km = re.match(r"^([^：:]{1,8})[：:]\s*(.*)$", text)
        if not km:
            continue
        key, val = km.group(1).strip(), km.group(2).strip()
        if key == "样片/样图":
            for raw in re.findall(r"`([^`]+)`", val):
                img = _resolve_pete_image(raw, pics_root)
                if img is not None:
                    rel = str(img.relative_to(pics_root.resolve()))
                    images.append({"src": f"/api/source/pete-image?path={quote(rel)}", "caption": ""})
        else:
            fields.setdefault(key, val)
    title = fields.get("标题", "")
    if not title:
        return None
    link = fields.get("原链接", "")
    url_m = re.search(r"https?://[^\s｜|]+", link)
    more = link[url_m.end():].strip(" ｜|") if url_m else ""
    body_parts = results + [f"**{label}：** {fields[k]}" for k, label in _FLOW_KEYS.items() if fields.get(k)]
    if more:
        body_parts.append(f"**另见：** {more}")
    text = "\n\n".join(body_parts)
    day_iso = f"20{day6[:2]}-{day6[2:4]}-{day6[4:]}"
    return {
        "id": f"pete:{day6}:f{m.group(1)}",
        "day": day_iso,
        "verdict": "流量卡",
        "title": title,
        "headline": fields.get("一句话", ""),
        "url": url_m.group(0) if url_m else "",
        "body": text,
        "images": images,
        **layout_moneycard(text),
    }


def pete_dir(cfg: dict[str, Any] | None = None) -> Path:
    cfg = cfg or config.load_config()
    root = Path(str(cfg.get("obsidianPath") or "")).expanduser()
    rel = (cfg.get("obsidianFolders") or {}).get("pete", "011_pete")
    return root / rel


def scan_pete_cards(cfg: dict[str, Any] | None = None, *, limit_days: int = 60) -> list[dict[str, Any]]:
    folder = pete_dir(cfg)
    if not folder.is_dir():
        return []
    pics_root = folder / "图"
    out: list[dict[str, Any]] = []
    files = sorted(folder.glob("*.md"), reverse=True)
    for path in files:
        m = re.match(r"^(?:20)?(\d{6})\.md$", path.name)
        if not m:
            continue
        day6 = m.group(1)
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for head, parser in (("一", _parse_pete_card), ("二", _parse_pete_flow_card)):
            sec = re.search(rf"^## {head}、[^\n]*\n(.*?)(?=^## |\Z)", text, re.M | re.S)
            if not sec:
                continue
            for block in re.split(r"^### ", sec.group(1), flags=re.M)[1:]:
                card = parser(block, day6, folder, pics_root)
                if card:
                    out.append(card)
    out.sort(key=lambda c: (c["day"], c["id"]), reverse=True)
    return out


def _saved_item_day(path: Path, meta: dict[str, str]) -> str:
    # 1. 文件名前缀 YYMMDD_...（如 261120_X_...）
    m = re.match(r"^(\d{2})(\d{2})(\d{2})_", path.name)
    if m:
        return f"20{m.group(1)}-{m.group(2)}-{m.group(3)}"
    # 2. frontmatter created / date
    for k in ("created", "date", "saved_at"):
        val = str(meta.get(k) or "").strip()
        dm = re.match(r"^(\d{4}-\d{2}-\d{2})", val)
        if dm:
            return dm.group(1)
    # 3. 文件修改日期兜底
    return datetime.fromtimestamp(path.stat().st_mtime).strftime("%Y-%m-%d")


def _load_card_states(conn: sqlite3.Connection | None) -> dict[str, str]:
    if conn is None:
        return {}
    row = conn.execute("SELECT v FROM kv WHERE k='moneycard_states'").fetchone()
    if not row:
        return {}
    try:
        data = json.loads(row["v"])
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def set_card_state(conn: sqlite3.Connection, card_id: str, state: str) -> dict[str, str]:
    if state not in ("ok", "wait", "out"):
        raise ValueError("无效审核状态")
    states = _load_card_states(conn)
    states[card_id] = state
    conn.execute("INSERT OR REPLACE INTO kv(k, v) VALUES ('moneycard_states', ?)", (json.dumps(states, ensure_ascii=False),))
    conn.commit()
    return states


def get_saved_daily(
    day: str | None = None,
    *,
    conn: sqlite3.Connection | None = None,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """搞钱日报一天一期（严格对齐 topic-studio 管理员版：Pete 商业机会卡 + Park 个人收藏/剪藏）。"""
    cfg = cfg or config.load_config()
    root = Path(str(cfg.get("obsidianPath") or "")).expanduser()
    folders = cfg.get("obsidianFolders") or {}

    states = _load_card_states(conn)
    cards = scan_pete_cards(cfg)
    card_urls = {vault.url_key(c["url"]) for c in cards if c.get("url")}

    by_day: dict[str, dict[str, list[dict[str, Any]]]] = {}
    for c in cards:
        c_view = {**c, "state": states.get(c["id"], "ok")}
        by_day.setdefault(c["day"], {"cards": [], "items": []})["cards"].append(c_view)

    # 扫描 002_个人收藏 与 002_clippings（最多近 120 篇以保证极速响应）
    for key, tag in (("saved", "收藏"), ("clippings", "剪下")):
        sub = root / folders.get(key, "002_个人收藏" if key == "saved" else "002_clippings")
        if not sub.is_dir():
            continue
        files = [p for p in sub.glob("*.md") if p.is_file() and not p.name.startswith(".") and p.name.lower() != "readme.md"]
        files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        for p in files[:100]:
            try:
                raw = p.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            meta, body = vault.parse_frontmatter(raw)
            url = meta.get("url") or meta.get("source") or ""
            if url and not re.match(r"^https?://", url):
                url = ""
            if url and vault.url_key(url) in card_urls:
                continue  # 已出成 Pete 卡的原帖不在下面重复列一遍
            d_iso = _saved_item_day(p, meta)
            rel = str(p.relative_to(root))
            by_day.setdefault(d_iso, {"cards": [], "items": []})["items"].append({
                "id": rel,
                "kind": "article" if key == "saved" else "clipping",
                "tag": tag,
                "title": vault._title_of(p, body, meta),
                "author": meta.get("author") or "",
                "site": vault.site_of(url) if url else "",
                "url": url,
                "day": d_iso,
                "date": datetime.fromtimestamp(p.stat().st_mtime).strftime("%Y-%m-%d %H:%M"),
                "excerpt": vault._excerpt_of(body),
                "body": body[:20000],
            })

    days = sorted(by_day.keys(), reverse=True)[:60]
    if not days:
        return {"day": "", "latest": True, "days": [], "cards": [], "items": [], "total": 0}
    picked = day if day in by_day else days[0]
    bucket = by_day[picked]
    return {
        "day": picked,
        "latest": picked == days[0],
        "days": days,
        "cards": bucket["cards"],
        "items": bucket["items"],
        "total": len(bucket["cards"]) + len(bucket["items"]),
    }


# ==================== 开发日报（对齐 topic-studio shipped.py + devHTML） ====================
_SKIP_COMMIT = re.compile(r"^(docs|test|tests|chore|ci|refactor|style|build|merge|测试|文档)(\([^)]*\))?\s*[:：]?", re.I)
_KIND_COMMIT = re.compile(r"^(feat|fix|perf)(\([^)]*\))?\s*[:：]\s*", re.I)
_PR_NUM = re.compile(r"\s*\(#(\d+)\)\s*$")
_TRAILER = re.compile(r"^(co-authored-by|signed-off-by)\s*:|^🤖|generated with \[?claude", re.I)
_SEP, _END = "\x1f", "\x1e"


def _clean_why(body: str) -> str:
    for line in (body or "").splitlines():
        ln = line.strip().lstrip("*-• ").strip()
        if ln and not _TRAILER.search(ln) and not ln.startswith("---") and not _KIND_COMMIT.match(ln):
            ln = ln[:240]
            if ln[-1] in "，,、；;：:":
                end = ln.rfind("。")
                ln = ln[: end + 1] if end > 0 else ln.rstrip("，,、；;：:")
            return ln
    return ""


def _repo_changelog(repo_path: Path, *, days: int = 14) -> list[dict[str, Any]]:
    if not (repo_path / ".git").exists():
        return []
    since = (datetime.now(CN) - timedelta(days=days)).strftime("%Y-%m-%d")

    def run_log(extra: list[str]) -> str:
        try:
            proc = subprocess.run(
                [
                    "git", "-c", f"safe.directory={repo_path}", "-C", str(repo_path),
                    "log", *extra, "--date=iso-strict",
                    f"--format=%H{_SEP}%ad{_SEP}%s{_SEP}%b{_END}",
                ],
                capture_output=True,
                text=True,
                timeout=6,
                check=False,
            )
            return proc.stdout if proc.returncode == 0 else ""
        except Exception:
            return ""

    raw = run_log([f"--since={since}", "-n", "80"])
    if not raw.strip():
        raw = run_log(["-n", "25"])
    if not raw.strip():
        return []

    grouped: dict[str, list[dict[str, Any]]] = {}
    for rec in raw.split(_END):
        parts = rec.strip("\n").split(_SEP)
        if len(parts) < 3:
            continue
        sha, raw_dt, subject = parts[0].strip(), parts[1].strip(), parts[2].strip()
        body = parts[3] if len(parts) > 3 else ""
        if not subject or _SKIP_COMMIT.match(subject):
            continue
        m = _KIND_COMMIT.match(subject)
        kind = "fix" if m and m.group(1).lower() in ("fix", "perf") else "new"
        title = _PR_NUM.sub("", subject[m.end():] if m else subject).strip()
        try:
            dt = datetime.fromisoformat(raw_dt).astimezone(CN)
        except ValueError:
            continue
        grouped.setdefault(dt.date().isoformat(), []).append({
            "sha": sha[:7],
            "kind": kind,
            "title": title,
            "why": _clean_why(body),
            "at": dt.strftime("%H:%M"),
        })
    return [{"day": d, "items": grouped[d]} for d in sorted(grouped.keys(), reverse=True)]


def get_dev_daily(cfg: dict[str, Any] | None = None, *, days: int = 14) -> dict[str, Any]:
    """扫描本地 Git 仓库近 14 天的新功能与修复日志（默认包含 Park Studio 自身 + config.devRepos）。"""
    cfg = cfg or config.load_config()
    self_repo = Path(__file__).resolve().parents[2]
    repos_cfg = cfg.get("devRepos") or []

    specs: list[tuple[str, Path]] = []
    if isinstance(repos_cfg, list) and repos_cfg:
        for entry in repos_cfg:
            if isinstance(entry, dict) and entry.get("path"):
                specs.append((str(entry.get("name") or Path(entry["path"]).name), Path(entry["path"]).expanduser()))
            elif isinstance(entry, str):
                p = Path(entry).expanduser()
                specs.append((p.name, p))
    else:
        specs.append(("Park Studio", self_repo))

    sections: list[dict[str, Any]] = []
    for name, path in specs:
        if not path.is_dir():
            continue
        sections.append({"name": name, "path": str(path), "days": _repo_changelog(path, days=days)})
    return {"days_range": days, "sections": sections}
