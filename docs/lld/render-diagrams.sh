#!/usr/bin/env bash
#
# Render every mermaid source in diagrams/ to an SVG and a 3x PNG in diagrams/out/.
#
#   ./render-diagrams.sh                 renders all diagrams
#   ./render-diagrams.sh 12-gold-erd     renders one (name with or without .mmd)
#
# The .mmd files are the source of truth. Never edit anything in diagrams/out/.
#
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/diagrams"
OUT="$SRC/out"
MMDC_VERSION="11.17.0"

mkdir -p "$OUT"

render() {
  local file="$1"
  local base
  base="$(basename "$file" .mmd)"

  echo "  $base"
  npx -y "@mermaid-js/mermaid-cli@${MMDC_VERSION}" \
    --input "$file" \
    --output "$OUT/$base.svg" \
    --configFile "$SRC/mermaid-config.json" \
    --puppeteerConfigFile "$SRC/puppeteer-config.json" \
    --backgroundColor transparent \
    --quiet

  npx -y "@mermaid-js/mermaid-cli@${MMDC_VERSION}" \
    --input "$file" \
    --output "$OUT/$base.png" \
    --configFile "$SRC/mermaid-config.json" \
    --puppeteerConfigFile "$SRC/puppeteer-config.json" \
    --backgroundColor white \
    --scale 3 \
    --quiet
}

if [ "$#" -gt 0 ]; then
  echo "Rendering $# diagram(s):"
  for name in "$@"; do
    file="$SRC/${name%.mmd}.mmd"
    if [ ! -f "$file" ]; then
      echo "No such diagram: $file" >&2
      exit 1
    fi
    render "$file"
  done
else
  echo "Rendering all diagrams:"
  shopt -s nullglob
  files=("$SRC"/*.mmd)
  if [ "${#files[@]}" -eq 0 ]; then
    echo "No .mmd files in $SRC" >&2
    exit 1
  fi
  for file in "${files[@]}"; do
    render "$file"
  done
fi

# Guard: an auto-wrapped label renders as an empty box in Firefox and some other
# viewers. Every label must break with an explicit <br/> in the source instead.
# If this fires, add a <br/> to the offending label; do not lower wrappingWidth.
bad=0
for svg in "$OUT"/*.svg; do
  if grep -q 'white-space: break-spaces' "$svg"; then
    echo "Auto-wrapped label in $(basename "$svg") — add a <br/> to the source" >&2
    bad=1
  fi
done
if [ "$bad" -ne 0 ]; then
  exit 1
fi

echo "Done. Output in $OUT"
