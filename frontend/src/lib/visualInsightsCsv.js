/**
 * Build CSV columns for a stacked-bar chart: a lead column (the category
 * axis) followed by one column per stacked series. Each series column reads
 * the count stored under `phase.key` and is headed by `phase.label`, so the
 * exported CSV mirrors the on-screen wide layout.
 *
 * @param {{ label: string, accessor: string | Function }} leadColumn
 * @param {Array<{ key: string, label: string }>} phases
 * @returns {Array<{ label: string, accessor: string | Function }>}
 */
export function stackedCSVColumns(leadColumn, phases) {
  return [
    leadColumn,
    ...phases.map((p) => ({ label: p.label, accessor: p.key })),
  ];
}
