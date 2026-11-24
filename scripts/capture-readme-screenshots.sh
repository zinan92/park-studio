#!/usr/bin/env bash
# 可复现的 README 截图脚本（使用隔离临时数据目录，零个人路径/隐私数据泄露）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/screenshots"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT="${PARK_SHOT_PORT:-18792}"
TMPDATA="$(mktemp -d /tmp/park-studio-shots.XXXXXX)"

cleanup() {
  if [[ -n "${SRV_PID:-}" ]]; then
    kill "$SRV_PID" 2>/dev/null || true
    wait "$SRV_PID" 2>/dev/null || true
  fi
  rm -rf "$TMPDATA"
}
trap cleanup EXIT

mkdir -p "$OUT" "$TMPDATA/vault/001_每日灵感" "$TMPDATA/vault/002_对标内容" "$TMPDATA/vault/003_口播成稿" "$TMPDATA/exports"
cat > "$TMPDATA/vault/001_每日灵感/2026-11-23-开源工作台灵感.md" <<'MD'
# 把 4 个内容脚本收拢进 1 个本地工作台

核心观点：创作者缺的不是第 10 个 AI 工具，而是把选题、剪辑、发布、复盘串成一条零 API 费的本地流水线。
MD

cat > "$TMPDATA/vault/002_对标内容/2026-11-20-示例拆解.md" <<'MD'
# 为什么个人开发者都在做本地优先工具

- 钩子：前 3 秒直接抛出「省掉每月 \$200 订阅费」对比账单
- 结构：痛点对比 → 真机录屏演示 → 开源架构图 → 结尾引导 Star
MD

# 写入干净的脱敏演示配置（零个人路径）
cat > "$TMPDATA/config.yaml" <<YAML
obsidianPath: "$TMPDATA/vault"
projectRoot: "$TMPDATA/exports"
aiBackend: "gemini-api"
aiModel: "gemini-2.5-flash"
cutAgentBackend: "inherit"
transcribeEngine: "mlx-whisper"
cdpPort: 9333
YAML

echo "==> 启动隔离演示后端 http://127.0.0.1:$PORT"
PARK_STUDIO_DATA="$TMPDATA" PYTHONPATH="$ROOT/src" python3 -m park_studio.server serve --host 127.0.0.1 --port "$PORT" >/tmp/park-shot-srv.log 2>&1 &
SRV_PID=$!

for _ in $(seq 1 30); do
  if curl -s --noproxy '*' "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.3
done

shot() {
  local name="$1"
  local hash="$2"
  local w="${3:-1280}"
  local h="${4:-840}"
  local png="$TMPDATA/$name.png"
  local jpg="$OUT/$name.jpg"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1.5 \
    --window-size="${w},${h}" --virtual-time-budget=4500 \
    --blink-settings=preferredColorScheme=1 \
    --screenshot="$png" "http://127.0.0.1:$PORT/$hash" 2>/dev/null
  sips -s format jpeg -s formatOptions 86 "$png" --out "$jpg" >/dev/null
  echo "  ✓ $jpg ($(du -h "$jpg" | awk '{print $1}'))"
}

echo "==> 截取核心页面"
shot "hero" "#pool" 1280 840
shot "01-source" "#source" 1280 840
shot "01-topics" "#pool" 1280 840
shot "02-cut" "#cut" 1280 840
shot "03-publish" "#pub-confirm" 1280 840
shot "04-review-empty" "#review" 1280 840
shot "05-kb" "#kb" 1280 840
shot "06-settings" "#settings" 1280 840
shot "07-dashboard-full" "#dashboard" 1280 1600

echo "==> 全部截图已输出到 $OUT"
ls -lh "$OUT"
