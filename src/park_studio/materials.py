"""视觉素材库引擎：三大类（图片 / 视频动效 / 做视频）。

支持从本地配置 catalogDir + catalogStaticDir 读取全量素材目录（图片风格 352 款 / 动效风格 101 款 / 做视频模板 124 款 + 真实预览图与 MP4），
若尚未配置外部目录则内置一套轻量 MIT 开源精选样板，保证开箱即用、仓库轻量无臃肿。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from . import config

MEDIA_EXT = {".webp", ".png", ".jpg", ".jpeg", ".gif", ".mp4", ".webm"}

STARTER_IMAGES = [
    {"id": "starter-editorial-card", "cat": "知识卡片", "name": "暖纸杂志信息卡", "en": "Warm Editorial Info Card", "sum": "暖白纸面 + 焦糖橙高亮数字 + 细线条排版的克制杂志质感卡片。", "prompt": "Minimalist warm-paper editorial infographic card about {topic}, burnt-orange accent stat block, crisp typography, clean grid, studio lighting, 3:4", "by": "Park Studio MIT", "preview": ""},
    {"id": "starter-dark-glass", "cat": "科技封面", "name": "深色磨砂液态玻璃", "en": "Dark Liquid Glass Cover", "sum": "深炭底色叠加半透明毛玻璃浮层与柔和边缘高光，适合工具/开源视频封面。", "prompt": "Apple-style dark frosted liquid glass UI card showcasing {topic}, subtle specular rim light, soft depth of field, high contrast, 16:9", "by": "Park Studio MIT", "preview": ""},
    {"id": "starter-whiteboard", "cat": "手绘讲解", "name": "极简手绘流程图", "en": "Clean Hand-Drawn Diagram", "sum": "白板黑笔手绘箭头与核心关键词，适合拆解复杂商业模型或 AI 工作流。", "prompt": "Clean hand-drawn whiteboard diagram explaining {topic}, black ink lines with warm orange highlight circles, minimalist, ultra sharp, 16:9", "by": "Park Studio MIT", "preview": ""},
]

STARTER_MOTIONS = [
    {"id": "starter-spring-pill", "cat": "UI 动效", "name": "弹簧滑块切换", "en": "Spring Pill Switch", "sum": "类似 macOS Liquid Glass 的弹性过冲滑块，适合展示步骤推进或选项卡切换。", "prompt": "Animate {script} using a spring-physics pill indicator (cubic-bezier(0.34, 1.56, 0.64, 1)), crisp backdrop blur, 0.42s duration.", "how": "GSAP / CSS spring", "preview": "", "video": ""},
    {"id": "starter-counter-pop", "cat": "数据高亮", "name": "焦糖橙大数字弹出", "en": "Burnt-Orange Stat Pop", "sum": "核心数字从 0 滚动到目标值并伴随轻缩放强调，适合 Hook 前 5 秒抛真实战绩。", "prompt": "Create a high-impact stat card for {script}: bold tabular-nums counter rolling up in 0.8s with subtle scale-in bounce and warm orange underline.", "how": "GSAP / Remotion", "preview": "", "video": ""},
    {"id": "starter-split-compare", "cat": "对比转场", "name": "左右双屏撕裂对比", "en": "Before/After Split Reveal", "sum": "左侧旧痛点灰暗退场、右侧新方案亮色推入，适合展示效率对比。", "prompt": "Split-screen comparison reveal for {script}: muted left panel slides out while vibrant right panel expands with crisp divider line.", "how": "GSAP / Remotion", "preview": "", "video": ""},
]

STARTER_MAKE = [
    {"id": "starter-talking-head-spec", "use": "口播干货", "group": "知识讲解", "name": "Park 口播 + 镜头表结构", "en": "Talking Head + Spec Table", "sum": "前 5 秒真实数字 Hook → 痛点反差 → 录屏实操演示 → 结语统一动作入口。", "fit": "适合知识 IP、工具测评、独立开发者复盘类 3–10 分钟口播视频。", "style_md": "1. 前 5 秒直出反差结论或真实数字；\n2. 每 15–20 秒切换一次视觉锚点（大字卡 / 录屏放大 / 数据高亮）；\n3. 去掉所有寒暄口水话，原话保留率 > 75%。"},
    {"id": "starter-product-demo", "use": "开源发布", "group": "产品演示", "name": "15 秒开源产品快剪", "en": "15s Open-Source Launch Film", "sum": "痛点一句大字 → 3 个核心界面快切 → GitHub Star / 下载入口定格。", "fit": "适合 X / 抖音 / 小红书同步发开源项目或新功能上线预告。", "style_md": "0-3s 痛点句；3-11s 三个核心交互高帧率录屏特写；11-15s Logo + 开源协议 + 下载地址。"},
]


def _catalog_dirs(cfg: dict[str, Any]) -> tuple[Path | None, Path | None]:
    cdir_raw = str(cfg.get("catalogDir") or "").strip()
    sdir_raw = str(cfg.get("catalogStaticDir") or "").strip()
    cdir = Path(cdir_raw).expanduser() if cdir_raw else None
    sdir = Path(sdir_raw).expanduser() if sdir_raw else None
    if cdir and not cdir.is_dir():
        cdir = None
    if sdir and not sdir.is_dir():
        sdir = None
    return cdir, sdir


def _find_asset(sdir: Path | None, folder: str, stem: str, exts: tuple[str, ...]) -> str:
    if not sdir:
        return ""
    sub = sdir / folder
    if not sub.is_dir():
        return ""
    for ext in exts:
        if (sub / f"{stem}{ext}").is_file():
            return f"/api/materials/asset?folder={folder}&file={stem}{ext}"
    return ""


def get_materials(
    *,
    kind: str = "image",
    cat: str = "",
    q: str = "",
    limit: int = 60,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    cfg = cfg or config.load_config()
    cdir, sdir = _catalog_dirs(cfg)

    def _load_json(name: str) -> Any:
        if not cdir:
            return None
        p = cdir / name
        if not p.is_file():
            return None
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return None

    img_raw = _load_json("image-styles.json")
    mot_raw = _load_json("motion-styles.json")
    make_raw = _load_json("make.json")

    counts = {
        "image": len(img_raw) if isinstance(img_raw, list) else len(STARTER_IMAGES),
        "motion": len(mot_raw) if isinstance(mot_raw, list) else len(STARTER_MOTIONS),
        "video": len(make_raw) if isinstance(make_raw, list) else len(STARTER_MAKE),
    }

    items: list[dict[str, Any]] = []
    if kind == "image":
        src_list = img_raw if isinstance(img_raw, list) else STARTER_IMAGES
        for x in src_list:
            if not isinstance(x, dict):
                continue
            cid = str(x.get("id") or "")
            items.append({
                "id": cid,
                "cat": str(x.get("cat") or "通用"),
                "name": str(x.get("name") or cid),
                "en": str(x.get("en") or ""),
                "sum": str(x.get("sum") or ""),
                "prompt": str(x.get("prompt") or ""),
                "by": str(x.get("by") or ""),
                "preview": _find_asset(sdir, "styles", cid, (".webp", ".jpg", ".png")) if img_raw else "",
            })
    elif kind == "motion":
        src_list = mot_raw if isinstance(mot_raw, list) else STARTER_MOTIONS
        for x in src_list:
            if not isinstance(x, dict):
                continue
            cid = str(x.get("id") or "")
            items.append({
                "id": cid,
                "cat": str(x.get("cat") or "动效"),
                "name": str(x.get("name") or cid),
                "en": str(x.get("en") or ""),
                "sum": str(x.get("sum") or ""),
                "prompt": str(x.get("prompt") or ""),
                "how": str(x.get("how") or x.get("repo") or ""),
                "preview": _find_asset(sdir, "motion-styles", cid, (".webp", ".png", ".jpg")) if mot_raw else "",
                "video": _find_asset(sdir, "motion-styles", cid, (".mp4", ".webm")) if mot_raw else "",
            })
    else:
        src_list = make_raw if isinstance(make_raw, list) else STARTER_MAKE
        for x in src_list:
            if not isinstance(x, dict):
                continue
            cid = str(x.get("id") or "")
            items.append({
                "id": cid,
                "cat": str(x.get("use") or x.get("group") or "视频模板"),
                "group": str(x.get("group") or ""),
                "name": str(x.get("name") or cid),
                "en": str(x.get("en") or ""),
                "sum": str(x.get("sum") or ""),
                "fit": str(x.get("fit") or ""),
                "prompt": str(x.get("style_md") or x.get("fit") or x.get("sum") or ""),
                "url": str(x.get("url") or ""),
                "preview": _find_asset(sdir, "motion", cid, (".webp", ".jpg", ".png")) if make_raw else "",
                "video": _find_asset(sdir, "motion", cid, (".mp4", ".webm")) if make_raw else "",
            })

    cat_counts: dict[str, int] = {}
    for it in items:
        c = it["cat"]
        cat_counts[c] = cat_counts.get(c, 0) + 1
    cats = [{"name": c, "count": n} for c, n in sorted(cat_counts.items(), key=lambda kv: (-kv[1], kv[0]))]

    qq = q.strip().lower()
    filtered = [
        it for it in items
        if (not cat or it["cat"] == cat)
        and (not qq or qq in f"{it['name']} {it['en']} {it['sum']} {it['cat']}".lower())
    ]

    return {
        "kind": kind,
        "hasLocalCatalog": cdir is not None,
        "counts": counts,
        "total": len(filtered),
        "categories": cats,
        "items": filtered[:limit],
    }


def resolve_asset(folder: str, filename: str, cfg: dict[str, Any] | None = None) -> Path | None:
    if folder not in ("styles", "motion-styles", "motion"):
        return None
    if "/" in filename or "\\" in filename or ".." in filename:
        return None
    cfg = cfg or config.load_config()
    _, sdir = _catalog_dirs(cfg)
    if not sdir:
        return None
    base = (sdir / folder).resolve()
    target = (base / filename).resolve()
    if base not in target.parents or not target.is_file():
        return None
    if target.suffix.lower() not in MEDIA_EXT:
        return None
    return target
