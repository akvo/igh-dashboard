// Separator for joining multiple product keys into one consolidated option
// value.  Must NOT be a comma — the URL array serializer splits on commas.
const VC_KEY_SEP = '|';

// Every URL query-param key that holds a filter selection — global or
// section-local. Navigation preserves ALL of these across every route so
// that a filter set on any page stays active until the user explicitly
// clears it (via the sidebar filter box or the global page header).
// Single source of truth — imported by the filter-preserving navigation
// helper.
export const GLOBAL_FILTER_KEYS = [
  // Core global filters
  'gha', 'primary', 'secondary', 'product', 'rdPhase',
  // Temporal-trends section filters
  'ttPrimary', 'ttSecondary', 'ttProduct', 'ttYear', 'cpYear',
];

// Vector control product name consolidation
export const VECTOR_CONTROL_PRODUCT_NAMES = [
  'Biological vector control products',
  'Chemical vector control products',
  'Vector control products Reservoir targeted vaccines',
];
export const VECTOR_CONTROL_CONSOLIDATED_NAME = 'Vector control products';

/**
 * Given the product list, return the string product_keys whose name is
 * one of the vector-control subtypes. Used by by-key dropdowns to tell
 * HierarchicalProductFilter which option values belong to the VCP group.
 */
export function vcpMemberKeys(products) {
  return (products || [])
    .filter((p) => VECTOR_CONTROL_PRODUCT_NAMES.includes(p.product_name))
    .map((p) => String(p.product_key));
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
 * The charts collapse the four VCP subtypes into one umbrella row by default.
 * We break them out only when the user has drilled the product filter down to
 * VCP subtypes *exclusively* — every selected product is a VCP subtype and at
 * least one is selected. Any non-VCP product in the mix (or an empty "All"
 * selection) keeps the umbrella.
 */
export function isVcpOnlySelection(products) {
  return (
    Array.isArray(products) &&
    products.length > 0 &&
    products.every((name) => VECTOR_CONTROL_PRODUCT_NAMES.includes(name))
  );
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
