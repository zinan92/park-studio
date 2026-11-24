#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src/park_studio/static"
DST="$ROOT/site/demo/static"

rm -rf "$DST"
mkdir -p "$DST"
cp -R "$SRC/css" "$DST/css"
cp -R "$SRC/js" "$DST/js"
if [ -d "$SRC/img" ]; then
  cp -R "$SRC/img" "$DST/img"
fi
echo "Synced Park Studio static assets -> $DST"
