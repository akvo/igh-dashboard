/**
 * Snapshot test helpers — records data-derived values from the test database and
 * compares them against fixture files.
 *
 * The sibling of `csv.ts`: same `UPDATE_FIXTURES=1` switch, same refusal to pass when
 * a fixture is missing, but for the counts and totals that e2e tests would otherwise
 * hard-code and have to hand-edit after every data refresh.
 *
 * Record counts here; assert the invariants that must hold whatever the data says in
 * the test itself. A snapshot proves a number has not moved unnoticed — it does not
 * prove the number is right.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const SNAPSHOTS_DIR = path.resolve(__dirname, "../fixtures/snapshots");

export type SnapshotValue = Record<string, unknown>;

function serialise(value: SnapshotValue): string {
  return JSON.stringify(value, null, 2) + "\n";
}

/**
 * Describe how `actual` differs from `expected`, key by key, one line each.
 */
function describeDiff(expected: SnapshotValue, actual: SnapshotValue): string[] {
  const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
  const lines: string[] = [];
  for (const key of keys) {
    const exp = expected[key];
    const act = actual[key];
    const expJson = JSON.stringify(exp);
    const actJson = JSON.stringify(act);
    if (expJson === actJson) continue;
    if (!(key in expected)) {
      lines.push(`  ${key}: new key, now ${actJson}`);
    } else if (!(key in actual)) {
      lines.push(`  ${key}: key gone, was ${expJson}`);
    } else {
      lines.push(`  ${key}: recorded ${expJson}, got ${actJson}`);
    }
  }
  return lines;
}

/**
 * Compare a recorded set of values against a fixture file.
 *
 * With `UPDATE_FIXTURES=1` the fixture is rewritten and the check always passes —
 * it is recording, not comparing. Read the failures first, confirm every change is
 * one the new data explains, and only then re-record.
 */
export function expectMatchesSnapshot(value: SnapshotValue, fixtureFilename: string): void {
  const fixturePath = path.join(SNAPSHOTS_DIR, fixtureFilename);
  const shouldUpdate = process.env.UPDATE_FIXTURES === "1";
  const actualJson = serialise(value);

  if (shouldUpdate) {
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    writeFileSync(fixturePath, actualJson, "utf-8");
    return;
  }

  if (!existsSync(fixturePath)) {
    throw new Error(
      `Snapshot file not found: ${fixturePath}\n` +
        "Run with UPDATE_FIXTURES=1 to generate snapshot files.",
    );
  }

  const expectedJson = readFileSync(fixturePath, "utf-8");
  if (actualJson === expectedJson) return;

  const expected = JSON.parse(expectedJson) as SnapshotValue;
  const diff = describeDiff(expected, value);
  throw new Error(
    `Snapshot ${fixtureFilename} does not match the database.\n` +
      "Confirm each change is one the new data explains, then re-run with " +
      "UPDATE_FIXTURES=1 to re-record.\n\n" +
      diff.join("\n"),
  );
}
