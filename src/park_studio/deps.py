"""Park Studio 本地依赖体检与一键安装器（Standalone 开箱即用核心模块）。

支持检测并一键安装：
- ffmpeg（视频粗剪、-16 LUFS 响度统一、ASS 字幕烧录、封面抽帧排版）
- mlx-whisper / faster-whisper（本机零费用离线语音转写）
- yt-dlp（粘贴 YouTube / B 站 / 抖音 / X 链接自动抓字幕与音频用于 7 角度拆解）
- node（可选：用于 Remotion / HTML 渲染类高级剪辑脚本）
- chrome（专用 Chrome 隔离多平台填表）
"""
from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

EXTRA_PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"


def _env() -> dict[str, str]:
    env = dict(os.environ)
    env["PATH"] = f"{EXTRA_PATH}:{env.get('PATH', '')}"
    return env


def _which(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    for prefix in ("/opt/homebrew/bin", "/usr/local/bin", str(Path.home() / ".local/bin"), str(Path(sys.executable).parent)):
        cand = Path(prefix) / name
        if cand.is_file() and os.access(cand, os.X_OK):
            return str(cand)
    return ""


def _can_import(mod: str) -> bool:
    try:
        __import__(mod)
        return True
    except Exception:
        return False


def _detect_chrome() -> str:
    for cand in (
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    ):
        if Path(cand).is_file():
            return cand
    return _which("google-chrome") or _which("chromium")


def check_all_deps() -> dict[str, Any]:
    arch = platform.machine().lower()
    is_apple_silicon = platform.system() == "Darwin" and arch in ("arm64", "aarch64")

    ff = _which("ffmpeg")
    ytdlp = _which("yt-dlp") or (sys.executable if _can_import("yt_dlp") else "")
    has_mlx = _can_import("mlx_whisper") or bool(_which("mlx_whisper"))
    has_faster = _can_import("faster_whisper")
    whisper_ready = has_mlx or has_faster
    whisper_name = "mlx-whisper" if has_mlx else ("faster-whisper" if has_faster else ("mlx-whisper" if is_apple_silicon else "faster-whisper"))
    node = _which("node")
    chrome = _detect_chrome()
    brew = _which("brew")

    items = [
        {
            "id": "ffmpeg",
            "name": "FFmpeg",
            "role": "本地粗剪、响度统一、字幕烧录与封面生成",
            "installed": bool(ff),
            "path": ff,
            "required": True,
            "installable": bool(brew),
            "hint": "brew install ffmpeg",
        },
        {
            "id": "whisper",
            "name": whisper_name,
            "role": "本机零费用离线语音转写 + 自动标口误",
            "installed": whisper_ready,
            "path": whisper_name if whisper_ready else "",
            "required": True,
            "installable": True,
            "hint": f"pip install {'mlx-whisper' if is_apple_silicon else 'faster-whisper'}",
        },
        {
            "id": "ytdlp",
            "name": "yt-dlp",
            "role": "粘贴视频链接自动拉取字幕用于 7 角度爆款拆解",
            "installed": bool(ytdlp),
            "path": ytdlp,
            "required": True,
            "installable": True,
            "hint": "pip install yt-dlp",
        },
        {
            "id": "node",
            "name": "Node.js",
            "role": "可选：支持剪辑 Agent 运行 Remotion / HTML 动效与封面脚本",
            "installed": bool(node),
            "path": node,
            "required": False,
            "installable": bool(brew),
            "hint": "brew install node",
        },
        {
            "id": "chrome",
            "name": "Google Chrome",
            "role": "隔离 Profile 专用浏览器（12 平台自动填表与采数）",
            "installed": bool(chrome),
            "path": chrome,
            "required": True,
            "installable": False,
            "hint": "https://www.google.com/chrome/",
        },
    ]
    missing_installable = [it["id"] for it in items if not it["installed"] and it["installable"]]
    required_ready = all(it["installed"] for it in items if it["required"])
    return {
        "arch": arch,
        "isAppleSilicon": is_apple_silicon,
        "hasBrew": bool(brew),
        "requiredReady": required_ready,
        "missingInstallable": missing_installable,
        "items": items,
    }


def install_deps(targets: list[str] | None = None, *, log: Callable[[str], None] | None = None) -> dict[str, Any]:
    """按需自动安装缺失的本地依赖（pip / brew），返回安装后完整体检结果。"""
    _log = log or (lambda _m: None)
    status = check_all_deps()
    want = targets if targets else status["missingInstallable"]
    want = [t for t in want if t in ("ffmpeg", "whisper", "ytdlp", "node")]
    if not want:
        _log("所有可自动安装的依赖已就绪 ✓")
        return {"ok": True, "installed": [], "deps": status}

    env = _env()
    brew = _which("brew")
    is_as = status["isAppleSilicon"]
    installed: list[str] = []

    def _run_cmd(argv: list[str], label: str) -> bool:
        _log(f"正在安装 {label}：{' '.join(argv)}")
        proc = subprocess.Popen(
            argv,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            env=env,
        )
        assert proc.stdout is not None
        tail: list[str] = []
        for raw in proc.stdout:
            line = raw.strip()
            if line:
                tail.append(line)
                if len(tail) % 6 == 1 or any(k in line.lower() for k in ("successfully", "pouring", "error", "already", "installed")):
                    _log(line[:140])
        rc = proc.wait()
        if rc == 0:
            _log(f"✓ {label} 安装完成")
            return True
        _log(f"✗ {label} 安装失败（退出码 {rc}）：{' | '.join(tail[-2:])[:180]}")
        return False

    for dep in want:
        if dep == "ytdlp":
            if _run_cmd([sys.executable, "-m", "pip", "install", "-U", "yt-dlp"], "yt-dlp"):
                installed.append("ytdlp")
        elif dep == "whisper":
            pkg = "mlx-whisper" if is_as else "faster-whisper"
            if _run_cmd([sys.executable, "-m", "pip", "install", "-U", pkg], pkg):
                installed.append("whisper")
        elif dep == "ffmpeg":
            if not brew:
                _log("未检测到 Homebrew，无法自动安装 ffmpeg（请先安装 brew.sh 或手工装 ffmpeg）")
            elif _run_cmd([brew, "install", "ffmpeg"], "FFmpeg"):
                installed.append("ffmpeg")
        elif dep == "node":
            if not brew:
                _log("未检测到 Homebrew，无法自动安装 Node.js")
            elif _run_cmd([brew, "install", "node"], "Node.js"):
                installed.append("node")

    after = check_all_deps()
    return {"ok": len(installed) == len(want), "installed": installed, "deps": after}
