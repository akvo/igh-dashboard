# Static content

This directory holds the dashboard's editable static copy.

- `content.yaml` — current values. Editable by devs; also written by
  the content-sync bot from the content repo
  (`akvo/igh-dashboard-content`).
- `content.schema.json` — flat `key → { type, maxLength }` map.
  Dev-authored. Adding/removing keys is a code change. The bot
  projects a sorted copy to the content repo's `schema.json`.
- `content.snapshot.json` — last successfully-synced flat state.
  **Bot writes only.** Do not edit directly.
- `content.conflicts.json` — non-empty only while a sync conflict is
  unresolved. It is the sync gate. **Bot writes only.**
- `content.generated.js` — generated from yaml at build time.
  Gitignored.
- `index.js` — exports the `t(path)` accessor.
- `Markdown.jsx` — renders markdown-typed keys.
