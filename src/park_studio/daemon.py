"""macOS launchd 后台守护进程生成与状态检测（开机自启 + 崩溃自动拉起）。"""
from __future__ import annotations

import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

from . import config

LABEL = "com.parkstudio.server"


def plist_path() -> Path:
    return Path.home() / "Library/LaunchAgents" / f"{LABEL}.plist"


def render_plist(port: int = 8792) -> str:
    py = sys.executable or shutil.which("python3") or "/usr/local/bin/python3"
    src_dir = str(Path(__file__).resolve().parent.parent)
    log_dir = config.data_dir() / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>{LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>{py}</string>
    <string>-m</string>
    <string>park_studio.server</string>
    <string>serve</string>
    <string>--host</string>
    <string>127.0.0.1</string>
    <string>--port</string>
    <string>{port}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PYTHONPATH</key>
    <string>{src_dir}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>{log_dir / "server.out.log"}</string>
  <key>StandardErrorPath</key>
  <string>{log_dir / "server.err.log"}</string>
</dict>
</plist>
"""


def daemon_status() -> dict[str, Any]:
    path = plist_path()
    installed = path.is_file()
    loaded = False
    if platform.system() == "Darwin" and installed:
        try:
            r = subprocess.run(["launchctl", "list", LABEL], capture_output=True, text=True, timeout=2, check=False)
            loaded = r.returncode == 0
        except Exception:
            loaded = False
    return {
        "os": platform.system(),
        "label": LABEL,
        "plistPath": str(path),
        "installed": installed,
        "loaded": loaded,
    }


def install_launchd(port: int = 8792, *, load: bool = False) -> dict[str, Any]:
    if platform.system() != "Darwin":
        raise RuntimeError("当前系统不是 macOS，无法生成 launchd 配置")
    path = plist_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render_plist(port=port), encoding="utf-8")
    if load:
        subprocess.run(["launchctl", "unload", str(path)], capture_output=True, check=False)
        subprocess.run(["launchctl", "load", "-w", str(path)], capture_output=True, check=False)
    return daemon_status()
