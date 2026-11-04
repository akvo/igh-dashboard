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
# Cross-references in the LLD are links to heading anchors. The export stops if
# a link points to a heading that doesn't exist, so a renamed heading is caught
# here rather than by a reader.
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
  --lua-filter "$DIR/keep-with-table.lua" \
  --css "$DIR/export.css" --embed-resources \
  --resource-path "$DIR" \
  -o "$OUT/$NAME.html"

# Guard: neither GitHub nor pandoc warns about a link to a missing anchor.
# Every in-page link must have a matching id in the HTML pandoc just wrote,
# which names headings the same way GitHub does.
echo "  Checking internal links"
html="$OUT/$NAME.html"
missing=$(comm -23 \
  <(grep -o 'href="#[^"]*"' "$html" | sed 's/^href="#//; s/"$//' | sort -u) \
  <(grep -o ' id="[^"]*"' "$html" | sed 's/^ id="//; s/"$//' | sort -u))
if [ -n "$missing" ]; then
  echo "Links to headings that don't exist. Fix the link or the heading:" >&2
  echo "$missing" >&2
  exit 1
fi

echo "  PDF"
"$CHROME" --headless --no-sandbox --disable-gpu --no-pdf-header-footer \
  --generate-pdf-document-outline \
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
