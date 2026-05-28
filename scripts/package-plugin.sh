#!/usr/bin/env bash
set -euo pipefail

PRODUCT_NAME="openai-compatible-translate"
VERSION="1.0.0"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/src"
DIST_DIR="$ROOT_DIR/dist"
PLUGIN_PATH="$DIST_DIR/$PRODUCT_NAME-$VERSION.bobplugin"

cd "$ROOT_DIR"

node --check "$SRC_DIR/main.js"
python3 -m json.tool "$SRC_DIR/info.json" >/dev/null
python3 -m json.tool "$ROOT_DIR/appcast.json" >/dev/null

mkdir -p "$DIST_DIR"
rm -f "$PLUGIN_PATH"

cd "$SRC_DIR"
zip -r -X "$PLUGIN_PATH" info.json main.js

cd "$ROOT_DIR"
echo "Built: $PLUGIN_PATH"
echo "SHA256:"
shasum -a 256 "$PLUGIN_PATH"
