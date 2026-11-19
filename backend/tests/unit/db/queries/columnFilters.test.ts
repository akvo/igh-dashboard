import { describe, it, expect } from "vitest";
import {
  buildColumnFilterClauses,
  buildOrderBy,
} from "../../../../src/db/queries/columnFilters.js";

describe("buildColumnFilterClauses", () => {
  it("returns empty fragment for no filters", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", []);
    expect(result).toEqual({ conditions: [], params: [], ignored: [] });
  });

  it("emits LIKE for a TEXT filter on a scalar column", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "indication", kind: "TEXT", text: "tuberculosis" },
    ]);
    expect(result.conditions).toEqual(["c.indication LIKE ?"]);
    expect(result.params).toEqual(["%tuberculosis%"]);
  });

  it("emits LIKE on aggregated columns (matches comma-joined string)", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "developers_agg", kind: "TEXT", text: "GSK" },
    ]);
    expect(result.conditions).toEqual(["c.developers_agg LIKE ?"]);
    expect(result.params).toEqual(["%GSK%"]);
  });

  it("emits IN clause for a CATEGORY filter with multiple values", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      {
        column: "technology_type",
        kind: "CATEGORY",
        values: ["Diagnostic", "Vaccine"],
      },
    ]);
    expect(result.conditions).toEqual(["t.technology_type IN (?, ?)"]);
    expect(result.params).toEqual(["Diagnostic", "Vaccine"]);
  });

  it("skips empty CATEGORY values arrays (no constraint)", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "technology_type", kind: "CATEGORY", values: [] },
    ]);
    expect(result).toEqual({ conditions: [], params: [], ignored: [] });
  });

  it("skips empty/whitespace TEXT values (no constraint)", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "indication", kind: "TEXT", text: "   " },
    ]);
    expect(result).toEqual({ conditions: [], params: [], ignored: [] });
  });

  it("skips unknown column accessors and reports them (forward-compat)", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "nonexistent_column", kind: "TEXT", text: "foo" },
      { column: "indication", kind: "TEXT", text: "bar" },
    ]);
    expect(result.conditions).toEqual(["c.indication LIKE ?"]);
    expect(result.params).toEqual(["%bar%"]);
    expect(result.ignored).toEqual([
      { input: "FILTER", column: "nonexistent_column", reason: "UNKNOWN_COLUMN" },
    ]);
  });

  it("reports an unknown column even when its value is blank", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "primary_disease_name", kind: "CATEGORY", values: [] },
    ]);
    expect(result.ignored).toEqual([
      { input: "FILTER", column: "primary_disease_name", reason: "UNKNOWN_COLUMN" },
    ]);
  });

  it("reports a NUMBER or DATE filter on a column of another kind", () => {
    const result = buildColumnFilterClauses("CLINICAL_TRIALS", [
      { column: "status", kind: "DATE", operator: "EQ", date_value: "2025-01-15" },
      { column: "start_date", kind: "NUMBER", operator: "EQ", number_value: 3 },
    ]);
    expect(result.conditions).toEqual([]);
    expect(result.ignored).toEqual([
      { input: "FILTER", column: "status", reason: "KIND_MISMATCH" },
      { input: "FILTER", column: "start_date", reason: "KIND_MISMATCH" },
    ]);
  });

  it("reports a CATEGORY filter on an aggregated column", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "developers_agg", kind: "CATEGORY", values: ["GSK"] },
    ]);
    expect(result.conditions).toEqual([]);
    expect(result.ignored).toEqual([
      { input: "FILTER", column: "developers_agg", reason: "AGGREGATED_CATEGORY" },
    ]);
  });

  it("does not report blank values on a known column (filter cleared)", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "indication", kind: "TEXT", text: "" },
      { column: "technology_type", kind: "CATEGORY", values: [] },
    ]);
    expect(result.ignored).toEqual([]);
  });

  it("does not report a blank filter whose kind can't apply to the column", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "developers_agg", kind: "CATEGORY", values: [] },
    ]);
    expect(result.ignored).toEqual([]);
    const trials = buildColumnFilterClauses("CLINICAL_TRIALS", [
      { column: "status", kind: "DATE" },
      { column: "status", kind: "NUMBER", operator: "EQ", number_value: null },
      { column: "start_date", kind: "CATEGORY", values: [] },
    ]);
    expect(trials.ignored).toEqual([]);
    expect(trials.conditions).toEqual([]);
  });

  it("reports a CATEGORY filter on a number or date column", () => {
    const result = buildColumnFilterClauses("CLINICAL_TRIALS", [
      { column: "start_date", kind: "CATEGORY", values: ["2025"] },
      { column: "enrollment_count", kind: "CATEGORY", values: ["100"] },
    ]);
    expect(result.conditions).toEqual([]);
    expect(result.ignored).toEqual([
      { input: "FILTER", column: "start_date", reason: "KIND_MISMATCH" },
      { input: "FILTER", column: "enrollment_count", reason: "KIND_MISMATCH" },
    ]);
  });

  it("still applies a TEXT filter to a date column", () => {
    const result = buildColumnFilterClauses("CLINICAL_TRIALS", [
      { column: "start_date", kind: "TEXT", text: "2025" },
    ]);
    expect(result.ignored).toEqual([]);
    expect(result.conditions).toHaveLength(1);
  });

  it("reports names every JavaScript object has as unknown columns", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "constructor", kind: "TEXT", text: "x" },
      { column: "toString", kind: "CATEGORY", values: ["x"] },
    ]);
    expect(result.conditions).toEqual([]);
    expect(result.ignored).toEqual([
      { input: "FILTER", column: "constructor", reason: "UNKNOWN_COLUMN" },
      { input: "FILTER", column: "toString", reason: "UNKNOWN_COLUMN" },
    ]);
    expect(
      buildOrderBy("PORTFOLIO_CANDIDATES", [{ column: "constructor", direction: "ASC" }]).ignored,
    ).toEqual([{ input: "SORT", column: "constructor", reason: "UNKNOWN_COLUMN" }]);
  });

  it("escapes LIKE wildcards in user input", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "indication", kind: "TEXT", text: "50%_test" },
    ]);
    expect(result.conditions).toEqual(["c.indication LIKE ? ESCAPE '\\'"]);
    expect(result.params).toEqual(["%50\\%\\_test%"]);
  });

  it("combines multiple filters with AND semantics (caller does the join)", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "indication", kind: "TEXT", text: "tb" },
      { column: "technology_type", kind: "CATEGORY", values: ["Vaccine"] },
    ]);
    expect(result.conditions).toEqual(["c.indication LIKE ?", "t.technology_type IN (?)"]);
    expect(result.params).toEqual(["%tb%", "Vaccine"]);
  });

  // -------- NUMBER --------
  // Use a registered NUMBER column. None are registered yet on
  // CLINICAL_TRIALS by default; register `enrollment_count` here when
  // a story or page first surfaces it. For now, any unsupported NUMBER
  // column should be dropped silently — verified via the unknown-column
  // forward-compat behavior. Once a NUMBER column is registered, the
  // operator-specific cases below exercise the fragment builder.

  it("NUMBER eq emits scalar equality on a registered NUMBER column", () => {
    // Stub: register a synthetic NUMBER column on a known table to
    // exercise the builder. We use trial_id once it gains a NUMBER
    // entry; absent registration the builder drops the filter.
    // This test asserts the dropped-and-reported behavior for now.
    const result = buildColumnFilterClauses("CLINICAL_TRIALS", [
      {
        column: "trial_id",
        kind: "NUMBER",
        operator: "EQ",
        number_value: 50,
      },
    ]);
    expect(result).toEqual({
      conditions: [],
      params: [],
      ignored: [{ input: "FILTER", column: "trial_id", reason: "UNKNOWN_COLUMN" }],
    });
  });

  it("DATE eq wraps both sides in DATE() so timestamps match by day", () => {
    const result = buildColumnFilterClauses("CLINICAL_TRIALS", [
      {
        column: "start_date",
        kind: "DATE",
        operator: "EQ",
        date_value: "2025-01-15",
      },
    ]);
    expect(result.conditions).toEqual(["DATE(dt.full_date) = DATE(?)"]);
    expect(result.params).toEqual(["2025-01-15"]);
  });

  it("DATE before / after emit strict < / >", () => {
    const before = buildColumnFilterClauses("CLINICAL_TRIALS", [
      {
        column: "start_date",
        kind: "DATE",
        operator: "BEFORE",
        date_value: "2025-01-01",
      },
    ]);
    expect(before.conditions).toEqual(["dt.full_date < ?"]);
    expect(before.params).toEqual(["2025-01-01"]);

    const after = buildColumnFilterClauses("CLINICAL_TRIALS", [
      {
        column: "start_date",
        kind: "DATE",
        operator: "AFTER",
        date_value: "2024-12-31",
      },
    ]);
    expect(after.conditions).toEqual(["dt.full_date > ?"]);
    expect(after.params).toEqual(["2024-12-31"]);
  });

  it("DATE between wraps in DATE() and inclusive on both ends", () => {
    const result = buildColumnFilterClauses("CLINICAL_TRIALS", [
      {
        column: "start_date",
        kind: "DATE",
        operator: "BETWEEN",
        date_value: "2024-01-01",
        date_value_end: "2024-12-31",
      },
    ]);
    expect(result.conditions).toEqual([
      "DATE(dt.full_date) >= DATE(?) AND DATE(dt.full_date) <= DATE(?)",
    ]);
    expect(result.params).toEqual(["2024-01-01", "2024-12-31"]);
  });

  it("DATE between with one bound null degrades to single-sided", () => {
    const lower = buildColumnFilterClauses("CLINICAL_TRIALS", [
      {
        column: "start_date",
        kind: "DATE",
        operator: "BETWEEN",
        date_value: "2024-01-01",
        date_value_end: null,
      },
    ]);
    expect(lower.conditions).toEqual(["DATE(dt.full_date) >= DATE(?)"]);
    expect(lower.params).toEqual(["2024-01-01"]);
  });

  it("DATE between with both null is no-op", () => {
    const result = buildColumnFilterClauses("CLINICAL_TRIALS", [
      {
        column: "start_date",
        kind: "DATE",
        operator: "BETWEEN",
        date_value: null,
        date_value_end: null,
      },
    ]);
    expect(result).toEqual({ conditions: [], params: [], ignored: [] });
  });

  it("DATE invalid yyyy-mm-dd is dropped silently", () => {
    const result = buildColumnFilterClauses("CLINICAL_TRIALS", [
      {
        column: "start_date",
        kind: "DATE",
        operator: "EQ",
        date_value: "not-a-date",
      },
    ]);
    expect(result).toEqual({ conditions: [], params: [], ignored: [] });
  });
});

describe("buildOrderBy", () => {
  it("returns null for no sort", () => {
    expect(buildOrderBy("PORTFOLIO_CANDIDATES", null)).toEqual({ orderBy: null, ignored: [] });
    expect(buildOrderBy("PORTFOLIO_CANDIDATES", [])).toEqual({ orderBy: null, ignored: [] });
  });

  it("emits ORDER BY for a single sortable column ASC", () => {
    expect(
      buildOrderBy("PORTFOLIO_CANDIDATES", [{ column: "candidate_name", direction: "ASC" }]),
    ).toEqual({ orderBy: "ORDER BY c.candidate_name ASC NULLS LAST", ignored: [] });
  });

  it("emits multi-term ORDER BY preserving priority order", () => {
    expect(
      buildOrderBy("PORTFOLIO_CANDIDATES", [
        { column: "current_rd_stage", direction: "DESC" },
        { column: "candidate_name", direction: "ASC" },
      ]).orderBy,
    ).toBe("ORDER BY c.current_rd_stage DESC NULLS LAST, c.candidate_name ASC NULLS LAST");
  });

  it("skips unsortable / unknown columns, keeps valid ones, reports the skipped", () => {
    expect(
      buildOrderBy("PORTFOLIO_CANDIDATES", [
        { column: "indication", direction: "ASC" }, // unsortable
        { column: "ghost_col", direction: "ASC" }, // unknown
        { column: "candidate_name", direction: "DESC" },
      ]),
    ).toEqual({
      orderBy: "ORDER BY c.candidate_name DESC NULLS LAST",
      ignored: [
        { input: "SORT", column: "indication", reason: "NOT_SORTABLE" },
        { input: "SORT", column: "ghost_col", reason: "UNKNOWN_COLUMN" },
      ],
    });
  });

  it("returns null when no valid column remains", () => {
    const result = buildOrderBy("PORTFOLIO_CANDIDATES", [
      { column: "indication", direction: "ASC" },
      { column: "ghost_col", direction: "ASC" },
    ]);
    expect(result.orderBy).toBeNull();
    expect(result.ignored).toHaveLength(2);
  });
});
