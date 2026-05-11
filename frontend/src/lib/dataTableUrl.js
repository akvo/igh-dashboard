// =============================================================================
// DataTable URL state encoders / decoders
// =============================================================================
//
// Compact, lossless text encoding for filter and sort state. Designed to
// round-trip cleanly so that ?f.candidates=<encoded> can be reconstructed by
// the consumer's `useUrlState` hook.
//
// Format:
//   filters → "col1:value1|value2,col2:text"
//             - Top-level "," separates per-column entries.
//             - "|" separates values within a single category column.
//             - "," / "|" / ":" within a value are URL-encoded once.
//             - text filters never use "|"; we read everything past ":" as
//               the literal text and run decodeURIComponent on it.
//
//   sort   → "col:asc"  or  "col:desc"
//
// Empty objects / null sort serialize to null so useUrlState elides the
// param from the URL entirely.
//
// Disambiguation between TEXT and CATEGORY: we cannot tell from the encoded
// string alone, so the decoder always returns a CATEGORY shape with a values
// array. The consumer (DataTable) reconciles this against the column config:
// columns whose `filter.kind === 'text'` re-interpret the first value as
// the `text` field at hydration time via hydrateFiltersFromUrl.
//
// NUMBER and DATE entries carry an explicit kind prefix on the operator
// segment (`n.<op>` / `d.<op>`) so the decoder can recover the right
// shape without consulting the column config:
//
//   number → column:n.eq:42
//            column:n.lt:100
//            column:n.gt:0
//            column:n.bt:10|20            (between: lo|hi; `|` open-ended)
//   date   → column:d.eq:2025-01-15
//            column:d.before:2024-12-31
//            column:d.after:2024-01-01
//            column:d.bt:2024-01-01|2024-12-31

const NUMBER_OP_TAG = { eq: 'n.eq', lt: 'n.lt', gt: 'n.gt', between: 'n.bt' };
const NUMBER_OP_FROM = {
  'n.eq': 'eq', 'n.lt': 'lt', 'n.gt': 'gt', 'n.bt': 'between',
};
const DATE_OP_TAG = {
  eq: 'd.eq', before: 'd.before', after: 'd.after', between: 'd.bt',
};
const DATE_OP_FROM = {
  'd.eq': 'eq', 'd.before': 'before', 'd.after': 'after', 'd.bt': 'between',
};
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function encVal(s) {
  return encodeURIComponent(s);
}

function decVal(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function encodeFilters(filters) {
  if (!filters) return null;
  const parts = [];
  for (const [column, entry] of Object.entries(filters)) {
    if (!entry) continue;
    if (entry.kind === 'text') {
      const text = (entry.text ?? '').trim();
      if (!text) continue;
      parts.push(`${encVal(column)}:${encVal(text)}`);
    } else if (entry.kind === 'category') {
      const values = (entry.values ?? []).filter((v) => v != null && v !== '');
      if (values.length === 0) continue;
      parts.push(`${encVal(column)}:${values.map(encVal).join('|')}`);
    } else if (entry.kind === 'number') {
      const tag = NUMBER_OP_TAG[entry.operator];
      if (!tag) continue;
      if (entry.operator === 'between') {
        const lo = entry.value == null ? '' : String(entry.value);
        const hi = entry.valueEnd == null ? '' : String(entry.valueEnd);
        if (lo === '' && hi === '') continue;
        parts.push(`${encVal(column)}:${tag}:${lo}|${hi}`);
      } else {
        if (entry.value == null) continue;
        parts.push(`${encVal(column)}:${tag}:${entry.value}`);
      }
    } else if (entry.kind === 'date') {
      const tag = DATE_OP_TAG[entry.operator];
      if (!tag) continue;
      if (entry.operator === 'between') {
        const lo = entry.value ?? '';
        const hi = entry.valueEnd ?? '';
        if (!lo && !hi) continue;
        parts.push(`${encVal(column)}:${tag}:${lo}|${hi}`);
      } else {
        if (!entry.value) continue;
        parts.push(`${encVal(column)}:${tag}:${entry.value}`);
      }
    }
  }
  return parts.length === 0 ? null : parts.join(',');
}

export function decodeFilters(encoded) {
  if (encoded == null || encoded === '') return {};
  const out = {};
  for (const part of encoded.split(',')) {
    if (!part) continue;
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;
    const column = decVal(part.slice(0, colonIdx));
    const rest = part.slice(colonIdx + 1);

    // NUMBER / DATE entries carry an explicit kind prefix as the
    // first segment (`n.<op>` or `d.<op>`). Detect that before
    // falling through to the legacy CATEGORY-shape form, which keeps
    // backward compat with already-shared TEXT / CATEGORY URLs.
    const nextColon = rest.indexOf(':');
    if (nextColon > 0) {
      const tag = rest.slice(0, nextColon);
      const valuesStr = rest.slice(nextColon + 1);

      if (NUMBER_OP_FROM[tag]) {
        const op = NUMBER_OP_FROM[tag];
        if (op === 'between') {
          const [loRaw, hiRaw] = valuesStr.split('|');
          const lo = loRaw === '' || loRaw == null ? null : Number(loRaw);
          const hi = hiRaw === '' || hiRaw == null ? null : Number(hiRaw);
          if ((lo != null && !Number.isFinite(lo)) ||
              (hi != null && !Number.isFinite(hi))) continue;
          if (lo == null && hi == null) continue;
          out[column] = { kind: 'number', operator: 'between', value: lo, valueEnd: hi };
        } else {
          const v = Number(valuesStr);
          if (!Number.isFinite(v)) continue;
          out[column] = { kind: 'number', operator: op, value: v };
        }
        continue;
      }

      if (DATE_OP_FROM[tag]) {
        const op = DATE_OP_FROM[tag];
        if (op === 'between') {
          const [loRaw, hiRaw] = valuesStr.split('|');
          const lo = loRaw && ISO_DATE.test(loRaw) ? loRaw : null;
          const hi = hiRaw && ISO_DATE.test(hiRaw) ? hiRaw : null;
          if (!lo && !hi) continue;
          out[column] = { kind: 'date', operator: 'between', value: lo, valueEnd: hi };
        } else {
          if (!ISO_DATE.test(valuesStr)) continue;
          out[column] = { kind: 'date', operator: op, value: valuesStr };
        }
        continue;
      }
    }

    // Legacy form: TEXT or CATEGORY (decoder-side, both encode as a
    // values array; hydrateFiltersFromUrl reconciles based on
    // column config).
    const values = rest.split('|').map(decVal);
    out[column] = { kind: 'category', values };
  }
  return out;
}

export function encodeSort(sort) {
  if (!sort || !sort.column || !sort.direction) return null;
  if (sort.direction !== 'asc' && sort.direction !== 'desc') return null;
  return `${encVal(sort.column)}:${sort.direction}`;
}

export function decodeSort(encoded) {
  if (encoded == null || encoded === '') return null;
  const colonIdx = encoded.indexOf(':');
  if (colonIdx === -1) return null;
  const column = decVal(encoded.slice(0, colonIdx));
  const direction = encoded.slice(colonIdx + 1);
  if (direction !== 'asc' && direction !== 'desc') return null;
  if (!column) return null;
  return { column, direction };
}

// Reconciles a decoded filter object against the column config so that
// `text`-kind columns get a string `text` field instead of a one-item
// `values` array. NUMBER and DATE entries already carry their proper
// kind from the decoder (the encoded form tags them with `n.` / `d.`),
// so they pass through unchanged unless the column has been removed
// or its kind has changed since the URL was shared.
export function hydrateFiltersFromUrl(decoded, columns) {
  const out = {};
  for (const [column, entry] of Object.entries(decoded)) {
    const col = columns.find((c) => c.accessor === column);
    if (!col || !col.filter) continue;
    const targetKind = col.filter.kind;
    if (entry.kind === 'number' || entry.kind === 'date') {
      if (entry.kind !== targetKind) continue;
      out[column] = entry;
      continue;
    }
    if (targetKind === 'text') {
      out[column] = { kind: 'text', text: entry.values?.[0] ?? '' };
    } else if (targetKind === 'category') {
      out[column] = { kind: 'category', values: entry.values ?? [] };
    }
  }
  return out;
}
