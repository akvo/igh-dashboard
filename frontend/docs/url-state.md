# `useUrlState` — Shareable URL State Management

## Overview

The `useUrlState` hook lets you sync React component state to URL query
parameters so that filter selections, active tabs, pagination, and
chart visibility can all be shared via a link. It is a drop-in
replacement for `useState` — same `[value, setValue]` return shape —
but the value lives in the URL instead of (only) in memory.

### Architecture

The system is split into three layers, each with a single
responsibility:

```
url-serializers.js      Pure format conversion (value ↔ URL string)
        ↓
useQueryParams.js       Low-level reactive URL read/write
        ↓                (useSyncExternalStore + History API)
useUrlState.js          High-level hook — useState API,
                        default elision, debounce, serializers
```

| File                | Lines | Purpose                                    |
|---------------------|------:|--------------------------------------------|
| `url-serializers.js`|    58 | `arraySerializer`, `numberSerializer`, `stringSerializer` |
| `useQueryParams.js` |    74 | Reactive URL read/write via `popstate` + `useSyncExternalStore` |
| `useUrlState.js`    |   107 | Combines the above into a `useState`-shaped API |

All three files live in `src/lib/`.

---

## Quick Start

Replace `useState` with `useUrlState` and provide a serializer:

```jsx
// Before — state is lost on page reload
const [healthArea, setHealthArea] = useState([]);

// After — state is persisted in the URL as ?gha=HIV,TB
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer } from '@/lib/url-serializers';

const [healthArea, setHealthArea] = useUrlState('gha', [], arraySerializer);
```

Everything else stays the same — `setHealthArea(['HIV', 'TB'])` works
exactly like it did with `useState`, but now the URL reads
`?gha=HIV,TB` and reloading the page restores the selection.

---

## API Reference

### `useUrlState(key, defaultValue, options?)`

```js
const [value, setValue] = useUrlState(key, defaultValue, options);
```

#### Parameters

| Parameter      | Type     | Description |
|----------------|----------|-------------|
| `key`          | `string` | URL query parameter name (e.g. `'gha'`, `'tab'`, `'page'`). |
| `defaultValue` | `any`    | Value used when the key is absent from the URL. Also controls default-value elision (see below). |
| `options`      | `object` | Optional. Serialization, history mode, and debounce settings. Since `options` is destructured for `serialize` and `deserialize`, you can pass a serializer object directly (e.g. `arraySerializer`) and the remaining options (`historyMode`, `debounceMs`) fall back to defaults. To override those defaults alongside a serializer, spread it: `{ ...stringSerializer, historyMode: 'push' }`. |

#### Options

| Option         | Type                    | Default     | Description |
|----------------|-------------------------|-------------|-------------|
| `serialize`    | `(value) => string\|null` | `String()`  | Converts the JS value to a URL string. Return `null` to remove the key. |
| `deserialize`  | `(string\|null) => value` | identity    | Converts a URL string back to the JS value. Return `null` to fall back to `defaultValue`. |
| `historyMode`  | `'replace' \| 'push'`  | `'replace'` | `'replace'` silently updates the URL; `'push'` creates a browser history entry (so Back navigates between values). |
| `debounceMs`   | `number`                | `0`         | Delay in ms before writing to the URL. Useful for search inputs to avoid thrashing the URL on every keystroke. |

#### Return Value

`[value, setValue]` — identical shape to `useState`.

`setValue` accepts either a new value or a **functional updater**:

```js
setValue('newValue');
setValue((prev) => [...prev, 'added']);
```

#### Default-Value Elision

When the current value equals `defaultValue`, the key is **removed**
from the URL to keep links clean. Comparison uses:

- Shallow array equality for arrays
- Strict equality (`===`) for primitives

Example: if `defaultValue` is `[]` and the user clears all filters,
`?gha=` disappears from the URL entirely.

---

## Built-in Serializers

Import from `@/lib/url-serializers`:

### `arraySerializer`

Comma-separated encoding. Safe because filter values in this project
(health area names, disease names, product types, phase keys) do not
contain commas.

```
[]            → (key removed)
['a', 'b']    → 'a,b'
'a,b'         → ['a', 'b']
null           → []
```

### `numberSerializer`

Integer encoding via `parseInt(str, 10)`. Returns `null` for
non-numeric strings (falls back to `defaultValue`).

```
3             → '3'
'3'           → 3
null          → null (falls back to defaultValue)
'abc'         → null (falls back to defaultValue)
```

### `stringSerializer`

Identity transform. Empty strings serialize to `null` (key removed).

```
'foo'         → 'foo'
''            → null
null          → null
```

---

## Usage Patterns

Signatures are taken from actual call sites; helper code is
generalized for clarity.

### Simple array filter

```js
const [healthArea, setHealthArea] = useUrlState('gha', [], arraySerializer);
```

URL: `?gha=HIV,Malaria`
Default `[]` means the key disappears when nothing is selected.

### Tab selection with push history

```js
const [activeTab, setActiveTab] = useUrlState('tab', 'explore', {
  ...stringSerializer,
  historyMode: 'push',
});
```

URL: `?tab=extract`
`historyMode: 'push'` lets the browser Back button navigate between
tabs.

### Search with debounce

```js
const [searchQuery, setSearchQuery] = useUrlState('q', '', {
  ...stringSerializer,
  debounceMs: 500,
});
```

URL: `?q=artemis`
The URL updates 500 ms after the user stops typing, avoiding a
`replaceState` on every keystroke.

### Pagination

```js
const [currentPage, setCurrentPage] = useUrlState('techPage', 1, numberSerializer);
```

URL: `?techPage=3`
Page 1 (the default) is elided from the URL.

### Non-empty array default

```js
const [bubbleCandidateTypes, setBubbleCandidateTypes] = useUrlState(
  'bubbleType',
  ['Candidate', 'Product'],
  arraySerializer,
);
```

URL: `?bubbleType=Candidate`
When both "Candidate" and "Product" are selected (the default), the
key is removed. Only non-default selections appear in the URL.

### Hidden-items pattern (chart visibility toggles)

Rather than storing all *visible* phases (which would produce a long
URL when most phases are shown), we store only the *hidden* ones:

```js
const [hiddenPhases, setHiddenPhases] = useUrlState('phide', [], arraySerializer);
```

Then convert to the `{ key: boolean }` map that `StackedBarChart`
expects (actual call sites use the specific phases array for each
chart, e.g. `portfolioSegments`, `temporalPhases`):

```js
// `allPhases` is the array of phase objects for the chart in question.
const visiblePhases = useMemo(
  () => allPhases.reduce(
    (acc, p) => ({ ...acc, [p.key]: !hiddenPhases.includes(p.key) }),
    {},
  ),
  [allPhases, hiddenPhases],
);

const handleVisiblePhasesChange = useCallback(
  (next) => setHiddenPhases(Object.keys(next).filter((k) => !next[k])),
  [setHiddenPhases],
);
```

URL: `?phide=Phase+III,Registration`
Empty when all phases are visible (the default).

---

## When NOT to Use `useUrlState`

Use regular `useState` for state that is:

- **Transient UI state** — loading spinners, modal open/close,
  animation progress, download-in-progress flags
- **Derived state** — values computed from other state or props
- **High-frequency updates** — drag positions, scroll offsets,
  hover states
- **Sensitive data** — anything that should not appear in a
  shareable link

Rule of thumb: if a collaborator opening your link would *not* want
that piece of state pre-set, it does not belong in the URL.

---

## Alternatives Considered

### `nuqs` (third-party library)

[nuqs](https://nuqs.47ng.com/) is a popular Next.js query-string state
manager. We chose not to use it because:

- **Adds a dependency** for ~240 lines of functionality we can write
  ourselves
- **Requires Suspense boundaries** around components that read URL
  state, complicating the component tree
- **More API surface** than we need — we only require arrays, numbers,
  and strings

### Next.js `useSearchParams()`

The built-in hook from `next/navigation`:

- **Triggers Suspense** — components using it must be wrapped in a
  `<Suspense>` boundary or the build fails
- **Full-tree re-renders** — reading `searchParams` at the page level
  causes the entire page to re-render on any URL change
- **Read-only** — writing requires a separate `useRouter().replace()`
  call, which also triggers Suspense

### Why custom

- **Zero dependencies** — nothing to install or keep updated
- **No Suspense required** — safe because all dashboard pages use
  `'use client'` and never SSR filter state
- **~240 lines total** across the three files
- **Familiar API** — `[value, setValue]` means no learning curve
- **Batching-friendly** — `setParams` reads fresh from
  `window.location.search` on every call, so rapid sequential updates
  in the same event handler compose correctly. After each
  `pushState`/`replaceState` (which do not fire `popstate` natively),
  it dispatches a synthetic `popstate` event to notify all
  `useSyncExternalStore` subscribers across the page

---

## URL Key Conventions

Keys are kept short to produce compact, readable URLs.

| Key          | Type     | Page                     | Meaning                           |
|--------------|----------|--------------------------|-----------------------------------|
| `gha`        | array    | Portfolio, Cross-Pipeline | Global health area filter         |
| `disease`    | array    | Portfolio, Cross-Pipeline | Disease filter                    |
| `product`    | array    | Home, Portfolio, Cross-Pipeline | Product filter             |
| `rdStage`    | array    | Home                     | R&D stage filter                  |
| `bubbleType` | array    | Home                     | Bubble chart candidate types      |
| `mapTab`     | string   | Home                     | Map tab (trials / development)    |
| `chartView`  | string   | Home                     | Chart view mode (visual / table)  |
| `crossGha`   | array    | Home                     | Cross-pipeline health area filter |
| `crossProduct`| array   | Home                     | Cross-pipeline product filter     |
| `tab`        | string   | Portfolio                | Top-level tab (explore / extract) |
| `view`       | string   | Portfolio                | Portfolio sub-tab                 |
| `q`          | string   | Portfolio                | Search query                      |
| `productType`| array    | Portfolio                | Product type filter               |
| `trialStatus`| array    | Portfolio                | Geo trial status filter           |
| `techPage`   | number   | Portfolio                | Technology table page             |
| `tPage`      | number   | Portfolio                | Trials table page                 |
| `cPage`      | number   | Portfolio                | Candidates table page             |
| `aPage`      | number   | Portfolio                | Approved table page               |
| `extPage`    | number   | Portfolio                | Extract table page                |
| `extTab`     | string   | Portfolio                | Extract sub-tab                   |
| `cols`       | array    | Portfolio                | Selected extract columns          |
| `extQ`       | string   | Portfolio                | Extract search query              |
| `extGha`     | array    | Portfolio                | Extract health area filter        |
| `extDisease` | array    | Portfolio                | Extract disease filter            |
| `extProduct` | array    | Portfolio                | Extract product filter            |
| `extRdStage` | array    | Portfolio                | Extract R&D stage filter          |
| `phide`      | array    | Home, Portfolio, Cross-Pipeline | Hidden phases (stacked bar) |
| `cphide`     | array    | Home                     | Hidden phases for the embedded cross-pipeline chart (distinct from `phide` on `/cross-pipeline-analytics`) |
| `ahide`      | array    | Portfolio                | Hidden auth phases                |
| `apphide`    | array    | Portfolio                | Hidden approval items             |
| `tshide`     | array    | Portfolio                | Hidden trial status items         |
