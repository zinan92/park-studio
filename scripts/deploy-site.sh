#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${PARK_SITE_HOST:-ubuntu@43.163.113.194}"
REMOTE_DIR="${PARK_SITE_DIR:-/var/www/park-studio-site}"

bash "$ROOT/scripts/sync-site-demo.sh"
rsync -avz --delete "$ROOT/site/" "$HOST:$REMOTE_DIR/"
echo "Deployed Park Studio site -> https://xuanti.park-ai-intel.com/"
