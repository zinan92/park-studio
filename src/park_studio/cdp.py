"""统一专用 Chrome CDP 管理器（~/.park-studio/chrome-profile，默认调试端口 9333）。

完全 MIT 开源原生实现，零闭源插件依赖：
- 独立 Chrome Profile，不污染用户日常浏览器，一次扫码长期保活。
- 通过 Chrome DevTools Protocol (HTTP + WebSocket) 控制标签页、执行页面检测与数据读取。
- 自动接受「离开此网站？」弹窗，防止后台采集卡死。
"""
from __future__ import annotations

import asyncio
import json
import os
import platform
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any, Awaitable, Callable

import httpx
import websockets

from . import config


def find_chrome_binary() -> str | None:
    sys_name = platform.system()
    candidates: list[str] = []
    if sys_name == "Darwin":
        candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ]
    elif sys_name == "Windows":
        local_app = os.environ.get("LOCALAPPDATA", "")
        prog_files = os.environ.get("PROGRAMFILES", r"C:\Program Files")
        candidates = [
            str(Path(prog_files) / "Google/Chrome/Application/chrome.exe"),
            str(Path(local_app) / "Google/Chrome/Application/chrome.exe"),
        ]
    else:
        candidates = [
            shutil.which("google-chrome") or "",
            shutil.which("google-chrome-stable") or "",
            shutil.which("chromium") or "",
            shutil.which("chromium-browser") or "",
        ]
    for path in candidates:
        if path and Path(path).is_file():
            return path
    return shutil.which("google-chrome") or shutil.which("chromium")


def _port_of(cfg: dict[str, Any] | None = None) -> int:
    cfg = cfg or config.load_config()
    return int(cfg.get("chromePort") or 9333)


def _profile_of(cfg: dict[str, Any] | None = None) -> Path:
    cfg = cfg or config.load_config()
    raw = str(cfg.get("chromeProfile") or "~/.park-studio/chrome-profile")
    return Path(raw).expanduser()


def chrome_status(cfg: dict[str, Any] | None = None) -> dict[str, Any]:
    """非侵入式探测专用 Chrome 是否在线（不自动拉起）。"""
    cfg = cfg or config.load_config()
    port = _port_of(cfg)
    profile = _profile_of(cfg)
    binary = find_chrome_binary()
    base = f"http://127.0.0.1:{port}"
    try:
        with httpx.Client(timeout=1.5, trust_env=False) as client:
            ver = client.get(f"{base}/json/version").json()
            tabs = client.get(f"{base}/json/list").json()
            page_tabs = [t for t in tabs if isinstance(t, dict) and t.get("type") == "page"]
            return {
                "online": True,
                "port": port,
                "profile": str(profile),
                "binary": binary,
                "browser": ver.get("Browser", "Chrome"),
                "ws_url": ver.get("webSocketDebuggerUrl", ""),
                "tabs": len(page_tabs),
            }
    except Exception:
        return {
            "online": False,
            "port": port,
            "profile": str(profile),
            "binary": binary,
            "browser": "",
            "ws_url": "",
            "tabs": 0,
        }


def _bring_to_front_macos(port: int) -> None:
    if platform.system() != "Darwin":
        return
    try:
        out = subprocess.check_output(
            ["lsof", "-ti", f"tcp:{port}", "-sTCP:LISTEN"],
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=2,
        ).strip()
        pid = out.splitlines()[0].strip() if out else ""
        if pid.isdigit():
            subprocess.run(
                [
                    "osascript",
                    "-e",
                    f'tell application "System Events" to set frontmost of (first process whose unix id is {pid}) to true',
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=3,
                check=False,
            )
    except Exception:
        pass


def ensure_chrome(cfg: dict[str, Any] | None = None, *, foreground: bool = False, timeout_s: float = 12.0) -> dict[str, Any]:
    """确保专用 Chrome 在调试端口上运行；若未启动则使用独立 Profile 启动。"""
    cfg = cfg or config.load_config()
    st = chrome_status(cfg)
    if st["online"]:
        if foreground:
            _bring_to_front_macos(st["port"])
        return st

    binary = st.get("binary") or find_chrome_binary()
    if not binary:
        raise RuntimeError("未在本机找到 Google Chrome，请先安装 Chrome 浏览器")

    port = st["port"]
    profile = Path(st["profile"])
    profile.mkdir(parents=True, exist_ok=True)
    argv = [
        binary,
        f"--user-data-dir={profile}",
        f"--remote-debugging-port={port}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-background-timer-throttling",
        "--window-size=1480,980",
    ]
    subprocess.Popen(
        argv,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )

    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        time.sleep(0.45)
        st = chrome_status(cfg)
        if st["online"]:
            if foreground:
                _bring_to_front_macos(port)
            return st
    raise RuntimeError(f"专用 Chrome 启动超时（端口 {port} 未响应）")


class CDPClient:
    """轻量级异步 Chrome DevTools Protocol 客户端（单会话安全复用）。"""

    def __init__(self, ws_url: str, *, cmd_timeout: float = 35.0) -> None:
        self.ws_url = ws_url
        self.cmd_timeout = cmd_timeout
        self._ws: Any = None
        self._seq = 0
        self._pending: dict[int, asyncio.Future[Any]] = {}
        self._reader_task: asyncio.Task[Any] | None = None
        self._session_targets: dict[str, str] = {}
        self._session_aliases: dict[str, str] = {}

    async def __aenter__(self) -> "CDPClient":
        self._ws = await websockets.connect(self.ws_url, max_size=16 * 1024 * 1024, proxy=None)
        self._reader_task = asyncio.create_task(self._read_loop())
        await self.send("Target.setDiscoverTargets", {"discover": True})
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except BaseException:
                pass
        if self._ws is not None:
            try:
                await self._ws.close()
            except Exception:
                pass
        for fut in self._pending.values():
            if not fut.done():
                fut.set_exception(RuntimeError("CDP 连接已关闭"))
        self._pending.clear()

    async def _read_loop(self) -> None:
        try:
            async for raw in self._ws:
                msg = json.loads(raw)
                mid = msg.get("id")
                if mid is not None and mid in self._pending:
                    fut = self._pending.pop(mid)
                    if not fut.done():
                        if "error" in msg:
                            fut.set_exception(RuntimeError(msg["error"].get("message", "CDP error")))
                        else:
                            fut.set_result(msg.get("result") or {})
                    continue
                if msg.get("method") == "Page.javascriptDialogOpening" and msg.get("sessionId"):
                    asyncio.create_task(
                        self._safe_send("Page.handleJavaScriptDialog", {"accept": True}, msg["sessionId"])
                    )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            for fut in self._pending.values():
                if not fut.done():
                    fut.set_exception(RuntimeError(f"CDP 读取中断: {exc}"))
            self._pending.clear()

    async def _safe_send(self, method: str, params: dict[str, Any], session_id: str | None = None) -> None:
        try:
            await self.send(method, params, session_id=session_id)
        except Exception:
            pass

    async def send(self, method: str, params: dict[str, Any] | None = None, *, session_id: str | None = None) -> dict[str, Any]:
        self._seq += 1
        cid = self._seq
        payload: dict[str, Any] = {"id": cid, "method": method, "params": params or {}}
        if session_id:
            payload["sessionId"] = session_id
        loop = asyncio.get_running_loop()
        fut: asyncio.Future[Any] = loop.create_future()
        self._pending[cid] = fut
        await self._ws.send(json.dumps(payload))
        return await asyncio.wait_for(fut, timeout=self.cmd_timeout)

    async def create_tab(self, url: str = "about:blank", *, active: bool = False) -> str:
        res = await self.send("Target.createTarget", {"url": url, "background": not active})
        return str(res["targetId"])

    async def close_tab(self, target_id: str) -> None:
        try:
            await self.send("Target.closeTarget", {"targetId": target_id})
        except Exception:
            pass

    async def attach(self, target_id: str) -> str:
        res = await self.send("Target.attachToTarget", {"targetId": target_id, "flatten": True})
        sid = str(res["sessionId"])
        self._session_targets[sid] = target_id
        await self.send("Page.enable", {}, session_id=sid)
        return sid

    async def evaluate(self, session_id: str, expression: str, *, await_promise: bool = True) -> Any:
        active_sid = self._session_aliases.get(session_id, session_id)
        try:
            res = await self.send(
                "Runtime.evaluate",
                {
                    "expression": expression,
                    "returnByValue": True,
                    "awaitPromise": await_promise,
                },
                session_id=active_sid,
            )
        except RuntimeError as exc:
            # 跨源导航切换渲染进程可能导致旧 sessionId 失效，自动重新 attach 到同一 targetId
            tid = self._session_targets.get(active_sid) or self._session_targets.get(session_id)
            if tid and ("Session" in str(exc) or "Target" in str(exc) or "Execution context" in str(exc)):
                new_sid = await self.attach(tid)
                self._session_aliases[session_id] = new_sid
                res = await self.send(
                    "Runtime.evaluate",
                    {
                        "expression": expression,
                        "returnByValue": True,
                        "awaitPromise": await_promise,
                    },
                    session_id=new_sid,
                )
            else:
                raise
        if "exceptionDetails" in res:
            desc = (res["exceptionDetails"].get("exception") or {}).get("description") or res["exceptionDetails"].get("text")
            raise RuntimeError(str(desc or "JS evaluation error"))
        return (res.get("result") or {}).get("value")

    async def set_file_input(self, session_id: str, selector: str, files: list[str]) -> bool:
        """通过原生 CDP DOM.setFileInputFiles 直接向文件上传框注入本地路径（支持递归穿透 Shadow DOM，如视频号 wujie-app / YouTube Polymer）。"""
        active_sid = self._session_aliases.get(session_id, session_id)
        await self.send("DOM.enable", {}, session_id=active_sid)
        expr = f"""(() => {{
          function queryDeep(root, sel) {{
            if (!root) return null;
            const hit = root.querySelector(sel);
            if (hit) return hit;
            for (const el of root.querySelectorAll('*')) {{
              if (el.shadowRoot) {{
                const inner = queryDeep(el.shadowRoot, sel);
                if (inner) return inner;
              }}
            }}
            return null;
          }}
          return queryDeep(document, {json.dumps(selector)});
        }})()"""
        ev = await self.send(
            "Runtime.evaluate",
            {"expression": expr, "returnByValue": False},
            session_id=active_sid,
        )
        obj_id = (ev.get("result") or {}).get("objectId")
        node_id = 0
        if obj_id:
            try:
                req = await self.send("DOM.requestNode", {"objectId": obj_id}, session_id=active_sid)
                node_id = int(req.get("nodeId") or 0)
            except Exception:
                node_id = 0
        if not node_id:
            doc = await self.send("DOM.getDocument", {"depth": -1, "pierce": True}, session_id=active_sid)
            root_id = (doc.get("root") or {}).get("nodeId")
            if root_id:
                q = await self.send("DOM.querySelector", {"nodeId": root_id, "selector": selector}, session_id=active_sid)
                node_id = int(q.get("nodeId") or 0)
        if not node_id:
            return False
        await self.send("DOM.setFileInputFiles", {"nodeId": node_id, "files": files}, session_id=active_sid)
        return True

    async def insert_text(self, session_id: str, text: str) -> None:
        """向当前聚焦输入框/富文本编辑器原生输入文字（兼容 React/Vue/DraftJS）。"""
        active_sid = self._session_aliases.get(session_id, session_id)
        await self.send("Input.insertText", {"text": text}, session_id=active_sid)

    async def clear_focused_text(self, session_id: str) -> None:
        """全选并清空当前聚焦可编辑元素（用于替换 YouTube 预填文件名等场景）。"""
        active_sid = self._session_aliases.get(session_id, session_id)
        await self.evaluate(
            session_id,
            """(() => {
              try {
                document.execCommand('selectAll', false, null);
                document.execCommand('delete', false, null);
              } catch (e) {}
            })()""",
        )
        await self.send("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Backspace", "code": "Backspace", "windowsVirtualKeyCode": 8}, session_id=active_sid)
        await self.send("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Backspace", "code": "Backspace", "windowsVirtualKeyCode": 8}, session_id=active_sid)

    async def capture_screenshot(self, session_id: str, out_path: Path) -> Path:
        """截取当前标签页提交前存档截图（JPEG）。"""
        import base64

        active_sid = self._session_aliases.get(session_id, session_id)
        res = await self.send("Page.captureScreenshot", {"format": "jpeg", "quality": 82}, session_id=active_sid)
        data = res.get("data") or ""
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_bytes(base64.b64decode(data))
        return out_path

    async def with_tab(
        self,
        url: str,
        fn: Callable[[str, str], Awaitable[Any]],
        *,
        wait_s: float = 4.0,
        active: bool = False,
        keep_open: bool = False,
    ) -> Any:
        target_id = await self.create_tab(url, active=active)
        try:
            await asyncio.sleep(0.5)
            session_id = await self.attach(target_id)
            if wait_s > 0:
                await asyncio.sleep(wait_s)
            return await fn(session_id, target_id)
        finally:
            if not keep_open:
                await self.close_tab(target_id)


async def export_cookies(out_path: Path, cfg: dict[str, Any] | None = None) -> dict[str, Any]:
    """通过原生 CDP Storage.getCookies 导出当前专用 Chrome 里的已解密 Cookies（供跨 Mac 迁移登录态）。"""
    cfg = cfg or config.load_config()
    st = ensure_chrome(cfg, foreground=False)
    async with CDPClient(st["ws_url"], cmd_timeout=20.0) as client:
        res = await client.send("Storage.getCookies", {})
        cookies = res.get("cookies") or []
    target = Path(out_path).expanduser().resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema": "park-studio/cookies/v1",
        "exported_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(cookies),
        "cookies": cookies,
    }
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        os.chmod(target, 0o600)
    except OSError:
        pass
    domains = sorted({str(c.get("domain") or "").lstrip(".") for c in cookies if c.get("domain")})
    return {"ok": True, "path": str(target), "count": len(cookies), "domainsCount": len(domains)}


async def import_cookies(in_path: Path, cfg: dict[str, Any] | None = None) -> dict[str, Any]:
    """通过原生 CDP Storage.setCookies 将旧电脑导出的 Cookies 注入本机专用 Chrome Profile。"""
    src = Path(in_path).expanduser().resolve()
    if not src.is_file():
        raise FileNotFoundError(f"找不到 Cookie 文件：{src}")
    raw = json.loads(src.read_text(encoding="utf-8"))
    raw_cookies = raw.get("cookies") if isinstance(raw, dict) else (raw if isinstance(raw, list) else [])
    if not isinstance(raw_cookies, list) or not raw_cookies:
        raise ValueError("Cookie 文件为空或格式不正确（需要 park-studio cookies export 导出的 JSON）")

    allowed_keys = {
        "name", "value", "domain", "path", "secure", "httpOnly",
        "sameSite", "expires", "priority", "sameParty", "sourceScheme", "sourcePort",
    }
    cleaned: list[dict[str, Any]] = []
    for c in raw_cookies:
        if not isinstance(c, dict) or not c.get("name") or not c.get("domain"):
            continue
        item = {k: c[k] for k in allowed_keys if k in c and c[k] is not None}
        if "expires" in item:
            try:
                exp = float(item["expires"])
                if exp <= 0:
                    item.pop("expires", None)
                else:
                    item["expires"] = exp
            except (TypeError, ValueError):
                item.pop("expires", None)
        cleaned.append(item)

    cfg = cfg or config.load_config()
    st = ensure_chrome(cfg, foreground=False)
    imported = 0
    failed = 0
    async with CDPClient(st["ws_url"], cmd_timeout=30.0) as client:
        # 分批注入，避免单条坏 cookie 影响整批导入
        batch_size = 100
        for i in range(0, len(cleaned), batch_size):
            chunk = cleaned[i : i + batch_size]
            try:
                await client.send("Storage.setCookies", {"cookies": chunk})
                imported += len(chunk)
            except Exception:
                for one in chunk:
                    try:
                        await client.send("Storage.setCookies", {"cookies": [one]})
                        imported += 1
                    except Exception:
                        failed += 1
    return {"ok": True, "path": str(src), "imported": imported, "failed": failed}
