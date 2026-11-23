"""Park Studio 本地配置管理（~/.park-studio/config.yaml）。"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml

DEFAULT_CONFIG: dict[str, Any] = {
    "owner": "Park",
    "aiBackend": "gemini",          # gemini | claude | codex | api
    "aiModel": "neon",              # Gemini CLI 默认模型（留空则走 CLI 默认）
    "apiBaseUrl": "https://api.deepseek.com/v1",
    "apiKey": "",
    "apiModel": "deepseek-chat",
    "obsidianPath": "~/Documents/Obsidian",
    "newsletterItemsPath": "",
    "obsidianFolders": {
        "newsletter": "006_ai daily newsletter",
        "saved": "002_个人收藏",
        "clippings": "002_clippings",
        "writing": "003_park原始输出",
        "kline": "007_kline daily newsletter",
    },
    "projectRoot": "~/Movies/ParkStudio",
    "transcribeEngine": "mlx-whisper",
    "tikhubOptionalKey": "",
    "chromePort": 9333,
    "chromeProfile": "~/.park-studio/chrome-profile",
    "feishuEnabled": False,
    "feishuWebhook": "",
    "feishuLogin": False,
    "wechatIlinkEnabled": False,
    "siteEnabled": True,
    "siteName": "Park 知识站",
    "siteUrl": "https://xuanti.park-ai-intel.com",
    "siteAdminPath": "/admin",
    "siteDashApi": "/api/admin/dashboard",
    "communityKey": "",
    "sharedBenchmarkOptIn": True,
    "telemetryOptIn": False,
    "learnLinks": True,
    "modules": {
        "source": True,
        "tree": True,
        "clients": True,
        "site": True,
        "kline": True,
        "conversion": True,
    },
}


def data_dir() -> Path:
    raw = os.environ.get("PARK_STUDIO_DATA", "~/.park-studio")
    p = Path(raw).expanduser()
    p.mkdir(parents=True, exist_ok=True)
    return p


def config_path() -> Path:
    return data_dir() / "config.yaml"


def projects_dir() -> Path:
    p = data_dir() / "projects"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _deep_merge(base: dict[str, Any], over: dict[str, Any]) -> dict[str, Any]:
    out = dict(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def load_config() -> dict[str, Any]:
    path = config_path()
    if not path.is_file():
        save_config(DEFAULT_CONFIG)
        return _deep_merge(DEFAULT_CONFIG, {})
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except Exception:
        raw = {}
    return _deep_merge(DEFAULT_CONFIG, raw if isinstance(raw, dict) else {})


def save_config(patch: dict[str, Any]) -> dict[str, Any]:
    path = config_path()
    current = DEFAULT_CONFIG
    if path.is_file():
        try:
            loaded = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
            if isinstance(loaded, dict):
                current = _deep_merge(DEFAULT_CONFIG, loaded)
        except Exception:
            pass
    merged = _deep_merge(current, patch)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(merged, allow_unicode=True, sort_keys=False), encoding="utf-8")
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
    return merged
