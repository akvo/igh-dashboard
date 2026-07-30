# Static content editing

## Overview

User-facing copy on the dashboard does not live in JSX. It lives in
`frontend/src/content/content.yaml` and is read through a small `t()`
accessor. This exists so non-technical IGH editors can change wording
without touching code: they edit per-key files in a separate GitHub
repo (`akvo/igh-dashboard-content`), and a sync workflow merges their
edits back into `content.yaml`. Developers edit `content.yaml`
directly; the same sync pushes those edits out to the editor repo.

As a developer you mostly care about two things: how to read copy in a
component, and how to add or change a key.

## Reading copy in a component

Import from `@/content`:

```jsx
import { t } from '@/content';
import { Markdown } from '@/content/Markdown';

<h1>{t('home.hero.title')}</h1>                 // plain text
<Markdown path="home.bubble_chart.footer" />    // markdown key
```

`t('dotted.key')` returns the string for that key and **throws** if
the key is missing or not a string — a typo fails the build instead of
rendering `undefined`. Use `<Markdown path="…">` for keys whose schema
type is `markdown` (it renders sanitized HTML); use `t()` everywhere
else.

## Adding or changing a key

A key is defined in two files, both under `frontend/src/content/`:

1. `content.schema.json` — a flat map of `key → { type, maxLength }`,
   where `type` is `"text"` or `"markdown"`. (Strict JSON, no comments.)
2. `content.yaml` — the value, nested by the dotted key.

For example, to add `home.hero.tagline`, add to `content.schema.json`:

```json
"home.hero.tagline": { "type": "text", "maxLength": 120 }
```

and to `content.yaml`:

```yaml
home:
  hero:
    tagline: "Mapping the global health R&D pipeline"
```

Then use `{t('home.hero.tagline')}` in the component and validate:

```bash
cd frontend
npm run content:check
```

`content:check` confirms every `t()` / `<Markdown>` callsite has a
schema entry and a value, every value fits its `maxLength`, and
markdown values are safe. It also requires every schema key to be
referenced somewhere in `src/` — since every schema key becomes an
editable file in the content repo, a key nothing renders is a file an
editor can change with no visible effect. In practice this means a key
can't land in `content.schema.json` before its first use, and removing
a component's last usage of a key must remove the key (and its
`content.yaml` value) in the same PR. If a key is resolved dynamically
(e.g. built by string interpolation, so no literal `t('...')` call
exists) rather than from a literal callsite, write it as a quoted
literal somewhere in `src/` instead — see `titleKey` in
`src/components/guided-tour/tourConfig.js` for the pattern. This check
runs in CI and in `npm run check:all`, so a dangling key, a typo, or a
key with no reference fails the build. Adding a key is therefore a
code change; editors only ever change *values*.

Changing existing copy is just editing the value in `content.yaml`.

## Naming a key

A key's path is the containment path of the thing it labels:

    <area>[.<view>][.<tab>].<element>.<leaf>

**Area** is a route (`home`, `pipeline_overview`, `pipeline_explorer`,
`pipeline_trends`, `who_priority`), plus `layout` for the persistent
chrome and `guided_tour` for the overlay. Route-level copy — the page
title, the page intro — goes under `<area>.page.*`.

**View** and **tab** appear only where the UI has them. Pipeline
Explorer has both: `pipeline_explorer.visual_insights.approved.*`.

**Element** is something on screen an editor can point at: a chart, a
table, a KPI card, a menu, a card. All of its copy nests beneath it, so
a chart's title, description and axis labels are adjacent files in the
content repo.

**Leaf** comes from a fixed vocabulary: `title`, `description`,
`intro`, `footnote`, `label`, `cta`, `loading`, `empty`, `empty_title`,
`empty_description`, `x_axis`, `y_axis`, `source`, `tooltip`. Use
`empty` for a single empty-state string and the
`empty_title`/`empty_description` pair when an element has both.

Two rules follow:

1. **Nest when two or more keys share a prefix.** Write
   `approval_status.{title,description}`, not `approval_status_title`
   and `approval_status_description`.
2. **Repeated sets become named sub-maps.** `cards.1.title`, not
   `card_1_title`; `items.gfinder.label`, not `item_gfinder_label`.

`x_axis` and `y_axis` name what the reader sees, not the bar
orientation. In `BarChart`, `StackedBarChart` and `GroupedBarChart`,
`xAxisLabel` always renders along the bottom and `yAxisLabel` rotated
on the left, whichever way the bars run.

Two exceptions exist in the current tree. Transient strings that are
not element copy — `loading`, `download_csv`, `downloading`,
`share_copied` — stay at the level that owns them rather than being
duplicated into every element, so editors don't have eight files to
keep identical. And the filter keys (`layout.filters.*`,
`home.filters.reset`, `pipeline_trends.filter.*`) predate this
convention and are inconsistent with it; their wording is agreed with
the client, so they were left alone.

Prefer duplicating a value over sharing a key across components. Two
charts that happen to show the same axis label should have two keys, so
either can change without the other.

## Live editing during development

`content.yaml` is compiled to `content.generated.js` (gitignored) at
build time by `scripts/content/generate.mjs`, wired into the
`predev` / `prebuild` / `pretest` npm hooks. To regenerate on every
edit while the dev server runs:

```bash
npm run content:watch     # or just use ./dev.sh, which runs it for you
```

Editing `content.yaml` then refreshes the page via HMR.

## How editor edits sync back (context)

You rarely touch this, but it helps to know it exists:

- Editors edit per-key `.txt` / `.md` files in
  `akvo/igh-dashboard-content` via the GitHub web UI.
- `.github/workflows/content-sync.yml` runs the orchestrator
  (`scripts/content-sync/sync.mjs`): a 3-way merge between the editor
  repo, `content.yaml`, and a snapshot baseline
  (`content.snapshot.json`), writing the result back to both sides and
  committing.
- If both sides changed the same key differently, the sync opens a
  GitHub Issue and halts; a dev resolves it with
  `npm run content:resolve` (an interactive CLI).

The merge engine and its tests live in `scripts/content-sync/`.

## Files

| Path | Purpose |
|------|---------|
| `src/content/content.yaml` | The copy — source of truth for the build |
| `src/content/content.schema.json` | Flat `key → { type, maxLength }` |
| `src/content/index.js` | The `t()` accessor |
| `src/content/Markdown.jsx` | `<Markdown>` component + `renderMarkdown` |
| `src/content/content.generated.js` | Built from yaml — **gitignored** |
| `src/content/content.snapshot.json` | Sync baseline — **bot-written** |
| `src/content/content.conflicts.json` | Active conflicts — **bot-written** |
| `scripts/content/generate.mjs` | yaml → generated module |
| `scripts/content/check.mjs` | `content:check` validator |
| `scripts/content-sync/` | The bidirectional sync engine |

## Don'ts

- Don't edit `content.generated.js`, `content.snapshot.json`, or
  `content.conflicts.json` by hand — they're generated or bot-written.
- Don't hardcode user-facing strings in JSX — add a key instead. This
  includes chart axis labels, and it includes default parameter values
  in shared components: a default is copy no editor can reach, and one
  such default is how the Approved Products tab came to label its
  counts "Number of candidates".
- Don't point `<Markdown>` at a `text` key (or `t()` at content you
  need rendered as markdown); `content:check` flags the mismatch.
