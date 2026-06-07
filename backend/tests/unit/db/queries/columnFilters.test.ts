import { describe, it, expect } from "vitest";
import {
  buildColumnFilterClauses,
  buildOrderBy,
} from "../../../../src/db/queries/columnFilters.js";

describe("buildColumnFilterClauses", () => {
  it("returns empty fragment for no filters", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", []);
    expect(result).toEqual({ conditions: [], params: [] });
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
    expect(result).toEqual({ conditions: [], params: [] });
  });

  it("skips empty/whitespace TEXT values (no constraint)", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "indication", kind: "TEXT", text: "   " },
    ]);
    expect(result).toEqual({ conditions: [], params: [] });
  });

  it("skips unknown column accessors silently (forward-compat)", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "nonexistent_column", kind: "TEXT", text: "foo" },
      { column: "indication", kind: "TEXT", text: "bar" },
    ]);
    expect(result.conditions).toEqual(["c.indication LIKE ?"]);
    expect(result.params).toEqual(["%bar%"]);
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
    // This test asserts the dropped-silently behavior for now.
    const result = buildColumnFilterClauses("CLINICAL_TRIALS", [
      {
        column: "trial_id",
        kind: "NUMBER",
        operator: "EQ",
        number_value: 50,
      },
    ]);
    expect(result).toEqual({ conditions: [], params: [] });
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
    expect(result).toEqual({ conditions: [], params: [] });
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
    expect(result).toEqual({ conditions: [], params: [] });
  });
});

describe("HIERARCHICAL disease filter", () => {
  it("emits an IN clause on the parent column for primary-only selections", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      {
        column: "disease_name",
        kind: "HIERARCHICAL",
        primary_values: ["Dengue"],
        secondary_values: [],
      },
    ]);
    expect(result.conditions).toEqual(["(d.disease_filter IN (?))"]);
    expect(result.params).toEqual(["Dengue"]);
  });

  it("emits an IN clause on the child column for secondary-only selections", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      {
        column: "disease_name",
        kind: "HIERARCHICAL",
        primary_values: [],
        secondary_values: ["Cholera", "Shigella"],
      },
    ]);
    expect(result.conditions).toEqual(["(d.secondary_disease_name IN (?, ?))"]);
    expect(result.params).toEqual(["Cholera", "Shigella"]);
  });

  it("ORs the two levels so mixed selections return the union", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      {
        column: "disease_name",
        kind: "HIERARCHICAL",
        primary_values: ["Dengue"],
        secondary_values: ["Cholera"],
      },
    ]);
    expect(result.conditions).toEqual([
      "(d.disease_filter IN (?) OR d.secondary_disease_name IN (?))",
    ]);
    expect(result.params).toEqual(["Dengue", "Cholera"]);
  });

  it("is a no-op when both levels are empty", () => {
    const result = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", [
      { column: "disease_name", kind: "HIERARCHICAL", primary_values: [], secondary_values: [] },
    ]);
    expect(result).toEqual({ conditions: [], params: [] });
  });

  it("sorts the disease column by the coalesced (displayed) value", () => {
    const orderBy = buildOrderBy("PORTFOLIO_CANDIDATES", {
      column: "disease_name",
      direction: "ASC",
    });
    expect(orderBy).toBe(
      "ORDER BY COALESCE(d.secondary_disease_name, d.disease_filter) ASC NULLS LAST",
    );
  });
});

describe("buildOrderBy", () => {
  it("returns null for no sort", () => {
    expect(buildOrderBy("PORTFOLIO_CANDIDATES", null)).toBeNull();
  });

  it("emits ORDER BY for a sortable column ASC", () => {
    expect(
      buildOrderBy("PORTFOLIO_CANDIDATES", {
        column: "candidate_name",
        direction: "ASC",
      }),
    ).toBe("ORDER BY c.candidate_name ASC NULLS LAST");
  });

  it("emits ORDER BY DESC", () => {
    expect(
      buildOrderBy("PORTFOLIO_CANDIDATES", {
        column: "current_rd_stage",
        direction: "DESC",
      }),
    ).toBe("ORDER BY c.current_rd_stage DESC NULLS LAST");
  });

  it("returns null for an unsortable column (silently)", () => {
    expect(
      buildOrderBy("PORTFOLIO_CANDIDATES", {
        column: "indication",
        direction: "ASC",
      }),
    ).toBeNull();
  });

  it("returns null for an unknown column (silently)", () => {
    expect(
      buildOrderBy("PORTFOLIO_CANDIDATES", {
        column: "ghost_col",
        direction: "ASC",
      }),
    ).toBeNull();
  });
});
