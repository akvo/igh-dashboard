# Low Level Design

`IGH-Pipeline-Portal-LLD.md` is the technical companion to `IGH-Pipeline-Portal-HLD.docx`.
The HLD says what each page does. The LLD says how the system is built.

## Diagrams

Diagrams are written as mermaid and rendered to images. The `.mmd` files in `diagrams/` are
the source of truth. Never edit anything in `diagrams/out/`.

```bash
./render-diagrams.sh                     # render everything
./render-diagrams.sh 10a-gold-star-pipeline   # render one
./render-diagrams.sh 02-container 07-dag-dataflow
```

Each source produces two files:

| Output | Used for |
| --- | --- |
| `diagrams/out/<name>.svg` | Embedded in the markdown. Scales, stays sharp. |
| `diagrams/out/<name>.png` | 3x raster, for `pandoc` and Word export. |

### Changing a diagram

1. Edit the `.mmd` file.
2. Run `./render-diagrams.sh <name>`.
3. Look at the PNG.
4. Commit the `.mmd` and both outputs.

### Configuration

| File | What it controls |
| --- | --- |
| `diagrams/mermaid-config.json` | Theme. Palette and typography taken from `frontend/src/lib/theme.js`. Change it once and every diagram follows. |
| `diagrams/puppeteer-config.json` | Path to Chrome. Edit `executablePath` if yours is elsewhere. |

`render-diagrams.sh` pins `@mermaid-js/mermaid-cli` to an exact version, so the same source
always produces the same image.

### Requirements

- Node and `npx`. The renderer is fetched on first use.
- Chrome or Chromium at the path in `diagrams/puppeteer-config.json`.

### Gotcha

Mermaid reserves some words. A node id of `graph`, `end`, `class`, `style`, `click`, `link`,
`default` or `subgraph` is a parse error. Rename the node.

## Checking labels render outside Chrome

`render-diagrams.sh` fails if any label was auto-wrapped, because Firefox draws a wrapped
mermaid label as an empty box. To see the diagrams as Firefox does, wrap each SVG in an
`<img>` and screenshot it with Playwright's Firefox (a bare SVG URL hangs full-page capture):

```bash
npx playwright install firefox     # once
for svg in diagrams/out/*.svg; do
  b=$(basename "$svg" .svg)
  printf '<img src="file://%s" style="display:block">' "$PWD/$svg" > /tmp/$b.html
  npx playwright screenshot --browser=firefox --full-page "file:///tmp/$b.html" /tmp/$b.firefox.png
done
```

Open the PNGs and look for blank boxes.

## Exporting to PDF and Word

```bash
./export-lld.sh
```

This writes three files to `export/`, which git ignores:

| Output | What it is |
| --- | --- |
| `export/IGH-Pipeline-Portal-LLD.pdf` | The copy to send. A4, with a linked table of contents. |
| `export/IGH-Pipeline-Portal-LLD.docx` | Word copy, with the PNG diagrams. Word fills in the table of contents when you open the file and agree to update fields. |
| `export/IGH-Pipeline-Portal-LLD.html` | The page Chrome prints to make the PDF. |

The PDF needs `pandoc` and Chrome. Chrome's path comes from `diagrams/puppeteer-config.json`;
set `CHROME` to use another. Print styles are in `export.css`, and `keep-with-table.lua` keeps a
bold lead-in line on the same page as the table it introduces. If a `reference.docx` sits next
to the script, the Word copy takes its styles from it.

The PDF has a bookmarks panel built from the headings.

### Cross-references are links

A reference to another section is written as a link to that heading's anchor, using GitHub's
anchor names: `[section 5.1](#51-the-airflow-dag-chain)`. The same link works on GitHub, in the
PDF and in the Word copy. Neither GitHub nor pandoc warns about a link to a heading that doesn't
exist, so `export-lld.sh` checks every link and stops if one has no matching heading. If you
rename a heading, update the links to it.
