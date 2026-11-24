#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
APP="$DIST/Park Studio.app"
DMG="$DIST/Park-Studio.dmg"

echo "==> 清理并准备打包目录 $DIST"
rm -rf "$APP" "$DMG"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/backend"

echo "==> 编译纯原生 Swift 桌面端 (Apple WKWebView + 透明融合标题栏)"
swiftc -O \
  -framework Cocoa \
  -framework WebKit \
  "$ROOT/desktop/macos/ParkStudioApp.swift" \
  -o "$APP/Contents/MacOS/ParkStudio"

echo "==> 嵌入后端源码与静态资源"
cp -R "$ROOT/src/park_studio" "$APP/Contents/Resources/backend/"
find "$APP/Contents/Resources/backend" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

echo "==> 生成 macOS 应用图标 (.icns)"
ICON_SRC="$ROOT/src/park_studio/static/img/park-avatar.webp"
if [[ -f "$ICON_SRC" ]] && command -v sips >/dev/null 2>&1 && command -v iconutil >/dev/null 2>&1; then
  TMPICON="$(mktemp -d)"
  ICONSET="$TMPICON/AppIcon.iconset"
  mkdir -p "$ICONSET"
  sips -s format png "$ICON_SRC" --out "$TMPICON/base.png" >/dev/null 2>&1 || true
  if [[ -f "$TMPICON/base.png" ]]; then
    for sz in 16 32 64 128 256 512; do
      sips -z "$sz" "$sz" "$TMPICON/base.png" --out "$ICONSET/icon_${sz}x${sz}.png" >/dev/null 2>&1 || true
      sz2=$((sz * 2))
      sips -z "$sz2" "$sz2" "$TMPICON/base.png" --out "$ICONSET/icon_${sz}x${sz}@2x.png" >/dev/null 2>&1 || true
    done
    iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns" 2>/dev/null || true
  fi
  rm -rf "$TMPICON"
fi

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>Park Studio</string>
  <key>CFBundleDisplayName</key>
  <string>Park Studio</string>
  <key>CFBundleIdentifier</key>
  <string>com.parkstudio.desktop</string>
  <key>CFBundleVersion</key>
  <string>0.3.0</string>
  <key>CFBundleShortVersionString</key>
  <string>0.3.0</string>
  <key>CFBundleExecutable</key>
  <string>ParkStudio</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
  </dict>
</dict>
</plist>
PLIST

echo "==> 生成分发镜像 $DMG"
STAGE="$(mktemp -d)"
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname "Park Studio" -srcfolder "$STAGE" -ov -format UDZO "$DMG" >/dev/null
rm -rf "$STAGE"

echo "完成 ✓"
echo "  App: $APP"
echo "  DMG: $DMG"
ls -lh "$APP/Contents/MacOS/ParkStudio" "$DMG"
