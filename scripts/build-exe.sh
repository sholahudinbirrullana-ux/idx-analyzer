#!/usr/bin/env bash
# Bangun satu file executable (Node SEA) dari server.js + aset statis.
# Hasil: dist/idx-analyzer  (jalankan: ./idx-analyzer)
# Pemakaian:  bash scripts/build-exe.sh
set -e

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
OUT="dist/idx-analyzer"
FUSE="NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2"

mkdir -p dist

echo "• Membuat blob SEA…"
node --experimental-sea-config sea-config.json

echo "→ Menyalin runtime Node…"
NODE_BIN="$(command -v node)"
rm -f "$OUT"
cp "$(python3 -c "import os;print(__import__('os').path.realpath('$BIN' if False else '$NODE_BIN'))")" "$OUT" 2>/dev/null || cp "$NODE_BIN" "$OUT"

if [ "$(uname)" = "Darwin" ]; then
  echo "  menghapus tanda tangan (macOS)…"
  codesign --remove-signature "$OUT" 2>/dev/null || true
fi

echo "  menyuntik blob…"
npx --yes postject "$OUT" NODE_SEA_BLOB sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

if [ "$(uname)" = "Darwin" ]; then
  echo "  menandatangani ulang (ad-hoc)…"
  codesign --sign - "$OUT" 2>/dev/null || true
fi

chmod +x "$OUT"
echo ""
echo "  Selesai → $(pwd)/dist/idx-analyzer"
echo "  Jalankan:  ./dist/idx-analyzer"
