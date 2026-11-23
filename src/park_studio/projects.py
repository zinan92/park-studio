"""Park Studio 统一工程目录规范（与 Park 真实 SSD 工作流 100% 同构，对用户零心智负担）。

标准单期目录结构（从「定稿」自动创建，AI Agent 自动写入，发布引擎自动识别）：
  <projectRoot>/YYYY-MM-DD_<期次名>/
  ├── 拍摄提纲.md
  ├── cut-plan.json
  ├── subtitles/
  │   └── source.srt
  ├── analysis/
  │   └── worktable.json
  └── final/
      └── 上传/
          ├── 视频（抖音、视频号、小红书、B站、YouTube）.mp4
          ├── 竖封面（抖音、视频号）.png
          ├── 横封面（抖音、小红书）.png
          ├── 16比9封面（B站、YouTube）.png
          ├── 文案.txt
          └── publish.json
"""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from typing import Any

from . import config

IGNORE_DIRS = {"remotion-tmp", ".git", ".Trash", "__pycache__", "node_modules"}
DATE_PREFIX_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})[_\-\s]+(.+)$")
TAG_RE = re.compile(r"#([^\s#]+)")

COPY_PLAT_MAP = {
    "抖音": "douyin",
    "视频号": "channels",
    "小红书": "xhs",
    "b站": "bilibili",
    "B站": "bilibili",
    "youtube": "youtube",
    "YouTube": "youtube",
    "x": "x",
    "X": "x",
    "公众号": "wechat",
}


def project_root(cfg: dict[str, Any] | None = None) -> Path:
    cfg = cfg or config.load_config()
    raw = str(cfg.get("projectRoot") or "~/Movies/ParkStudio").strip()
    return Path(raw).expanduser()


def _safe_slug(title: str) -> str:
    cleaned = re.sub(r'[\\/:*?"<>|]+', " ", (title or "").strip())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:48] or "未命名作品"


def scaffold_episode_dir(
    title: str,
    *,
    day: str | None = None,
    script_body: str = "",
    cfg: dict[str, Any] | None = None,
) -> Path:
    """在统一工程根目录下创建标准期次目录结构，供后续剪辑 Agent 和发布引擎无缝衔接。"""
    root = project_root(cfg)
    root.mkdir(parents=True, exist_ok=True)
    day_s = day or date.today().isoformat()
    folder = root / f"{day_s}_{_safe_slug(title)}"
    for sub in ("subtitles", "analysis", "final/上传"):
        (folder / sub).mkdir(parents=True, exist_ok=True)
    outline = folder / "拍摄提纲.md"
    if script_body.strip() and not outline.exists():
        outline.write_text(f"# {title}\n\n{script_body.strip()}\n", encoding="utf-8")
    return folder


def parse_copy_txt(text: str) -> dict[str, Any]:
    """解析 Park 标准 `final/上传/文案.txt`：首行标题 + 分平台 `话题 · 抖音：#...` 行。"""
    lines = [ln.strip() for ln in (text or "").splitlines() if ln.strip()]
    if not lines:
        return {"title": "", "description": "", "tags": [], "platforms": {}}

    title = lines[0]
    desc_lines: list[str] = []
    plat_map: dict[str, dict[str, Any]] = {}
    all_tags: list[str] = []

    for ln in lines[1:]:
        m = re.match(r"^(?:话题|标签|文案)\s*[·:：]\s*([^:：]+)\s*[:：]\s*(.+)$", ln)
        if m:
            raw_plat = m.group(1).strip()
            val = m.group(2).strip()
            pid = COPY_PLAT_MAP.get(raw_plat) or COPY_PLAT_MAP.get(raw_plat.lower())
            tags = TAG_RE.findall(val)
            if pid:
                entry = plat_map.setdefault(pid, {"title": title})
                if tags:
                    entry["tags"] = tags
                    for t in tags:
                        if t not in all_tags:
                            all_tags.append(t)
                else:
                    entry["description"] = val
            continue
        desc_lines.append(ln)

    description = "\n".join(desc_lines).strip() or title
    return {
        "title": title,
        "description": description,
        "tags": all_tags[:8],
        "platforms": plat_map,
    }


def _pick_file(directory: Path, patterns: tuple[str, ...], *, exts: tuple[str, ...]) -> Path | None:
    if not directory.is_dir():
        return None
    files = [p for p in sorted(directory.iterdir()) if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in exts]
    for pat in patterns:
        for p in files:
            if pat.lower() in p.name.lower():
                return p
    return files[0] if files and not patterns else None


def inspect_episode_dir(folder: Path) -> dict[str, Any]:
    """扫描单个标准期次目录，自动识别成片、3 张封面、文案.txt、字幕与镜头表。"""
    name = folder.name
    m = DATE_PREFIX_RE.match(name)
    day_s = m.group(1) if m else ""
    title = m.group(2).strip() if m else name

    upload_dir = folder / "final" / "上传"
    final_dir = folder / "final"
    covers_dir = folder / "final" / "covers"

    # 1. 视频：优先 final/上传/*.mp4 → final/video.mp4 → final/*.mp4 → 根目录 粗剪*.mov
    video = (
        _pick_file(upload_dir, ("视频", ""), exts=(".mp4", ".mov"))
        or _pick_file(final_dir, ("video", ""), exts=(".mp4",))
        or _pick_file(folder, ("成片", "final"), exts=(".mp4",))
    )
    rough = _pick_file(folder, ("粗剪", ""), exts=(".mov", ".mp4"))

    # 2. 封面：竖封面 (抖音/视频号)、横封面 (抖音/小红书)、16:9 封面 (B站/YouTube)
    img_exts = (".png", ".jpg", ".jpeg", ".webp")
    cover_v = _pick_file(upload_dir, ("竖封面", "3x4", "9x16"), exts=img_exts) or _pick_file(covers_dir, ("竖封面",), exts=img_exts)
    cover_h = _pick_file(upload_dir, ("横封面", "4x3"), exts=img_exts) or _pick_file(covers_dir, ("横封面",), exts=img_exts)
    cover_169 = (
        _pick_file(upload_dir, ("16比9", "16x9", "youtube", "b站"), exts=img_exts)
        or _pick_file(covers_dir, ("youtube", "16比9", "16x9"), exts=img_exts)
    )

    # 3. 文案.txt 与 publish.json
    copy_path = upload_dir / "文案.txt" if (upload_dir / "文案.txt").is_file() else None
    copy_data = parse_copy_txt(copy_path.read_text(encoding="utf-8", errors="replace")) if copy_path else {}
    if copy_data.get("title"):
        title = copy_data["title"]

    pj_candidates = [upload_dir / "publish.json", folder / "publish.json"]
    pj_path = next((p for p in pj_candidates if p.is_file()), None)
    existing_pj: dict[str, Any] = {}
    if pj_path:
        try:
            existing_pj = json.loads(pj_path.read_text(encoding="utf-8"))
        except Exception:
            existing_pj = {}

    has_srt = (folder / "subtitles" / "source.srt").is_file()
    has_cut = (folder / "cut-plan.json").is_file() or (folder / "analysis" / "worktable.json").is_file() or (folder / "analysis" / "worktable.html").is_file()

    if video is not None and upload_dir.is_dir():
        stage = "ready"
        stage_label = "已打包 · 可直接发布"
    elif video is not None:
        stage = "ready"
        stage_label = "有成片 · 待补封面文案"
    elif rough is not None or has_cut or has_srt:
        stage = "cutting"
        stage_label = "剪辑中"
    else:
        stage = "draft"
        stage_label = "草稿目录"

    return {
        "folder": str(folder),
        "name": name,
        "date": day_s,
        "title": title,
        "stage": stage,
        "stageLabel": stage_label,
        "videoPath": str(video) if video else "",
        "roughPath": str(rough) if rough else "",
        "coverVPath": str(cover_v) if cover_v else "",
        "coverHPath": str(cover_h) if cover_h else "",
        "cover169Path": str(cover_169) if cover_169 else "",
        "copyPath": str(copy_path) if copy_path else "",
        "copyData": copy_data,
        "hasPublishJson": pj_path is not None,
        "publishJson": existing_pj,
        "hasSrt": has_srt,
        "hasCutPlan": has_cut,
    }


def scan_projects(cfg: dict[str, Any] | None = None, *, limit: int = 30) -> dict[str, Any]:
    root = project_root(cfg)
    if not root.is_dir():
        return {"root": str(root), "mounted": False, "projects": []}
    dirs = [
        p for p in root.iterdir()
        if p.is_dir() and not p.name.startswith(".") and p.name not in IGNORE_DIRS
    ]
    dirs.sort(key=lambda p: (p.name if DATE_PREFIX_RE.match(p.name) else "", p.stat().st_mtime), reverse=True)
    items = [inspect_episode_dir(d) for d in dirs[:limit]]
    return {
        "root": str(root),
        "mounted": True,
        "projects": items,
    }
