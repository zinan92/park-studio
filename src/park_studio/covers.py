"""Park Studio 内置封面工坊（零跳出 Canva/PS）：

支持两种模式直接输出标准 3 比例封面到工程目录 `final/上传/`：
1. `local`（1 秒极速本地出图）：用本机 ffmpeg 自动从成片抽清晰关键帧（或生成深色杂志底图），叠加暗角遮罩与醒目大字排版，一键输出：
   - 竖封面（抖音、视频号）.png（1080×1920）
   - 横封面（抖音、小红书）.png（1280×960）
   - 16比9封面（B站、YouTube）.png（1920×1080）
2. `agent`（全能剪辑/视觉 Agent 精做模式）：把抽出的关键帧 + 标题 + 选中视觉风格交给本机 Claude Code / Codex / Gemini CLI 在工程目录内直接产出高定 3 比例封面 PNG。
"""
from __future__ import annotations

import os
import subprocess
import tempfile
import textwrap
from pathlib import Path
from typing import Any

from . import ai, config, cutter, db, projects, publisher

COVER_SPECS = [
    ("cover_v", "竖封面（抖音、视频号）.png", 1080, 1920, 86, 11),
    ("cover_h", "横封面（抖音、小红书）.png", 1280, 960, 74, 14),
    ("cover_169", "16比9封面（B站、YouTube）.png", 1920, 1080, 92, 16),
]


def _pick_font_file() -> str:
    for cand in (
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if Path(cand).is_file():
            return cand
    return ""


def _has_drawtext(ff: str) -> bool:
    try:
        r = subprocess.run([ff, "-hide_banner", "-filters"], capture_output=True, text=True, timeout=8, check=False)
        return "drawtext" in (r.stdout or "")
    except Exception:
        return False


def _wrap_headline(title: str, width: int) -> str:
    t = (title or "Park Studio").strip()
    if len(t) <= width:
        return t
    lines = textwrap.wrap(t, width=width)
    return "\n".join(lines[:3])


def _target_upload_dir(ep: dict[str, Any], cfg: dict[str, Any]) -> tuple[Path, Path]:
    """定位或创建当前期次的工程目录及 final/上传/。"""
    vp = Path(str(ep.get("videoPath") or "")).expanduser()
    if vp.is_file() and vp.parent.name == "上传" and vp.parent.parent.name == "final":
        return vp.parent.parent.parent, vp.parent
    ep_dir = projects.scaffold_episode_dir(ep.get("title") or f"EP{ep.get('episode', 1)}", cfg=cfg)
    up = ep_dir / "final" / "上传"
    up.mkdir(parents=True, exist_ok=True)
    return ep_dir, up


def generate_local_covers(
    video_path: Path | None,
    upload_dir: Path,
    *,
    headline: str,
    subtitle: str = "",
    frame_ratio: float = 0.28,
) -> dict[str, Any]:
    """用本机 ffmpeg 1 秒生成 3 张标准比例封面 PNG 到 upload_dir。"""
    ff = cutter._which("ffmpeg")
    if not ff:
        raise RuntimeError("本机未安装 ffmpeg，请先在引导页或终端安装 ffmpeg")

    upload_dir.mkdir(parents=True, exist_ok=True)
    has_video = bool(video_path and video_path.is_file())
    seek_s = 1.0
    if has_video and video_path is not None:
        try:
            info = cutter.probe_video(video_path)
            dur = float(info.get("duration") or 0)
            if dur > 1.0:
                seek_s = max(0.3, min(dur - 0.5, dur * frame_ratio))
        except Exception:
            seek_s = 1.0

    font_file = _pick_font_file()
    can_drawtext = bool(font_file) and _has_drawtext(ff)
    outputs: dict[str, str] = {}

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        raw_frame = tmp_dir / "keyframe.png"
        if has_video and video_path is not None:
            r = subprocess.run(
                [ff, "-nostdin", "-hide_banner", "-y", "-ss", f"{seek_s:.2f}", "-i", str(video_path), "-frames:v", "1", str(raw_frame)],
                capture_output=True, text=True, timeout=30, check=False,
            )
            if r.returncode != 0 or not raw_frame.is_file():
                has_video = False

        for key, fname, w, h, fsize, wrap_w in COVER_SPECS:
            out_png = upload_dir / fname
            txt_file = tmp_dir / f"{key}.txt"
            txt_file.write_text(_wrap_headline(headline, wrap_w), encoding="utf-8")

            vf_parts: list[str] = []
            if has_video:
                vf_parts.append(f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}")
            # 底部暗角遮罩 + 顶部焦糖/靛蓝细条，确保大字高对比清晰可读
            box_h = int(h * 0.42)
            box_y = h - box_h
            vf_parts.append(f"drawbox=x=0:y={box_y}:w={w}:h={box_h}:color=black@0.66:t=fill")
            vf_parts.append(f"drawbox=x=64:y={box_y + 28}:w=96:h=10:color=0xFF6B35@0.95:t=fill")
            if can_drawtext:
                esc_font = font_file.replace(":", "\\:")
                esc_txt = str(txt_file).replace(":", "\\:")
                vf_parts.append(
                    f"drawtext=fontfile='{esc_font}':textfile='{esc_txt}':fontcolor=white:fontsize={fsize}:"
                    f"line_spacing=18:x=64:y={box_y + 62}:shadowcolor=black@0.75:shadowx=0:shadowy=4"
                )
                if subtitle.strip():
                    sub_file = tmp_dir / f"{key}_sub.txt"
                    sub_file.write_text(subtitle.strip()[:42], encoding="utf-8")
                    esc_sub = str(sub_file).replace(":", "\\:")
                    vf_parts.append(
                        f"drawtext=fontfile='{esc_font}':textfile='{esc_sub}':fontcolor=0xD8DCE8:fontsize={max(28, int(fsize * 0.42))}:"
                        f"x=64:y={h - 88}"
                    )

            vf = ",".join(vf_parts)
            if has_video:
                argv = [ff, "-nostdin", "-hide_banner", "-y", "-i", str(raw_frame), "-vf", vf, "-frames:v", "1", str(out_png)]
            else:
                argv = [ff, "-nostdin", "-hide_banner", "-y", "-f", "lavfi", "-i", f"color=c=0x16181F:s={w}x{h}:d=1", "-vf", vf, "-frames:v", "1", str(out_png)]
            done = subprocess.run(argv, capture_output=True, text=True, timeout=30, check=False)
            if done.returncode != 0 or not out_png.is_file():
                raise RuntimeError(f"生成 {fname} 失败：{(done.stderr or '')[-240:]}")
            outputs[key] = str(out_png)

    return {"ok": True, "mode": "local", "covers": outputs, "uploadDir": str(upload_dir), "usedDrawtext": can_drawtext}


def generate_episode_covers(
    conn,
    episode_id: int,
    *,
    mode: str = "local",
    headline: str = "",
    subtitle: str = "",
    style_hint: str = "",
    frame_ratio: float = 0.28,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """为指定发布期次生成 3 张封面并自动回填到 SQLite + publish.json。"""
    ep = publisher.get_episode(conn, episode_id)
    if not ep:
        raise ValueError("找不到该发布期次")
    cfg = cfg or config.load_config()
    ep_dir, upload_dir = _target_upload_dir(ep, cfg)
    title = (headline or (ep.get("publishJson") or {}).get("title") or ep.get("title") or "").strip()
    vp = Path(str(ep.get("videoPath") or "")).expanduser() if ep.get("videoPath") else None

    if mode == "agent":
        # 先抽一张干净底帧给 Agent 当素材参考，再让全能剪辑 Agent 用脚本/HTML/Python 生成精修封面
        kf = upload_dir / "_keyframe_ref.png"
        ff = cutter._which("ffmpeg")
        if ff and vp and vp.is_file():
            subprocess.run(
                [ff, "-nostdin", "-hide_banner", "-y", "-ss", "2", "-i", str(vp), "-frames:v", "1", str(kf)],
                capture_output=True, text=True, timeout=25, check=False,
            )
        prompt = (
            f"请为短视频《{title}》制作 3 张高点击率、设计感克制的杂志风封面 PNG，直接保存到当前目录的 `final/上传/` 下，文件名严格为：\n"
            f"1. `final/上传/竖封面（抖音、视频号）.png` (1080x1920)\n"
            f"2. `final/上传/横封面（抖音、小红书）.png` (1280x960)\n"
            f"3. `final/上传/16比9封面（B站、YouTube）.png` (1920x1080)\n\n"
            f"副标题/卖点：{subtitle or '无'}\n"
            f"参考风格：{style_hint or '深色杂志感 / 暖白高对比大字，重点词用焦糖橙 #FF6B35 高亮'}\n"
            f"可用原片关键帧参考：{str(kf) if kf.is_file() else '无（请生成纯排版杂志封面）'}\n"
            "请直接运行本地 Python (Pillow/matplotlib) 或 ffmpeg/HTML 渲染脚本产出上述 3 张 PNG，确认文件均非空后简要汇报完成。"
        )
        res = ai.run_agent_execute(prompt, cwd=ep_dir, cfg=cfg, timeout=240)
        covers = {
            "cover_v": str(upload_dir / "竖封面（抖音、视频号）.png") if (upload_dir / "竖封面（抖音、视频号）.png").is_file() else "",
            "cover_h": str(upload_dir / "横封面（抖音、小红书）.png") if (upload_dir / "横封面（抖音、小红书）.png").is_file() else "",
            "cover_169": str(upload_dir / "16比9封面（B站、YouTube）.png") if (upload_dir / "16比9封面（B站、YouTube）.png").is_file() else "",
        }
        if not any(covers.values()):
            # 若 Agent 没产出文件，自动降级用本地极速版兜底，保证用户拿到 3 张封面
            fallback = generate_local_covers(vp, upload_dir, headline=title, subtitle=subtitle, frame_ratio=frame_ratio)
            covers = fallback["covers"]
        agent_meta = {"backend": res["backend"], "model": res["model"], "reply": res["text"][:300]}
    else:
        gen = generate_local_covers(vp, upload_dir, headline=title, subtitle=subtitle, frame_ratio=frame_ratio)
        covers = gen["covers"]
        agent_meta = {}

    packed = publisher.pack_episode(
        conn,
        episode_id,
        cover_v_path=covers.get("cover_v") or ep.get("coverVPath") or "",
        cover_h_path=covers.get("cover_169") or covers.get("cover_h") or ep.get("coverHPath") or "",
        publish_json={
            **(ep.get("publishJson") or {}),
            "cover_v_path": covers.get("cover_v") or "",
            "cover_h_path": covers.get("cover_h") or "",
            "cover_169_path": covers.get("cover_169") or "",
        },
    )
    db.log_event(conn, f"EP{ep['episode']}", f"封面工坊({mode})", "一键生成 3 比例封面", str(upload_dir))
    return {
        "ok": True,
        "mode": mode,
        "covers": covers,
        "episode": packed["episode"],
        **agent_meta,
    }
