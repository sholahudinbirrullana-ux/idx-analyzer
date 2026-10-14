#!/bin/bash
set -e
cd "$(dirname "$0")"

BUN="$HOME/.bun/bin/bun"
[ -x "$BUN" ] || BUN="$(command -v bun || true)"
if [ -z "$BUN" ] || [ ! -x "$BUN" ]; then
  echo "Bun tidak ditemukan. Install dulu:  curl -fsSL https://bun.sh/install | bash"
  exit 1
fi

echo "1) menanam aset statis (embedded-assets.js)…"
node -e '
const fs = require("fs");
const files = ["index.html","css/style.css","js/data.js","js/indicators.js","js/charts.js","js/trade.js","js/app.js"];
const map = {};
for (const f of files) map[f] = fs.readFileSync(f, "utf8");
fs.writeFileSync("embedded-assets.js", "module.exports=" + JSON.stringify(map) + ";\n");
console.log("   " + files.length + " aset ditanam");
'

echo "2) mengompilasi single executable (Bun)…"
mkdir -p dist
"$BUN" build server.js --compile --minify --outfile dist/idx-analyzer

rm -f embedded-assets.js

chmod +x dist/idx-analyzer
echo ""
echo "  SELESAI → dist/idx-analyzer  ($(du -h dist/idx-analyzer | cut -f1))"
echo "  Jalankan:  ./dist/idx-analyzer"
