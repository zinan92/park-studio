"""Park Studio CLI 入口：serve / check / demo。"""
from __future__ import annotations

import argparse
import functools
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


def cmd_check() -> int:
    from . import ai, config, db, vault

    cfg = config.load_config()
    v = vault.vault_status(cfg)
    agents = ai.detect_agents()
    conn = db.connect()
    db.init_db(conn)
    print("Park Studio 本地体检单：")
    print(f"  [OK] 数据目录：{config.data_dir()}（SQLite: {db.db_path().name}）")
    print(f"  [{'OK' if v['mounted'] else 'WARN'}] Obsidian 库：{v['path']}（counts={v['counts']}）")
    active = cfg.get("aiBackend", "gemini")
    for k, info in agents.items():
        mark = "OK" if info["installed"] else "MISS"
        star = " <-- 当前默认" if k == active else ""
        print(f"  [{mark}] {k} CLI：{info['path'] or info['hint']}{star}")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Park Studio — 开源本地内容生产线与多平台运营中控")
    parser.add_argument("command", nargs="?", default="serve", choices=["serve", "check", "static"])
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8792)
    parser.add_argument("--dir", default=str(STATIC_DIR))
    args = parser.parse_args()

    if args.command == "check":
        raise SystemExit(cmd_check())

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

    import uvicorn
    from .app import create_app

    app = create_app()
    print(f"Park Studio FastAPI 服务已启动：http://{args.host}:{args.port}", flush=True)
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
