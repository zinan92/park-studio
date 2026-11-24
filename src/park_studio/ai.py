"""统一本地 AI 引擎：默认支持 Gemini CLI（支持 neon / 自定义模型）、Claude Code CLI、Codex CLI 及可选 OpenAI 兼容 API。"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import httpx

from . import config

EXTRA_PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"


class AIError(RuntimeError):
    """给用户看的清晰中文报错。"""


def _which(name: str) -> str | None:
    found = shutil.which(name)
    if found:
        return found
    for prefix in ("/opt/homebrew/bin", "/usr/local/bin", str(Path.home() / ".local/bin")):
        cand = Path(prefix) / name
        if cand.is_file() and os.access(cand, os.X_OK):
            return str(cand)
    return None


def detect_agents() -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for key, binary, hint in (
        ("agy", "agy", "安装 Antigravity CLI（antigravity.google）并运行 agy 登录"),
        ("gemini", "gemini", "brew install gemini-cli 或改用 Antigravity CLI / GEMINI_API_KEY"),
        ("claude", "claude", "安装 Claude Code 后在终端运行 claude 登录"),
        ("codex", "codex", "安装 Codex CLI 后在终端运行 codex login"),
    ):
        path = _which(binary)
        out[key] = {"installed": bool(path), "path": path or "", "hint": hint}
    has_gkey = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
    out["gemini-api"] = {
        "installed": has_gkey,
        "path": "ENV:GOOGLE_API_KEY" if os.environ.get("GOOGLE_API_KEY") else ("ENV:GEMINI_API_KEY" if has_gkey else ""),
        "hint": "设置环境变量 GEMINI_API_KEY 或 GOOGLE_API_KEY（无需单独登录 CLI）",
    }
    return out


def _env() -> dict[str, str]:
    env = dict(os.environ)
    env["PATH"] = f"{EXTRA_PATH}:{env.get('PATH', '')}"
    return env


def build_agy_argv(prompt: str, *, model: str = "") -> list[str]:
    binary = _which("agy") or "agy"
    argv = [binary, "-p", prompt, "--output-format", "text"]
    m = (model or "").strip()
    if m and m.lower() != "neon":
        argv += ["--model", m]
    return argv


def build_gemini_argv(prompt: str, *, model: str = "") -> list[str]:
    binary = _which("gemini") or "gemini"
    argv = [binary]
    m = (model or "").strip()
    if m:
        argv += ["-m", m]
    argv += ["-p", prompt, "-o", "text"]
    return argv


def build_claude_argv(prompt: str, *, model: str = "") -> list[str]:
    binary = _which("claude") or "claude"
    argv = [binary, "-p", prompt, "--output-format", "text"]
    m = (model or "").strip()
    if m and not m.lower().startswith("gemini") and m.lower() != "neon":
        argv += ["--model", m]
    return argv


def build_codex_argv(out_file: str, *, model: str = "") -> list[str]:
    binary = _which("codex") or "codex"
    argv = [binary, "exec", "--ignore-user-config", "--skip-git-repo-check",
            "-c", 'sandbox_mode="read-only"', "-o", out_file]
    m = (model or "").strip()
    if m and not m.lower().startswith("gemini") and m.lower() != "neon":
        argv += ["-m", m]
    argv += ["--ephemeral", "-"]
    return argv


def _clean_cli_output(text: str) -> str:
    # 去掉 Gemini/Codex CLI 常见的状态杂音行
    lines = []
    for ln in (text or "").splitlines():
        s = ln.strip()
        if s.startswith(("Loaded cached credentials", "Hook registry", "Warning:", "[WARN]")):
            continue
        lines.append(ln)
    return "\n".join(lines).strip()


def run_prompt(
    prompt: str,
    *,
    system: str = "",
    cfg: dict[str, Any] | None = None,
    timeout: int = 120,
    runner: Any = subprocess.run,
) -> dict[str, Any]:
    """统一执行一次 AI 请求，返回 {"text", "backend", "model"}。"""
    cfg = cfg or config.load_config()
    backend = str(cfg.get("aiBackend") or "gemini").strip().lower()
    model = str(cfg.get("aiModel") or "").strip()
    full_prompt = f"<instructions>\n{system.strip()}\n</instructions>\n\n{prompt.strip()}" if system.strip() else prompt.strip()

    if backend == "api":
        return _run_api(full_prompt, cfg=cfg, timeout=timeout)

    if backend == "gemini-api":
        return _run_gemini_api(full_prompt, model=model, cfg=cfg, timeout=timeout)

    if backend == "agy":
        if not _which("agy") and runner is subprocess.run:
            if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
                return _run_gemini_api(full_prompt, model=model, cfg=cfg, timeout=timeout)
            raise AIError("本机未检测到 agy（Antigravity CLI），可前往 antigravity.google 安装，或直接改用 Gemini API（自动读取 GOOGLE_API_KEY / GEMINI_API_KEY）")
        argv = build_agy_argv(full_prompt, model=model)
        try:
            done = runner(argv, capture_output=True, text=True, timeout=timeout, env=_env(), check=False)
        except subprocess.TimeoutExpired as exc:
            raise AIError(f"Antigravity CLI (agy) 超时（>{timeout}s），请稍后重试") from exc
        if done.returncode != 0:
            detail = (done.stderr or done.stdout or "未知错误").strip()[-280:]
            raise AIError(f"Antigravity CLI (agy) 执行失败：{detail}")
        text = _clean_cli_output(done.stdout)
        if not text:
            raise AIError("Antigravity CLI (agy) 返回为空，请检查登录状态")
        return {"text": text, "backend": "agy", "model": model or "default"}

    if backend == "gemini":
        if not _which("gemini") and runner is subprocess.run:
            if _which("agy"):
                return run_prompt(prompt, system=system, cfg={**cfg, "aiBackend": "agy"}, timeout=timeout, runner=runner)
            if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
                return _run_gemini_api(full_prompt, model=model, cfg=cfg, timeout=timeout)
            raise AIError("本机未检测到 gemini / agy CLI，且未设置 GEMINI_API_KEY / GOOGLE_API_KEY")
        argv = build_gemini_argv(full_prompt, model=model)
        try:
            done = runner(argv, capture_output=True, text=True, timeout=timeout, env=_env(), check=False)
        except subprocess.TimeoutExpired as exc:
            raise AIError(f"Gemini CLI 超时（>{timeout}s），请稍后重试") from exc
        if done.returncode != 0 and model:
            # 如果指定的模型别名（如 neon）不被当前 CLI 版本识别，自动退回默认模型再试一次
            err_low = (done.stderr or "").lower()
            if any(k in err_low for k in ("model", "not found", "invalid", "404")):
                fallback_argv = build_gemini_argv(full_prompt, model="")
                done = runner(fallback_argv, capture_output=True, text=True, timeout=timeout, env=_env(), check=False)
                if done.returncode == 0:
                    model = "default (fallback)"
        if done.returncode != 0:
            # 个人版 gemini-cli Code Assist 停服时，自动无缝回退到 Antigravity CLI 或本机 GOOGLE_API_KEY / GEMINI_API_KEY
            if runner is subprocess.run:
                if _which("agy"):
                    return run_prompt(prompt, system=system, cfg={**cfg, "aiBackend": "agy"}, timeout=timeout, runner=runner)
                if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
                    return _run_gemini_api(full_prompt, model=model, cfg=cfg, timeout=timeout)
            detail = (done.stderr or done.stdout or "未知错误").strip()[-280:]
            raise AIError(f"Gemini CLI 执行失败：{detail}")
        text = _clean_cli_output(done.stdout)
        if not text:
            raise AIError("Gemini CLI 返回为空，请检查登录状态（终端运行 gemini 确认）")
        return {"text": text, "backend": "gemini", "model": model or "default"}

    if backend == "claude":
        if not _which("claude") and runner is subprocess.run:
            raise AIError("本机未检测到 claude CLI，请先安装并运行 claude 登录")
        argv = build_claude_argv(full_prompt, model=model)
        done = runner(argv, capture_output=True, text=True, timeout=timeout, env=_env(), check=False)
        if done.returncode != 0:
            raise AIError(f"Claude CLI 执行失败：{(done.stderr or done.stdout or '').strip()[-260:]}")
        text = (done.stdout or "").strip()
        if not text:
            raise AIError("Claude CLI 返回为空")
        return {"text": text, "backend": "claude", "model": model or "default"}

    if backend == "codex":
        if not _which("codex") and runner is subprocess.run:
            raise AIError("本机未检测到 codex CLI，请先安装并运行 codex login")
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tmp:
            out_path = tmp.name
        try:
            argv = build_codex_argv(out_path, model=model)
            done = runner(argv, input=full_prompt, capture_output=True, text=True, timeout=timeout, env=_env(), check=False)
            if done.returncode != 0:
                raise AIError(f"Codex CLI 执行失败：{(done.stderr or done.stdout or '').strip()[-260:]}")
            text = Path(out_path).read_text(encoding="utf-8", errors="replace").strip() if Path(out_path).is_file() else ""
            if not text:
                text = (done.stdout or "").strip()
            if not text:
                raise AIError("Codex CLI 返回为空")
            return {"text": text, "backend": "codex", "model": model or "default"}
        finally:
            try:
                Path(out_path).unlink(missing_ok=True)
            except OSError:
                pass

    raise AIError(f"不支持的 AI 后端：{backend}")


def _run_gemini_api(prompt: str, *, model: str = "", cfg: dict[str, Any], timeout: int) -> dict[str, Any]:
    key = str(cfg.get("geminiApiKey") or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or cfg.get("apiKey") or "").strip()
    if not key:
        raise AIError("未找到 GEMINI_API_KEY 或 GOOGLE_API_KEY，请在环境变量中设置或改用 Antigravity CLI (agy)")
    m = (model or "").strip()
    if not m or m.lower() in ("neon", "default", "default (fallback)") or not m.lower().startswith("gemini"):
        m = "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"
    resp = httpx.post(
        url,
        params={"key": key},
        headers={"Content-Type": "application/json"},
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=timeout,
    )
    if resp.status_code == 404 and m != "gemini-2.5-flash":
        m = "gemini-2.5-flash"
        resp = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent",
            params={"key": key},
            headers={"Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=timeout,
        )
    if resp.status_code >= 400:
        raise AIError(f"Gemini API 返回 {resp.status_code}：{resp.text[:220]}")
    data = resp.json()
    parts = (((data.get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
    text = "".join(str(p.get("text") or "") for p in parts).strip()
    if not text:
        raise AIError("Gemini API 返回为空")
    return {"text": text, "backend": "gemini-api", "model": m}


def _run_api(prompt: str, *, cfg: dict[str, Any], timeout: int) -> dict[str, Any]:
    base = str(cfg.get("apiBaseUrl") or "https://api.deepseek.com/v1").rstrip("/")
    is_local = any(h in base.lower() for h in ("127.0.0.1", "localhost", "0.0.0.0"))
    key = str(cfg.get("apiKey") or os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENAI_API_KEY") or ("ollama" if is_local else "")).strip()
    if not key:
        raise AIError("选择了可选 API 模式但未填写 API Key（请在「系统 → 全局 Agent」填写 API Key，或切回本机 Gemini / Antigravity / Claude / Codex）")
    model = str(cfg.get("apiModel") or "deepseek-chat")
    resp = httpx.post(
        f"{base}/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": model, "messages": [{"role": "user", "content": prompt}]},
        timeout=timeout,
    )
    if resp.status_code >= 400:
        raise AIError(f"API 返回 {resp.status_code}：{resp.text[:200]}")
    data = resp.json()
    text = (((data.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()
    if not text:
        raise AIError("API 返回为空")
    return {"text": text, "backend": "api", "model": model}


def extract_json_block(text: str) -> Any:
    """从 AI 返回文本中安全提取 JSON 对象或数组。"""
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    cand = m.group(1).strip() if m else text.strip()
    try:
        return json.loads(cand)
    except ValueError:
        for opener, closer in (("{", "}"), ("[", "]")):
            i, j = cand.find(opener), cand.rfind(closer)
            if i != -1 and j > i:
                try:
                    return json.loads(cand[i : j + 1])
                except ValueError:
                    pass
    return None


def run_cut_prompt(
    prompt: str,
    *,
    system: str = "",
    cfg: dict[str, Any] | None = None,
    timeout: int = 120,
    runner: Any = subprocess.run,
) -> dict[str, Any]:
    """按系统设置中的「独立剪辑 Agent」（cutAgentBackend / cutAgentModel / cutAgentCmd）执行剪辑规划或指令。"""
    cfg = cfg or config.load_config()
    cut_backend = str(cfg.get("cutAgentBackend") or "inherit").strip().lower()
    if not cut_backend or cut_backend == "inherit":
        return run_prompt(prompt, system=system, cfg=cfg, timeout=timeout, runner=runner)

    if cut_backend == "custom":
        cmd_tpl = str(cfg.get("cutAgentCmd") or "").strip()
        if not cmd_tpl:
            raise AIError("独立剪辑 Agent 选了「自定义命令」，但未填写 CLI 命令")
        done = runner(cmd_tpl, input=prompt, shell=True, capture_output=True, text=True, timeout=timeout, env=_env(), check=False)
        if done.returncode != 0:
            raise AIError(f"自定义剪辑命令执行失败：{(done.stderr or done.stdout or '').strip()[-260:]}")
        return {"text": (done.stdout or "").strip(), "backend": "custom", "model": cmd_tpl.split()[0]}

    override = {
        **cfg,
        "aiBackend": cut_backend,
        "aiModel": str(cfg.get("cutAgentModel") or "").strip(),
    }
    return run_prompt(prompt, system=system, cfg=override, timeout=timeout, runner=runner)
