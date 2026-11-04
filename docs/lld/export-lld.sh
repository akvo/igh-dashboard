#!/usr/bin/env bash
#
# Export the LLD to PDF and Word, each with a table of contents, in export/.
#
#   ./export-lld.sh
#
# PDF: pandoc renders HTML with a linked table of contents, then headless Chrome
# prints it. The SVG diagrams are embedded as they are, so they stay sharp.
# Word: pandoc writes a .docx with the PNG diagrams. Word fills in its table of
# contents when the file is opened and fields are updated.
#
# Chrome's path is read from diagrams/puppeteer-config.json; set CHROME to
# override it. If reference.docx exists here, the Word copy takes its styles.
#
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$DIR/IGH-Pipeline-Portal-LLD.md"
OUT="$DIR/export"
NAME="IGH-Pipeline-Portal-LLD"
TITLE="IGH Pipeline Portal — Low Level Design"
CHROME="${CHROME:-$(jq -r .executablePath "$DIR/diagrams/puppeteer-config.json")}"

mkdir -p "$OUT"

# The document's first line is its title. Pandoc prints the title itself, above
# the table of contents, so drop the line to avoid printing it twice.
body() {
  tail -n +2 "$SRC"
}

echo "  HTML"
body | pandoc \
  --from gfm --to html5 --standalone \
  --toc --toc-depth=4 \
  --metadata title="$TITLE" \
  --css "$DIR/export.css" --embed-resources \
  --resource-path "$DIR" \
  -o "$OUT/$NAME.html"

echo "  PDF"
"$CHROME" --headless --no-sandbox --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$OUT/$NAME.pdf" \
  "file://$OUT/$NAME.html" 2>/dev/null

echo "  DOCX"
reference=()
if [ -f "$DIR/reference.docx" ]; then
  reference=(--reference-doc "$DIR/reference.docx")
fi
body | sed 's#(diagrams/out/\([^)]*\)\.svg)#(diagrams/out/\1.png)#' | pandoc \
  --from gfm --to docx \
  --toc --toc-depth=4 \
  --metadata title="$TITLE" \
  --resource-path "$DIR" \
  "${reference[@]}" \
  -o "$OUT/$NAME.docx"

echo "Done. Output in $OUT"
