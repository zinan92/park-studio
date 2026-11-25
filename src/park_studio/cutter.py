"""双模式本地视频剪辑引擎（一键粗剪 + 高级动效模式）与实时后台任务队列。

模式一 · 一键粗剪（内置 xuanti-cut / videocut 算法，面向开源用户开箱即用）：
  原片 .mp4/.mov → mlx-whisper / faster-whisper 本地免费转写（带词级时间戳）
  → 自动标出停顿 / 说错重来 / 语气词 → 勾选 Hook（1–3 句原话）与删留句
  → ffmpeg 两遍 -16 LUFS 响度统一 + ASS 字幕烧录 + faststart 渲染成片。

模式二 · 高级动效模式（对接 park-video-v2 / 剪映 SRT + 独立剪辑 Agent）：
  导入粗剪视频 + .srt（毫秒级解析，无需重复转写）→ 独立剪辑 Agent 自动挑 Hook 并排动效镜头表（Spec Table）
  → 导出 worktable.json 并支持界面一键后台触发独立剪辑 Agent / 自定义渲染命令。

渲染完成自动落盘到统一工程目录 <projectRoot>/YYYY-MM-DD_<标题>/final/上传/，并一键导入发布工作台。
"""
from __future__ import annotations

import json
import os
import re
import shlex
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

from . import ai, config, db, materials, projects, publisher, videocut

CN = timezone(timedelta(hours=8))
EXTRA_BIN_DIRS = [str(Path.home() / "bin"), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"]
FONTS = ("PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC", "WenQuanYi Micro Hei")
PUNCT_END = re.compile(r"([，。！？、；：,.!?;:…]+)$")


class CutError(RuntimeError):
    """清晰的中文错误说明。"""


def _bin_env() -> dict[str, str]:
    env = dict(os.environ)
    env["PATH"] = ":".join(EXTRA_BIN_DIRS) + ":" + env.get("PATH", "")
    return env


def _which(cmd: str) -> str | None:
    found = shutil.which(cmd, path=_bin_env()["PATH"])
    return found


def _run(cmd: list[str], *, timeout: float = 120) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=_bin_env(), check=False)


def detect_transcribe_engine(preferred: str = "") -> str | None:
    order = ["mlx_whisper", "faster_whisper", "whisper"]
    pref_mod = (preferred or "").replace("-", "_")
    if pref_mod in order:
        order.remove(pref_mod)
        order.insert(0, pref_mod)
    for mod in order:
        try:
            __import__(mod)
            return mod
        except ImportError:
            continue
    return None


def detect_font() -> str:
    if os.environ.get("PARK_CUT_FONT"):
        return os.environ["PARK_CUT_FONT"]
    if sys.platform == "darwin":
        return "PingFang SC"
    if sys.platform.startswith("win"):
        return "Microsoft YaHei"
    if _which("fc-list"):
        for cand in FONTS:
            if _run(["fc-list", cand, "family"]).stdout.strip():
                return cand
    return ""


def check_env(cfg: dict[str, Any] | None = None) -> dict[str, Any]:
    cfg = cfg or config.load_config()
    ff = _which("ffmpeg")
    fp = _which("ffprobe")
    has_ff = bool(ff and fp)
    filters_ok = False
    if has_ff:
        flt = _run([ff, "-hide_banner", "-filters"]).stdout
        filters_ok = bool(re.search(r"\bass\b", flt)) and "loudnorm" in flt
    pref = str(cfg.get("transcribeEngine") or "mlx-whisper")
    eng = detect_transcribe_engine(pref)
    fnt = detect_font()
    fixes: list[str] = []
    if not has_ff:
        fixes.append("安装 ffmpeg：macOS 运行 brew install ffmpeg")
    elif not filters_ok:
        fixes.append("当前 ffmpeg 缺少 libass / loudnorm 滤镜，请安装完整版 ffmpeg")
    if not eng:
        fixes.append("安装本地语音转写：Apple Silicon 运行 pip install mlx-whisper；其他电脑运行 pip install faster-whisper")
    cut_backend = str(cfg.get("cutAgentBackend") or "inherit")
    eff_backend = str(cfg.get("aiBackend") or "gemini") if cut_backend == "inherit" else cut_backend
    return {
        "ffmpeg": has_ff,
        "ffmpegPath": ff or "",
        "filters": filters_ok,
        "transcribe": eng or "",
        "preferredTranscribe": pref,
        "font": fnt,
        "ready": has_ff and bool(eng),
        "cutAgent": {
            "mode": cut_backend,
            "effective": eff_backend,
            "model": str(cfg.get("cutAgentModel") or ""),
            "cmd": str(cfg.get("cutAgentCmd") or ""),
        },
        "fixes": fixes,
    }


def probe_video(path: Path) -> dict[str, Any]:
    fp = _which("ffprobe")
    if not fp:
        raise CutError("未找到 ffprobe，请先安装 ffmpeg")
    if not path.is_file():
        raise CutError(f"找不到视频文件：{path}")
    r = _run([fp, "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)])
    data = json.loads(r.stdout or "{}")
    streams = data.get("streams") or []
    v = next((s for s in streams if s.get("codec_type") == "video" and not (s.get("disposition") or {}).get("attached_pic")), None)
    a = next((s for s in streams if s.get("codec_type") == "audio"), None)
    if v is None or a is None:
        raise CutError("该视频文件必须同时包含画面与音轨")
    w, h = int(v.get("width") or 0), int(v.get("height") or 0)
    rot = 0
    for sd in v.get("side_data_list") or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    rot = rot or int(float((v.get("tags") or {}).get("rotate") or 0))
    if abs(rot) % 180 == 90:
        w, h = h, w
    num, _, den = str(v.get("avg_frame_rate") or "30/1").partition("/")
    fps = float(num) / float(den or 1) if float(den or 1) else 30.0
    dur = float((data.get("format") or {}).get("duration") or 0)
    return {
        "duration": round(dur, 2),
        "durationText": fmt_mmss(dur),
        "width": w,
        "height": h,
        "fps": round(fps, 2),
        "sizeMb": round(path.stat().st_size / (1024 * 1024), 1),
    }


def fmt_mmss(sec: float) -> str:
    s = max(0, int(round(sec)))
    return f"{s // 60:02d}:{s % 60:02d}"


def _word_item(text: str, start: float, end: float) -> dict[str, Any]:
    text = (text or "").strip()
    m = PUNCT_END.search(text)
    punct = m.group(1) if m else ""
    return {"start": float(start), "end": float(end), "text": text[: len(text) - len(punct)] if punct else text, "punct": punct}


def parse_srt(srt_path: Path) -> dict[str, Any]:
    """直接解析剪映 / Whisper 导出的 .srt 字幕，毫秒级生成标准 sentences + marks 剪辑方案。"""
    if not srt_path.is_file():
        raise CutError(f"找不到字幕文件：{srt_path}")
    raw = srt_path.read_text(encoding="utf-8", errors="replace").lstrip("\ufeff")
    blocks = re.split(r"\r?\n\s*\r?\n", raw.strip())
    ts_re = re.compile(r"(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})")

    def _to_sec(h: str, m: str, s: str, ms: str) -> float:
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0

    segs: list[dict[str, Any]] = []
    for blk in blocks:
        lines = [ln.strip() for ln in blk.splitlines() if ln.strip()]
        if len(lines) < 2:
            continue
        tm_idx = next((i for i, ln in enumerate(lines) if ts_re.search(ln)), None)
        if tm_idx is None:
            continue
        m = ts_re.search(lines[tm_idx])
        assert m is not None
        start = _to_sec(m.group(1), m.group(2), m.group(3), m.group(4))
        end = _to_sec(m.group(5), m.group(6), m.group(7), m.group(8))
        text = " ".join(lines[tm_idx + 1 :]).strip()
        if not text:
            continue
        segs.append({"start": start, "end": max(end, start + 0.05), "text": text, "words": []})

    if not segs:
        raise CutError("SRT 文件里没有有效字幕条目")
    return build_plan_from_transcript({"segments": segs, "engine": "srt"})


def transcribe_video(
    video: Path,
    *,
    cfg: dict[str, Any] | None = None,
    lang: str = "zh",
    model: str = "",
    log: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    """用本机 mlx-whisper 或 faster-whisper 免费离线转写，输出带词级时间戳的 transcript。"""
    cfg = cfg or config.load_config()
    ff = _which("ffmpeg")
    if not ff:
        raise CutError("本机未安装 ffmpeg")
    pref = str(cfg.get("transcribeEngine") or "mlx-whisper")
    eng = detect_transcribe_engine(pref)
    if not eng:
        raise CutError("本机未安装 mlx-whisper 或 faster-whisper")
    if not video.is_file():
        raise CutError(f"找不到视频文件：{video}")

    _log = log or (lambda _m: None)
    _log(f"使用引擎 {eng}，先用 ffmpeg 提取 16kHz 单声道音轨…")
    prompt = "以下是普通话的句子，使用简体中文。" if (lang or "zh") == "zh" else None

    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "audio.wav"
        r = _run([ff, "-nostdin", "-y", "-i", str(video), "-vn", "-ac", "1", "-ar", "16000", str(wav)], timeout=1800)
        if r.returncode != 0:
            raise CutError("无法从该视频提取音频（可能无音轨或文件损坏）")
        _log("音轨提取完成，开始本机离线语音转写（首次运行会自动缓存模型权重）…")
        segs: list[dict[str, Any]] = []
        if eng == "mlx_whisper":
            import mlx_whisper

            repo = model or "mlx-community/whisper-large-v3-turbo"
            res = mlx_whisper.transcribe(
                str(wav),
                path_or_hf_repo=repo,
                word_timestamps=True,
                language=lang or None,
                initial_prompt=prompt,
            )
            for s in res.get("segments") or []:
                segs.append({
                    "start": float(s["start"]),
                    "end": float(s["end"]),
                    "text": str(s["text"]).strip(),
                    "words": [_word_item(w["word"], w["start"], w["end"]) for w in (s.get("words") or [])],
                })
        elif eng == "faster_whisper":
            from faster_whisper import WhisperModel

            m = WhisperModel(model or "small", compute_type="int8")
            got, _ = m.transcribe(str(wav), language=lang or None, word_timestamps=True, initial_prompt=prompt)
            for s in got:
                segs.append({
                    "start": float(s.start),
                    "end": float(s.end),
                    "text": s.text.strip(),
                    "words": [_word_item(w.word, w.start, w.end) for w in (s.words or [])],
                })
        else:
            import whisper

            res = whisper.load_model(model or "small").transcribe(str(wav), word_timestamps=True, language=lang or None, initial_prompt=prompt)
            for s in res.get("segments") or []:
                segs.append({
                    "start": float(s["start"]),
                    "end": float(s["end"]),
                    "text": str(s["text"]).strip(),
                    "words": [_word_item(w["word"], w["start"], w["end"]) for w in (s.get("words") or [])],
                })

    _log(f"转写完成：共 {len(segs)} 句语音片段")
    return {"segments": segs, "engine": eng}


def build_plan_from_transcript(transcript: dict[str, Any]) -> dict[str, Any]:
    sents = videocut.sentences_from_transcript(transcript)
    if not sents:
        raise CutError("转写里没有识别到有效口播句子")
    marks = videocut.analyze(sents)
    why_map = {"retake": "说错重来", "mistake": "喊了重来", "filler": "语气词"}
    by_id = {m["id"]: m for m in marks}
    lines = []
    for s in sents:
        mk = by_id.get(s["id"]) or {}
        cut_code = mk.get("cut")
        lines.append({
            "i": s["id"],
            "ts": fmt_mmss(s["start"]),
            "start": round(s["start"], 2),
            "end": round(s["end"], 2),
            "text": s["text"],
            "cut": cut_code or "",
            "cutReason": why_map.get(cut_code, "") if cut_code else "",
            "gapBefore": mk.get("gap_before", 0.0),
            "shot": 0,
        })
    default_drop = [m["id"] for m in marks if m["cut"]]
    return {
        "engine": transcript.get("engine", ""),
        "sentences": sents,
        "marks": marks,
        "lines": lines,
        "drop": default_drop,
        "hooks": [],
        "pause_s": videocut.PAUSE_S,
    }


def ai_plan_shots(
    plan_data: dict[str, Any],
    *,
    title: str,
    density: str = "中",
    cfg: dict[str, Any] | None = None,
    positioning_text: str = "",
) -> dict[str, Any]:
    """调用「独立剪辑 Agent」从真实逐字稿里挑 1–3 句原话 Hook，并规划时间轴动效镜头表（Spec Table）。"""
    cfg = cfg or config.load_config()
    lines = plan_data.get("lines") or []
    drop_set = set(plan_data.get("drop") or [])
    kept = [ln for ln in lines if ln["i"] not in drop_set]
    if not kept:
        kept = lines
    if not kept:
        raise CutError("请先转写原片或导入 .srt 字幕，再让剪辑 Agent 排镜头表")

    # 读取素材库中真实动效风格名称供剪辑 Agent 参考
    mot_list = (materials.get_materials(kind="motion", limit=18, cfg=cfg).get("items") or [])
    style_hints = "、".join(m["name"] for m in mot_list[:12]) or "居中大字弹出、焦糖橙数据高亮卡、左右对比转场、录屏特写放大"

    target_n = {"低": "3-5", "中": "5-8", "高": "8-12"}.get(density, "5-8")
    transcript_block = "\n".join(f"[{ln['i']}] ({ln['ts']}) {ln['text']}" for ln in kept[:120])

    prompt = (
        f"{positioning_text}\n\n"
        f"你是一位顶级口播短视频导演与动效剪辑师。视频标题：《{title}》。\n"
        f"可选视觉动效风格参考：{style_hints}\n"
        f"动效密度要求：{density}（请规划 {target_n} 个关键视觉镜头卡）。\n\n"
        f"下面是带编号和时间戳的真实口播逐字稿：\n{transcript_block}\n\n"
        "严格只返回一个 JSON 对象，包含两个字段：\n"
        '1. "hooks": 从上面挑出 1 到 3 个最抓人的原话句子编号数组（整数，例如 [4, 11]，必须是正文里最能让人停下来的金句，绝不编造新句子）。\n'
        '2. "shots": 数组，每个元素格式为 {"id": 1, "line_idx": 对应起始句子编号(整数), "ts": "MM:SS–MM:SS", "style": "动效风格名", "preview": "画面要弹出的核心短字(<=18字)", "reason": "为什么这里要加动效(<=40字)"}。'
    )
    res = ai.run_cut_prompt(prompt, cfg=cfg, timeout=120)
    parsed = ai.extract_json_block(res["text"])
    if not isinstance(parsed, dict):
        raise CutError("剪辑 Agent 返回格式无法解析为镜头表 JSON，请重试")

    valid_ids = {int(ln["i"]) for ln in kept}
    hooks = [int(x) for x in (parsed.get("hooks") or []) if isinstance(x, (int, float)) and int(x) in valid_ids][:3]
    raw_shots = parsed.get("shots") if isinstance(parsed.get("shots"), list) else []
    shots: list[dict[str, Any]] = []
    for idx, s in enumerate(raw_shots[:14], start=1):
        if not isinstance(s, dict):
            continue
        shots.append({
            "id": idx,
            "line_idx": int(s.get("line_idx") or 0),
            "ts": str(s.get("ts") or ""),
            "style": str(s.get("style") or "居中大字弹出"),
            "preview": str(s.get("preview") or "")[:36],
            "reason": str(s.get("reason") or "")[:120],
        })
    if not shots:
        raise CutError("剪辑 Agent 未产出镜头条目，请重试")
    return {"hooks": hooks, "shots": shots, "backend": res["backend"], "model": res["model"]}


def render_rough_cut(
    video: Path,
    plan_data: dict[str, Any],
    out_path: Path,
    *,
    drop: list[int],
    hooks: list[int],
    pause_s: float = videocut.PAUSE_S,
    burn_subs: bool = True,
    log: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    """一键粗剪渲染：两遍 -16 LUFS 响度统一 + 可选 ASS 字幕烧录 + faststart MP4。"""
    ff = _which("ffmpeg")
    if not ff:
        raise CutError("本机未安装 ffmpeg")
    _log = log or (lambda _m: None)
    info = probe_video(video)
    sents = plan_data.get("sentences") or []
    try:
        videocut.validate_choices(sents, drop, hooks)
        parts = videocut.build_parts(sents, drop, hooks, pause_s=pause_s, total=info["duration"])
    except videocut.PlanError as exc:
        raise CutError(str(exc)) from exc

    w, h = videocut.out_size(info["width"], info["height"])
    fps = 25 if 24.5 <= info["fps"] <= 25.5 else 24 if 23 <= info["fps"] < 24.5 else 30
    by_id = {s["id"]: s for s in sents}
    font_name = detect_font() or "PingFang SC"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    def _ff(args: list[str], timeout: float) -> str:
        r = _run([ff, "-nostdin", "-hide_banner", "-y", *args], timeout=timeout)
        if r.returncode != 0:
            raise CutError("ffmpeg 渲染失败：" + (r.stderr or "")[-360:])
        return r.stderr[-6000:]

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        spans = [sp for pt in parts for sp in pt.spans]
        _log(f"第 1/3 步：测量整片响度（目标 -16 LUFS · 共 {len(spans)} 个有效说话片段）…")
        (work / "measure.txt").write_text(
            videocut.graph(spans, w=2, h=2, fps=30, ass_path=None, loudnorm=videocut.loudnorm_filter(), video=False),
            encoding="utf-8",
        )
        tail = _ff(["-i", str(video), "-filter_complex_script", str(work / "measure.txt"), "-map", "[a]", "-f", "null", "-"], timeout=max(120, info["duration"] * 2))
        m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", tail, re.S)
        measured = json.loads(m.group(0)) if m else None
        ln = videocut.loudnorm_filter(measured) if measured and float(measured.get("input_i", -99)) > -70 else None

        files: list[Path] = []
        for k, part in enumerate(parts):
            label = "前置 Hook" if part.kind == "hook" else "正文主片"
            _log(f"第 2/3 步：渲染分段 {k + 1}/{len(parts)}（{label} · {part.dur:.1f}s{' · 烧字幕' if burn_subs else ''}）…")
            ass_arg = None
            if burn_subs:
                ass = work / f"cap{k}.ass"
                ass.write_text(videocut.build_ass(videocut.cues_for_part(part, by_id, w, h), w, h, font_name), encoding="utf-8")
                ass_arg = str(ass)
            (work / f"graph{k}.txt").write_text(
                videocut.graph(part.spans, w=w, h=h, fps=fps, ass_path=ass_arg, loudnorm=ln),
                encoding="utf-8",
            )
            dst = work / f"part{k}.mp4"
            _ff(
                [
                    "-i", str(video), "-filter_complex_script", str(work / f"graph{k}.txt"),
                    "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(dst),
                ],
                timeout=max(300, part.dur * 12),
            )
            files.append(dst)

        _log("第 3/3 步：封装 faststart 成片并校验时长…")
        if len(files) == 1:
            shutil.move(str(files[0]), out_path)
        else:
            (work / "list.txt").write_text("".join(f"file '{f.as_posix()}'\n" for f in files), encoding="utf-8")
            _ff(["-f", "concat", "-safe", "0", "-i", str(work / "list.txt"), "-c", "copy", "-movflags", "+faststart", str(out_path)], timeout=600)

    got = probe_video(out_path)
    _log(f"成片渲染完成 ✓ {out_path.name}（{got['durationText']} · {got['sizeMb']} MB · faststart）")
    return {
        "file": str(out_path),
        "name": out_path.name,
        "seconds": got["duration"],
        "durationText": got["durationText"],
        "sizeMb": got["sizeMb"],
        "summary": videocut.summarize(parts, sents),
    }


def land_into_publish_project(
    conn: sqlite3.Connection,
    *,
    title: str,
    rendered_mp4: Path,
    cfg: dict[str, Any] | None = None,
    log: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    """把成片落盘到统一标准工程目录 <projectRoot>/YYYY-MM-DD_<标题>/final/上传/ 并自动导入发布工作台。"""
    cfg = cfg or config.load_config()
    _log = log or (lambda _m: None)
    folder = projects.scaffold_episode_dir(title, cfg=cfg)
    upload_dir = folder / "final" / "上传"
    upload_dir.mkdir(parents=True, exist_ok=True)
    target_mp4 = upload_dir / "视频（抖音、视频号、小红书、B站、YouTube）.mp4"
    if rendered_mp4.resolve() != target_mp4.resolve():
        shutil.copy2(rendered_mp4, target_mp4)
    copy_txt = upload_dir / "文案.txt"
    if not copy_txt.exists():
        copy_txt.write_text(f"{title}\n", encoding="utf-8")
    _log(f"已落盘到统一工程目录：{target_mp4}")
    imported = publisher.import_from_project_dir(conn, str(folder), cfg=cfg)
    _log(f"已自动载入发布工作台（EP{imported['episode']['episode']}），可直接一键去填表！")
    return {
        "folder": str(folder),
        "videoPath": str(target_mp4),
        "publishEpisode": imported["episode"],
    }


class CutJobManager:
    """线程安全的后台剪辑任务管理（供前端每秒轮询进度与实时日志）。"""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: dict[str, dict[str, Any]] = {}

    def start(self, kind: str, title: str, fn: Callable[[Callable[[str], None]], dict[str, Any]]) -> dict[str, Any]:
        jid = uuid.uuid4().hex[:10]
        job = {
            "id": jid,
            "kind": kind,
            "title": title,
            "state": "running",
            "logs": [f"[{datetime.now(CN).strftime('%H:%M:%S')}] 启动任务：{title}"],
            "result": None,
            "error": "",
            "startedAt": time.time(),
            "finishedAt": 0.0,
        }
        with self._lock:
            self._jobs[jid] = job
            if len(self._jobs) > 25:
                oldest = sorted(self._jobs.keys(), key=lambda k: self._jobs[k]["startedAt"])[0]
                self._jobs.pop(oldest, None)

        def log_fn(msg: str) -> None:
            line = f"[{datetime.now(CN).strftime('%H:%M:%S')}] {msg}"
            with self._lock:
                self._jobs[jid]["logs"].append(line)

        def worker() -> None:
            try:
                res = fn(log_fn)
                with self._lock:
                    self._jobs[jid]["state"] = "done"
                    self._jobs[jid]["result"] = res
                    self._jobs[jid]["finishedAt"] = time.time()
            except Exception as exc:
                log_fn(f"失败：{exc}")
                with self._lock:
                    self._jobs[jid]["state"] = "failed"
                    self._jobs[jid]["error"] = str(exc)
                    self._jobs[jid]["finishedAt"] = time.time()

        threading.Thread(target=worker, daemon=True).start()
        return self.get(jid) or job

    def get(self, jid: str) -> dict[str, Any] | None:
        with self._lock:
            j = self._jobs.get(jid)
            if not j:
                return None
            return {**j, "logs": list(j["logs"])}


def _fmt_srt_ts(sec: float) -> str:
    ms = max(0, int(round(sec * 1000)))
    h, rem = divmod(ms, 3600000)
    m, rem = divmod(rem, 60000)
    s, rem = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{rem:03d}"


def translate_srt(
    lines: list[dict[str, Any]],
    out_path: Path,
    *,
    target_lang: str = "en",
    bilingual: bool = False,
    cfg: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """用本机 AI 把逐字稿句级字幕翻译为英文（或中英双语）标准 .srt 文件，供 YouTube/TikTok/LinkedIn 外挂字幕。"""
    valid = [ln for ln in (lines or []) if str(ln.get("text") or "").strip()]
    if not valid:
        raise CutError("当前没有可翻译的字幕句子，请先转写原片或导入 .srt")
    cfg = cfg or config.load_config()
    lang_label = "natural, concise English subtitles (<=80 chars per cue)" if target_lang == "en" else "自然简洁的简体中文字幕"
    items_txt = "\n".join(f'{ln["i"]}: {str(ln.get("text") or "").strip()}' for ln in valid[:160])
    prompt = (
        f"You are a professional subtitle translator for short-form creator videos.\n"
        f"Translate every numbered line below into {lang_label}. Keep meaning sharp and spoken-natural.\n\n"
        f"{items_txt}\n\n"
        'Return strictly a JSON object mapping string line numbers to translated strings, e.g. {"0": "...", "1": "..."}.'
    )
    res = ai.run_prompt(prompt, cfg=cfg, timeout=120)
    parsed = ai.extract_json_block(res["text"])
    if not isinstance(parsed, dict):
        raise CutError("字幕翻译返回格式无法解析为 JSON，请重试")

    cues: list[str] = []
    idx_out = 1
    for pos, ln in enumerate(valid):
        orig = str(ln.get("text") or "").strip()
        tr = str(parsed.get(str(ln.get("i"))) or parsed.get(ln.get("i")) or orig).strip()
        start = float(ln.get("start") if ln.get("start") is not None else pos * 3.0)
        end = float(ln.get("end") if ln.get("end") is not None else start + 2.8)
        if end <= start:
            end = start + 1.5
        body = f"{tr}\n{orig}" if bilingual and tr != orig else tr
        cues.append(f"{idx_out}\n{_fmt_srt_ts(start)} --> {_fmt_srt_ts(end)}\n{body}")
        idx_out += 1

    out_path.parent.mkdir(parents=True, exist_ok=True)
    srt_text = "\n\n".join(cues) + "\n"
    out_path.write_text(srt_text, encoding="utf-8")
    return {
        "ok": True,
        "path": str(out_path),
        "cues": len(cues),
        "targetLang": target_lang,
        "bilingual": bilingual,
        "preview": "\n\n".join(cues[:6]),
        "backend": res["backend"],
        "model": res["model"],
    }


JOBS = CutJobManager()
