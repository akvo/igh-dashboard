// =========================================================
// DataTable filter / sort → GraphQL variable converters
// =========================================================
//
// The DataTable orchestrator carries filter state in a UI-friendly
// shape:
//   {
//     column: { kind: 'text', text: 'tb' },
//     other:  { kind: 'category', values: [...] },
//     n:      { kind: 'number', operator: 'gt', value: 100 },
//     d:      { kind: 'date', operator: 'between', value: '...', valueEnd: '...' },
//   }
//
// The backend's ColumnFilter input expects an array with kind /
// operator enums uppercased, and values broken out into the right
// per-kind field (text / values / number_value / number_value_end /
// date_value / date_value_end). These helpers do the conversion in
// one place so every consumer page sends the same shape.

export function toColumnFilters(filters) {
  if (!filters || typeof filters !== 'object') return undefined;
  const out = [];
  for (const [column, entry] of Object.entries(filters)) {
    if (!entry) continue;
    if (entry.kind === 'text') {
      const text = (entry.text ?? '').trim();
      if (!text) continue;
      out.push({ column, kind: 'TEXT', text });
    } else if (entry.kind === 'category') {
      const values = (entry.values ?? []).filter((v) => v != null && v !== '');
      if (values.length === 0) continue;
      out.push({ column, kind: 'CATEGORY', values });
    } else if (entry.kind === 'number') {
      const op = entry.operator?.toUpperCase();
      if (!op) continue;
      const v = Number.isFinite(entry.value) ? entry.value : null;
      const vEnd = Number.isFinite(entry.valueEnd) ? entry.valueEnd : null;
      if (op !== 'BETWEEN' && v == null) continue;
      if (op === 'BETWEEN' && v == null && vEnd == null) continue;
      out.push({
        column,
        kind: 'NUMBER',
        operator: op,
        number_value: v,
        number_value_end: op === 'BETWEEN' ? vEnd : undefined,
      });
    } else if (entry.kind === 'date') {
      // Map UI operator names to the GraphQL enum:
      //   eq → EQ ; before → BEFORE ; after → AFTER ; between → BETWEEN
      const op = entry.operator?.toUpperCase();
      if (!op) continue;
      const v = entry.value || null;
      const vEnd = entry.valueEnd || null;
      if (op !== 'BETWEEN' && !v) continue;
      if (op === 'BETWEEN' && !v && !vEnd) continue;
      out.push({
        column,
        kind: 'DATE',
        operator: op,
        date_value: v,
        date_value_end: op === 'BETWEEN' ? vEnd : undefined,
      });
    }
  }
  return out.length === 0 ? undefined : out;
}

// DataTable's UI sort: { column, direction: 'asc'|'desc' } | null.
// Backend's ColumnSort expects uppercase direction.
export function toColumnSort(sort) {
  if (!sort || !sort.column || !sort.direction) return undefined;
  return {
    column: sort.column,
    direction: sort.direction === 'desc' ? 'DESC' : 'ASC',
  };
}
