"""Park Studio 本地预览与开发服务（零外部依赖启动，后续平滑接入 FastAPI 业务后端）。"""
from __future__ import annotations

import argparse
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

STATIC_DIR = Path(__file__).resolve().parent / "static"


class ParkStudioHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        clean = self.path.split("?", 1)[0]
        if clean in ("/", ""):
            self.path = "/index.html"
        super().do_GET()

    def log_message(self, fmt: str, *args) -> None:
        pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Park Studio 本地前端服务")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8790)
    parser.add_argument("--dir", default=str(STATIC_DIR))
    args = parser.parse_args()
    handler = functools.partial(ParkStudioHandler, directory=args.dir)
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Park Studio 已启动：http://{args.host}:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
