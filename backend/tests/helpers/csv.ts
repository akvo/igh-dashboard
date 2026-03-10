/**
 * CSV test helpers — builds CSV strings from GraphQL query results
 * and compares them against fixture files.
 *
 * Mirrors the frontend `buildCSV` logic (RFC 4180 escaping) so the
 * backend tests produce byte-identical output.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const FIXTURES_DIR = path.resolve(__dirname, "../fixtures/csv");

// =========================================================
// CSV string construction (mirrors frontend/src/lib/csv.js)
// =========================================================

function escapeCell(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CSVColumn {
  label: string;
  accessor: string;
}

export function buildTestCSV(
  columns: CSVColumn[],
  rows: Record<string, unknown>[],
): string {
  const header = columns.map((col) => escapeCell(col.label)).join(",");
  const body = rows.map((row) =>
    columns.map((col) => escapeCell(row[col.accessor])).join(","),
  );
  return [header, ...body].join("\n") + "\n";
}

// =========================================================
// Fixture comparison / update
// =========================================================

/**
 * Compare generated CSV against a fixture file.
 * When `UPDATE_FIXTURES=1` is set, writes the generated CSV to the fixture
 * file instead of comparing.
 */
export function expectMatchesFixture(
  csv: string,
  fixtureFilename: string,
): void {
  const fixturePath = path.join(FIXTURES_DIR, fixtureFilename);
  const shouldUpdate = process.env.UPDATE_FIXTURES === "1";

  if (shouldUpdate) {
    writeFileSync(fixturePath, csv, "utf-8");
    // In update mode, the "test" always passes — we're recording, not comparing.
    return;
  }

  if (!existsSync(fixturePath)) {
    throw new Error(
      `Fixture file not found: ${fixturePath}\n` +
        "Run with UPDATE_FIXTURES=1 to generate fixture files.",
    );
  }

  const expected = readFileSync(fixturePath, "utf-8");
  if (csv !== expected) {
    throw new Error(
      `CSV output does not match fixture ${fixtureFilename}.\n` +
        "Run with UPDATE_FIXTURES=1 to update fixtures.\n" +
        `Expected ${expected.split("\n").length} lines, got ${csv.split("\n").length} lines.`,
    );
  }
}
