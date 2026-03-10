/**
 * CSV generation and download utilities.
 *
 * `buildCSV` produces an RFC 4180-compliant string: fields containing
 * commas, double-quotes, or newlines are wrapped in double-quotes, and
 * any embedded double-quotes are escaped by doubling them.
 */

// =========================================================
// CSV String Construction
// =========================================================

/**
 * Escape a single cell value per RFC 4180.
 * Returns the value unchanged when it contains no special characters,
 * otherwise wraps it in double-quotes with internal quotes doubled.
 */
function escapeCell(value) {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a CSV string from structured column definitions and data rows.
 *
 * @param {Array<{ label: string, accessor: string | (row) => any }>} columns
 *   Each column has a human-readable `label` for the header and either
 *   an `accessor` string (property key) or a function to extract the
 *   cell value from a row.
 * @param {Array<Object>} rows - The data rows.
 * @returns {string} A complete RFC 4180 CSV string (with trailing newline).
 */
export function buildCSV(columns, rows) {
  const header = columns.map((col) => escapeCell(col.label)).join(',');

  const body = rows.map((row) =>
    columns
      .map((col) => {
        const value =
          typeof col.accessor === 'function'
            ? col.accessor(row)
            : row[col.accessor];
        return escapeCell(value);
      })
      .join(','),
  );

  return [header, ...body].join('\n') + '\n';
}

// =========================================================
// Browser Download Trigger
// =========================================================

/**
 * Trigger a browser file download for a CSV string.
 *
 * @param {string} csvContent - The CSV text to download.
 * @param {string} filename   - The filename (without extension).
 */
export function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// =========================================================
// Convenience wrapper (backward-compatible)
// =========================================================

/**
 * Build and download a CSV from raw data, auto-deriving columns from
 * the keys of the first row. This mirrors the original inline
 * `downloadCSV(data, filename)` call signature used on the homepage.
 *
 * @param {Array<Object>} data     - Array of row objects.
 * @param {string}        filename - Download filename (without extension).
 */
export function downloadDataAsCSV(data, filename) {
  if (!data || data.length === 0) return;
  const columns = Object.keys(data[0]).map((key) => ({
    label: key,
    accessor: key,
  }));
  const csv = buildCSV(columns, data);
  downloadCSV(csv, filename);
}
