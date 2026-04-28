// Separator for joining multiple product keys into one consolidated option
// value.  Must NOT be a comma — the URL array serializer splits on commas.
const VC_KEY_SEP = '|';

// Vector control product name consolidation
export const VECTOR_CONTROL_PRODUCT_NAMES = [
  'Biological vector control products',
  'Chemical vector control products',
  'Vector control products',
  'Vector control products Reservoir targeted vaccines',
];
export const VECTOR_CONTROL_CONSOLIDATED_NAME = 'Vector control products';

/**
 * Consolidate vector control product options (array of {label, value} objects
 * where value is a string product_key). Returns a new array with one
 * "Vector control products" entry whose value is a comma-separated list of keys.
 */
export function consolidateProductOptionsByKey(options) {
  const vcKeys = [];
  const rest = [];
  for (const opt of options) {
    if (VECTOR_CONTROL_PRODUCT_NAMES.includes(opt.label)) {
      vcKeys.push(opt.value);
    } else {
      rest.push(opt);
    }
  }
  if (vcKeys.length === 0) return options;
  return [
    ...rest,
    { label: VECTOR_CONTROL_CONSOLIDATED_NAME, value: vcKeys.join(VC_KEY_SEP) },
  ];
}

/**
 * Consolidate vector control product options (array of plain name strings).
 * Returns a deduplicated array with one "Vector control products" entry.
 */
export function consolidateProductOptionsByName(options) {
  const hasVc = options.some((n) => VECTOR_CONTROL_PRODUCT_NAMES.includes(n));
  if (!hasVc) return options;
  const rest = options.filter((n) => !VECTOR_CONTROL_PRODUCT_NAMES.includes(n));
  if (!rest.includes(VECTOR_CONTROL_CONSOLIDATED_NAME)) {
    rest.push(VECTOR_CONTROL_CONSOLIDATED_NAME);
  }
  return rest;
}

/**
 * Expand selected product keys: if a consolidated VC key (pipe-separated)
 * is selected, split it into individual keys.
 */
export function expandProductKeySelection(selected) {
  if (!selected || selected.length === 0) return selected;
  return selected.flatMap((v) => (v.includes(VC_KEY_SEP) ? v.split(VC_KEY_SEP) : [v]));
}

/**
 * Expand selected product names: if "Vector control products" is selected,
 * expand to all VC subtype names.
 */
export function expandProductNameSelection(selected) {
  if (!selected || selected.length === 0) return selected;
  if (!selected.includes(VECTOR_CONTROL_CONSOLIDATED_NAME)) return selected;
  const expanded = new Set(selected);
  expanded.delete(VECTOR_CONTROL_CONSOLIDATED_NAME);
  for (const n of VECTOR_CONTROL_PRODUCT_NAMES) {
    expanded.add(n);
  }
  return [...expanded];
}

/**
 * Normalize a product name for display: replace VC subtypes with the
 * consolidated name.
 */
export function normalizeProductName(name) {
  if (VECTOR_CONTROL_PRODUCT_NAMES.includes(name)) {
    return VECTOR_CONTROL_CONSOLIDATED_NAME;
  }
  return name;
}

/**
 * Merge vector control product rows in stacked bar chart data
 * (array of { category, ...phaseKeys }). Sums each phase key across
 * matching VC rows into one consolidated row.
 */
export function mergeVectorControlStackedData(data) {
  if (!data || data.length === 0) return data;
  const merged = {};
  const rest = [];
  for (const row of data) {
    if (VECTOR_CONTROL_PRODUCT_NAMES.includes(row.category)) {
      for (const [key, val] of Object.entries(row)) {
        if (key === 'category') continue;
        merged[key] = (merged[key] || 0) + (val || 0);
      }
    } else {
      rest.push(row);
    }
  }
  if (Object.keys(merged).length > 0) {
    rest.push({ category: VECTOR_CONTROL_CONSOLIDATED_NAME, ...merged });
  }
  const rowTotal = (row) =>
    Object.entries(row).reduce((sum, [k, v]) => (k !== 'category' ? sum + (v || 0) : sum), 0);
  rest.sort((a, b) => rowTotal(b) - rowTotal(a));
  return rest;
}

/**
 * Merge vector control product rows in chart data (array of {name, value}).
 * Sums values for all VC subtypes into one "Vector control products" row.
 */
export function mergeVectorControlChartData(data) {
  if (!data || data.length === 0) return data;
  let vcTotal = 0;
  const rest = [];
  for (const row of data) {
    if (VECTOR_CONTROL_PRODUCT_NAMES.includes(row.name)) {
      vcTotal += row.value;
    } else {
      rest.push(row);
    }
  }
  if (vcTotal > 0) {
    rest.push({ name: VECTOR_CONTROL_CONSOLIDATED_NAME, value: vcTotal });
  }
  return rest;
}
