"""Park Studio CLI 入口：serve / doctor (check) / cookies / static。"""
from __future__ import annotations

import argparse
import asyncio
import functools
import importlib
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

STATIC_DIR = Path(__file__).resolve().parent / "static"


class StaticPreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        if self.path.split("?", 1)[0] in ("/", ""):
            self.path = "/index.html"
        super().do_GET()

    def log_message(self, fmt: str, *args) -> None:
        pass


def _probe_port(host: str, port: int) -> str:
    """返回 'free' | 'park_studio' | 'occupied'。"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(0.6)
    try:
        if sock.connect_ex((host, port)) != 0:
            return "free"
    finally:
        sock.close()
    try:
        import httpx

        r = httpx.get(f"http://{host}:{port}/api/health", timeout=1.2, trust_env=False)
        data = r.json() if r.status_code == 200 else {}
        if isinstance(data, dict) and data.get("ok") is True and "data_dir" in data:
            return "park_studio"
    except Exception:
        pass
    return "occupied"


def cmd_doctor(host: str = "127.0.0.1", port: int = 8792) -> int:
    from . import ai, cdp, config, db, deps, vault

    print("Park Studio 环境自检（doctor）：")
    has_fail = False

    # 1. Python 版本
    ver = sys.version_info
    py_ok = ver >= (3, 11)
    if not py_ok:
        has_fail = True
    print(f"  [{'OK' if py_ok else 'FAIL'}] Python：{ver.major}.{ver.minor}.{ver.micro} ({sys.executable})"
          + ("" if py_ok else " -> 需要 Python >= 3.11"))

    # 2. 核心 Python 依赖
    missing_pkgs = []
    for mod, pkg in (("fastapi", "fastapi"), ("uvicorn", "uvicorn"), ("yaml", "pyyaml"), ("httpx", "httpx"), ("websockets", "websockets")):
        try:
            importlib.import_module(mod)
        except Exception:
            missing_pkgs.append(pkg)
    if missing_pkgs:
        has_fail = True
        print(f"  [FAIL] Python 核心依赖缺失：{', '.join(missing_pkgs)} -> 运行 pip install -e .")
    else:
        print("  [OK] Python 核心依赖：fastapi / uvicorn / pyyaml / httpx / websockets 全部就绪")

    # 3. 数据目录与 SQLite
    cfg = config.load_config()
    conn = db.connect()
    db.init_db(conn)
    print(f"  [OK] 本地数据目录：{config.data_dir()}（SQLite: {db.db_path().name}）")

    # 4. 端口检查
    pst = _probe_port(host, port)
    if pst == "free":
        print(f"  [OK] 服务端口：{host}:{port} 可用")
    elif pst == "park_studio":
        print(f"  [OK] 服务端口：{host}:{port} 已有 Park Studio 在运行")
    else:
        print(f"  [WARN] 服务端口：{host}:{port} 被其他程序占用 -> 启动时请改用 --port {port + 1}")

    # 5. Chrome / 媒体工具依赖
    d = deps.check_all_deps()
    for it in d["items"]:
        mark = "OK" if it["installed"] else ("WARN" if not it["required"] else "WARN")
        extra = it["path"] if it["installed"] else f"缺失 -> {it['hint']}"
        req_lbl = "必需" if it["required"] else "可选"
        print(f"  [{mark}] {it['name']}（{req_lbl}）：{extra}")
    cst = cdp.chrome_status(cfg)
    print(f"  [{'OK' if cst['online'] else 'INFO'}] 专用 Chrome CDP (:{cst['port']})：{'在线' if cst['online'] else '未启动（点击打开登录页/采数时会自动拉起）'}")

    # 6. Obsidian（可选）
    v = vault.vault_status(cfg)
    print(f"  [{'OK' if v['mounted'] else 'INFO'}] Obsidian 库（可选）：{v['path']}（{'已挂载' if v['mounted'] else '未挂载，不影响选题/剪辑/发布/复盘'}）")

    # 7. AI 引擎
    agents = ai.detect_agents()
    active = cfg.get("aiBackend", "gemini")
    any_ai = any(info["installed"] for info in agents.values()) or bool(cfg.get("apiKey") or cfg.get("geminiApiKey"))
    for k, info in agents.items():
        mark = "OK" if info["installed"] else "MISS"
        star = " <-- 当前默认" if k == active else ""
        print(f"  [{mark}] AI 引擎 {k}：{info['path'] or info['hint']}{star}")
    if not any_ai:
        print("  [WARN] 尚未检测到任何可用 AI CLI 或 API Key -> 请安装 claude/codex/gemini/agy 或在系统页填写 API Key")

    print("\n结论：" + ("存在必需项缺失，请按 [FAIL] 提示修复后再启动。" if has_fail else "核心运行环境已就绪 ✓ 运行 `park-studio serve` 即可启动。"))
    return 1 if has_fail else 0


def cmd_cookies(action: str, file_path: str) -> int:
    from . import cdp

    if not action or action not in ("export", "import"):
        print("用法：park-studio cookies export <cookies.json> | park-studio cookies import <cookies.json>")
        return 2
    if not file_path:
        print("请指定 Cookie JSON 文件路径，例如：park-studio cookies export ~/Desktop/park-cookies.json")
        return 2
    try:
        if action == "export":
            res = asyncio.run(cdp.export_cookies(Path(file_path)))
            print(f"✓ 已导出 {res['count']} 条 Cookies（覆盖 {res['domainsCount']} 个域名）-> {res['path']}")
            print("  提示：文件权限已设为 600，请通过 AirDrop 等加密方式传到新电脑后及时删除，切勿上传到 GitHub。")
        else:
            res = asyncio.run(cdp.import_cookies(Path(file_path)))
            print(f"✓ 已向本机专用 Chrome 导入 {res['imported']} 条 Cookies（跳过 {res['failed']} 条）<- {res['path']}")
            print("  提示：打开 Park Studio「系统 → 全部检查」验证各平台登录态；如微信视频号/公众号风控失效，单独重扫即可。")
        return 0
    except Exception as exc:
        print(f"✗ Cookie {action} 失败：{exc}", file=sys.stderr)
        return 1


def main() -> None:
    parser = argparse.ArgumentParser(description="Park Studio — 开源本地内容生产线与多平台运营中控")
    parser.add_argument("command", nargs="?", default="serve", choices=["serve", "check", "doctor", "cookies", "static"])
    parser.add_argument("subarg1", nargs="?", default="")
    parser.add_argument("subarg2", nargs="?", default="")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8792)
    parser.add_argument("--dir", default=str(STATIC_DIR))
    args = parser.parse_args()

    if args.command in ("check", "doctor"):
        raise SystemExit(cmd_doctor(host=args.host, port=args.port))

    if args.command == "cookies":
        raise SystemExit(cmd_cookies(args.subarg1, args.subarg2))

    if args.command == "static" or Path(args.dir).resolve() != STATIC_DIR.resolve():
        handler = functools.partial(StaticPreviewHandler, directory=args.dir)
        server = ThreadingHTTPServer((args.host, args.port), handler)
        print(f"Park Studio 静态预览已启动：http://{args.host}:{args.port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            server.server_close()
        return

    pst = _probe_port(args.host, args.port)
    if pst == "park_studio":
        print(f"Park Studio 已在 http://{args.host}:{args.port} 运行中，直接用浏览器打开即可。", flush=True)
        return
    if pst == "occupied":
        print(
            f"✗ 端口 {args.host}:{args.port} 已被其他程序占用（非 Park Studio）。\n"
            f"  请换用其他端口启动，例如：park-studio serve --port {args.port + 1}",
            file=sys.stderr,
        )
        raise SystemExit(1)

    import uvicorn
    from .app import create_app

    app = create_app()
    print(f"Park Studio FastAPI 服务已启动：http://{args.host}:{args.port}", flush=True)
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
