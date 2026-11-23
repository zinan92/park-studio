#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "==> Park Studio 本地环境检查与安装 ($ROOT)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "错误：未找到 python3（需要 Python >= 3.11）" >&2
  exit 1
fi

python3 - <<'PY' || pip3 install --user fastapi uvicorn pyyaml httpx websockets pydantic
import importlib
for mod in ("fastapi", "uvicorn", "yaml", "httpx", "websockets", "pydantic"):
    importlib.import_module(mod)
print("依赖已齐备 ✓")
PY

echo "==> 启动 Park Studio：http://127.0.0.1:8792"
exec env PYTHONPATH="$ROOT/src" python3 -m park_studio.server serve --host 127.0.0.1 --port 8792
