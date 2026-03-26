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

export function buildTestCSV(columns: CSVColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map((col) => escapeCell(col.label)).join(",");
  const body = rows.map((row) => columns.map((col) => escapeCell(row[col.accessor])).join(","));
  return [header, ...body].join("\n") + "\n";
}

// =========================================================
// Fixture comparison / update
// =========================================================

/**
 * Truncate a line for display, showing context around the diff position.
 */
function truncate(line: string, diffPos?: number, maxLen = 120): string {
  if (line.length <= maxLen) return line;
  if (diffPos !== undefined && diffPos > maxLen / 2) {
    const start = diffPos - 40;
    return `...${line.slice(start, start + maxLen)}...`;
  }
  return `${line.slice(0, maxLen)}...`;
}

/**
 * Compare generated CSV against a fixture file.
 * When `UPDATE_FIXTURES=1` is set, writes the generated CSV to the fixture
 * file instead of comparing.
 */
export function expectMatchesFixture(csv: string, fixtureFilename: string): void {
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
    const expectedLines = expected.split("\n");
    const actualLines = csv.split("\n");
    const maxLines = Math.max(expectedLines.length, actualLines.length);
    const diffLines: string[] = [];
    const MAX_DIFF_LINES = 20;

    for (let i = 0; i < maxLines && diffLines.length < MAX_DIFF_LINES; i++) {
      const exp = expectedLines[i];
      const act = actualLines[i];
      if (exp === act) continue;

      if (exp === undefined) {
        diffLines.push(`  Line ${i + 1} added:   ${truncate(act)}`);
      } else if (act === undefined) {
        diffLines.push(`  Line ${i + 1} removed: ${truncate(exp)}`);
      } else {
        // Find first differing character position for context
        let pos = 0;
        while (pos < exp.length && pos < act.length && exp[pos] === act[pos]) pos++;
        diffLines.push(
          `  Line ${i + 1} differs at col ${pos + 1}:\n` +
            `    expected: ${truncate(exp, pos)}\n` +
            `    actual:   ${truncate(act, pos)}`,
        );
      }
    }

    const totalDiffs =
      expectedLines.reduce((n, line, i) => n + (line !== actualLines[i] ? 1 : 0), 0) +
      Math.abs(expectedLines.length - actualLines.length);

    throw new Error(
      `CSV output does not match fixture ${fixtureFilename}.\n` +
        "Run with UPDATE_FIXTURES=1 to update fixtures.\n" +
        `Expected ${expectedLines.length} lines, got ${actualLines.length} lines ` +
        `(${totalDiffs} line(s) differ).\n\n` +
        diffLines.join("\n") +
        (totalDiffs > MAX_DIFF_LINES ? `\n  ... and ${totalDiffs - MAX_DIFF_LINES} more` : ""),
    );
  }
}
