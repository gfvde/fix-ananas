#!/usr/bin/env bash
# Build a clean, push-ready copy of the theme.
#
# `vitrin push` / `vitrin build` zip almost everything in the theme folder
# (their ignore lists are hardcoded: no .vitrinignore support), so running them
# from the repo root ships docs, build tooling, presets and old zips.
# This script copies ONLY the files the storefront needs into build/theme/
# and zips them to build/ananas-theme-<date>.zip.
#
# Usage:
#   scripts/package.sh            # npm run build + stage + zip
#   SKIP_BUILD=1 scripts/package.sh
#
# Then push from the staging folder:
#   cd build/theme && vitrin push [--store <id>] [--activate]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/build"
STAGE="$OUT/theme"
ZIP="$OUT/ananas-theme-$(date +%Y-%m-%d).zip"

cd "$ROOT"

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  npm run build
fi

[ -f assets/dist/theme.js ] || { echo "assets/dist/theme.js missing - run npm run build" >&2; exit 1; }

rm -rf "$STAGE"
mkdir -p "$STAGE/assets"

# Root theme files + template folders
cp layout.jinja layout.schema.json layout.json \
   header.jinja header.schema.json \
   footer.jinja footer.schema.json "$STAGE/"
for d in templates sections components locale; do
  cp -R "$d" "$STAGE/$d"
done
# Section preview thumbnails etc. are fine; strip editor/OS junk
find "$STAGE" \( -name '.DS_Store' -o -name '*.po~' \) -delete

# Assets loaded at runtime:
#  - compiled CSS + plain CSS files, images, fonts, Vite bundles (assets/dist)
#  - anything referenced from Jinja as '<path>' | asset_url (e.g. js/time-ago.js)
# Source files (assets/tailwindcss.css, assets/js/** bundled by Vite) are NOT shipped
# unless a template references them directly.
cp assets/styles.css "$STAGE/assets/"
for d in css images fonts dist; do
  [ -d "assets/$d" ] && cp -R "assets/$d" "$STAGE/assets/$d"
done
grep -rhoE "['\"][A-Za-z0-9_./-]+['\"][[:space:]]*\|[[:space:]]*asset_url" \
    layout.jinja header.jinja footer.jinja templates sections components \
  | sed -E "s/^['\"]([^'\"]+)['\"].*/\1/" | sort -u | while read -r rel; do
    if [ -f "assets/$rel" ]; then
      mkdir -p "$STAGE/assets/$(dirname "$rel")"
      cp "assets/$rel" "$STAGE/assets/$rel"
    else
      echo "warning: template references missing asset: assets/$rel" >&2
    fi
  done
rm -f "$STAGE/assets/dist/"*.map

# Theme identity for `vitrin push` (it reads theme.json, falling back to package.json).
# Keep the same name/slug/version the CLI would derive from package.json so pushes
# from build/theme keep updating the same theme.
node -e '
  const pkg = require(process.argv[1]);
  const name = pkg.name || "theme";
  const t = {
    name: { en: name, ar: name },
    description: { en: pkg.description || name, ar: pkg.description || name },
    version: pkg.version || "1.0.0",
    slug: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    changelog: { en: "Theme update", ar: "Theme update" }
  };
  require("fs").writeFileSync(process.argv[2], JSON.stringify(t, null, 2) + "\n");
' "$ROOT/package.json" "$STAGE/theme.json"
[ -f theme.json ] && cp theme.json "$STAGE/theme.json"

# Link to the same Zid theme as the repo (created by `vitrin push` / `vitrin link`)
if [ -f .vitrin/theme.json ]; then
  mkdir -p "$STAGE/.vitrin"
  cp .vitrin/theme.json "$STAGE/.vitrin/theme.json"
fi

rm -f "$ZIP"
(cd "$STAGE" && zip -qr "$ZIP" . -x '.vitrin/*')

echo "Staged: $STAGE"
echo "Zip:    $ZIP ($(du -h "$ZIP" | cut -f1))"
echo "Push:   cd build/theme && vitrin push"
