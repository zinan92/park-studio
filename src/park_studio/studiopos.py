"""创作者完整定位系统（对齐 Studio 7 页签定位：定位三问 / 增长飞轮 / 差异化 / 服务与定价 / 对外简介 / 原则与自测 / 我的形象）。

100% 本地只读读取创作者自己的 positioning.json、profile.md 与 persona 形象目录（路径配置在 ~/.park-studio/config.yaml，
仓库源码零个人路径）；在线点字微调与平台同步打卡持久化在本地 SQLite。
"""
from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from . import config, db

CN = timezone(timedelta(hours=8))

PERSONA_BASE = (
    ("avatar.png", "头像"),
    ("fullbody.png", "全身像"),
    ("sheet.png", "四视图"),
    ("reference.png", "动作参考"),
    ("watermark.png", "水印 · 浅色底"),
    ("watermark-light.png", "水印 · 深色底"),
    ("banner/x-1500x500.png", "Banner · X"),
    ("banner/douyin-1125x633.png", "Banner · 抖音"),
    ("banner/xiaohongshu-1250x1000.png", "Banner · 小红书"),
)
PERSONA_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

DEFAULT_PROFILE_PLATFORMS = (
    {"key": "douyin", "label": "抖音", "variant": "cn", "where": "抖音创作者中心 → 账号资料", "edit_url": "https://creator.douyin.com/"},
    {"key": "channels", "label": "视频号", "variant": "cn", "where": "视频号助手 → 账号信息", "edit_url": "https://channels.weixin.qq.com/platform"},
    {"key": "xhs", "label": "小红书", "variant": "cn", "where": "小红书 App → 编辑资料", "edit_url": "https://creator.xiaohongshu.com/"},
    {"key": "bilibili", "label": "B 站", "variant": "cn", "where": "B 站创作中心 → 个人空间", "edit_url": "https://member.bilibili.com/"},
    {"key": "youtube", "label": "YouTube", "variant": "cn", "where": "YouTube Studio → Customization", "edit_url": "https://studio.youtube.com/"},
    {"key": "x", "label": "X", "variant": "x", "where": "X → Edit profile", "edit_url": "https://x.com/settings/profile"},
)


def _resolve_path(raw: str, vault_root: Path | None) -> Path | None:
    s = str(raw or "").strip()
    if not s:
        return None
    p = Path(s).expanduser()
    if p.is_absolute():
        return p
    if vault_root is not None:
        return (vault_root / p).resolve()
    return p


def _parse_profile_md(path: Path | None) -> dict[str, dict[str, str]]:
    if not path or not path.is_file():
        return {"cn": {"name": "", "bio": ""}, "x": {"name": "", "bio": ""}}
    try:
        raw_lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    except OSError:
        return {"cn": {"name": "", "bio": ""}, "x": {"name": "", "bio": ""}}
    lines = [ln for ln in raw_lines if not ln.strip().startswith("![[")]
    cut = next((i for i, ln in enumerate(lines) if re.match(r"^##\s*X(\s|$|版)", ln.strip())), None)
    cn_lines, x_lines = (lines, []) if cut is None else (lines[:cut], lines[cut + 1 :])

    def _block(part: list[str]) -> dict[str, str]:
        text = "\n".join(part).strip()
        name, _, bio = text.partition("\n")
        return {"name": name.strip(), "bio": bio.strip()}

    return {"cn": _block(cn_lines), "x": _block(x_lines)}


def _scan_persona(base: Path | None) -> dict[str, Any]:
    if not base or not base.is_dir():
        return {"name": "", "skill": "", "ready": False, "base": [], "gallery": []}
    spec = base / "spec.md"
    ready = spec.is_file() and (base / "reference.png").is_file()
    name, skill = "", ""
    if ready:
        try:
            text = spec.read_text(encoding="utf-8", errors="replace")
            m = re.search(r"角色名称?为\s*[「“]?([^\s。，「」“”]+)", text) or re.match(r"#\s*(\S+?)\s*角色", text)
            name = m.group(1) if m else "固定角色"
        except OSError:
            name = "固定角色"
        skill_md = base.parent / "SKILL.md"
        if skill_md.is_file():
            try:
                m = re.search(r"^name:\s*(\S+)\s*$", skill_md.read_text(encoding="utf-8", errors="replace"), re.M)
                skill = m.group(1) if m else ""
            except OSError:
                pass
    gallery: list[dict[str, str]] = []
    idx_file = base / "gallery" / "index.jsonl"
    if idx_file.is_file():
        try:
            for row in idx_file.read_text(encoding="utf-8", errors="replace").splitlines():
                try:
                    item = json.loads(row)
                except ValueError:
                    continue
                if isinstance(item, dict) and (base / "gallery" / str(item.get("file") or "")).is_file():
                    gallery.append({
                        "file": f"gallery/{item['file']}",
                        "title": str(item.get("title") or ""),
                        "at": str(item.get("at") or ""),
                        "caption": str(item.get("caption") or ""),
                    })
        except OSError:
            pass
    base_list = [{"file": rel, "label": lbl} for rel, lbl in PERSONA_BASE if (base / rel).is_file()]
    return {"name": name, "skill": skill, "ready": ready, "base": base_list, "gallery": gallery[::-1]}


def _load_disk_base(cfg: dict[str, Any]) -> dict[str, Any] | None:
    vroot_str = str(cfg.get("obsidianPath") or "").strip()
    vroot = Path(vroot_str).expanduser() if vroot_str else None
    pos_path = _resolve_path(str(cfg.get("positioningFile") or ""), vroot)
    if not pos_path or not pos_path.is_file():
        return None
    try:
        pos_data = json.loads(pos_path.read_text(encoding="utf-8"))
    except Exception:
        return None
    if not isinstance(pos_data, dict) or not pos_data.get("company"):
        return None

    prof_path = _resolve_path(str(cfg.get("profileFile") or ""), vroot)
    persona_dir = _resolve_path(str(cfg.get("personaDir") or ""), vroot)
    return {
        "positioning": pos_data,
        "profile": _parse_profile_md(prof_path),
        "persona": _scan_persona(persona_dir),
        "sourcePath": str(pos_path),
        "profilePath": str(prof_path) if prof_path else "",
        "loaded_at": datetime.now(CN).strftime("%Y-%m-%d %H:%M"),
    }


def _apply_path(obj: Any, path: list[Any], value: Any) -> bool:
    if not path:
        return False
    cur = obj
    for key in path[:-1]:
        if isinstance(cur, list) and isinstance(key, int) and 0 <= key < len(cur):
            cur = cur[key]
        elif isinstance(cur, dict) and key in cur:
            cur = cur[key]
        else:
            return False
    last = path[-1]
    if isinstance(cur, list) and isinstance(last, int) and 0 <= last < len(cur):
        cur[last] = value
        return True
    if isinstance(cur, dict):
        cur[last] = value
        return True
    return False


def _load_applied(conn: sqlite3.Connection) -> dict[str, str]:
    row = conn.execute("SELECT v FROM kv WHERE k='studio_profile_applied'").fetchone()
    if not row:
        return {}
    try:
        data = json.loads(row["v"])
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _attach_platforms(conn: sqlite3.Connection, studio: dict[str, Any]) -> dict[str, Any]:
    applied = _load_applied(conn)
    plats = []
    for p in DEFAULT_PROFILE_PLATFORMS:
        at = applied.get(p["key"], "")
        plats.append({
            **p,
            "state": "synced" if at else "never",
            "applied_at": at,
        })
    return {**studio, "platforms": plats}


def load_studio_positioning(
    conn: sqlite3.Connection,
    cfg: dict[str, Any] | None = None,
    *,
    force_reload: bool = False,
) -> dict[str, Any] | None:
    cfg = cfg or config.load_config()
    disk = _load_disk_base(cfg)
    if disk is None:
        return None
    if force_reload:
        conn.execute("DELETE FROM kv WHERE k='studio_positioning_edits'")
        conn.commit()
        return _attach_platforms(conn, disk)

    row = conn.execute("SELECT v FROM kv WHERE k='studio_positioning_edits'").fetchone()
    if row:
        try:
            edits = json.loads(row["v"])
            if isinstance(edits, list):
                for item in edits:
                    if isinstance(item, dict) and isinstance(item.get("path"), list):
                        _apply_path(disk, item["path"], item.get("value"))
        except Exception:
            pass
    return _attach_platforms(conn, disk)


def update_studio_field(
    conn: sqlite3.Connection,
    path: list[Any],
    value: Any,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    cfg = cfg or config.load_config()
    studio = load_studio_positioning(conn, cfg)
    if studio is None:
        raise ValueError("尚未配置本地定位正本文件（positioningFile）")
    if not _apply_path(studio, path, value):
        raise ValueError("无效的定位字段路径")

    row = conn.execute("SELECT v FROM kv WHERE k='studio_positioning_edits'").fetchone()
    edits: list[dict[str, Any]] = []
    if row:
        try:
            loaded = json.loads(row["v"])
            if isinstance(loaded, list):
                edits = loaded
        except Exception:
            pass
    edits = [e for e in edits if e.get("path") != path]
    edits.append({"path": path, "value": value})
    conn.execute("INSERT OR REPLACE INTO kv(k, v) VALUES ('studio_positioning_edits', ?)", (json.dumps(edits, ensure_ascii=False),))
    conn.commit()
    db.log_event(conn, "定位", "本地库", "更新定位字段", ".".join(str(x) for x in path[:4]))
    return load_studio_positioning(conn, cfg) or studio


def mark_profile_applied(
    conn: sqlite3.Connection,
    key: str,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    cfg = cfg or config.load_config()
    applied = _load_applied(conn)
    applied[key] = datetime.now(CN).strftime("%Y-%m-%d")
    conn.execute("INSERT OR REPLACE INTO kv(k, v) VALUES ('studio_profile_applied', ?)", (json.dumps(applied, ensure_ascii=False),))
    conn.commit()
    studio = load_studio_positioning(conn, cfg)
    if studio is None:
        raise ValueError("尚未配置本地定位正本文件")
    return studio


def resolve_persona_file(rel_path: str, cfg: dict[str, Any] | None = None) -> Path | None:
    cfg = cfg or config.load_config()
    vroot_str = str(cfg.get("obsidianPath") or "").strip()
    vroot = Path(vroot_str).expanduser() if vroot_str else None
    base = _resolve_path(str(cfg.get("personaDir") or ""), vroot)
    if not base or not base.is_dir():
        return None
    try:
        target = (base / rel_path).resolve()
    except OSError:
        return None
    if base.resolve() not in target.parents:
        return None
    if target.suffix.lower() not in PERSONA_EXT or not target.is_file():
        return None
    return target
