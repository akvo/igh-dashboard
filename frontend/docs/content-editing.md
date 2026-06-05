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
markdown values are safe. It runs in CI and in `npm run check:all`, so
a dangling key or typo fails the build. Adding a key is therefore a
code change; editors only ever change *values*.

Changing existing copy is just editing the value in `content.yaml`.

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
- Don't hardcode user-facing strings in JSX — add a key instead.
- Don't point `<Markdown>` at a `text` key (or `t()` at content you
  need rendered as markdown); `content:check` flags the mismatch.
