import { describe, it, expect } from "vitest";
import {
  resolveColumn,
  isCategoryColumn,
  TABLE_COLUMNS,
} from "../../../../src/db/queries/columnRegistry.js";

describe("columnRegistry", () => {
  it("resolves a known scalar column on PORTFOLIO_CANDIDATES", () => {
    expect(resolveColumn("PORTFOLIO_CANDIDATES", "candidate_name")).toEqual({
      sqlExpr: "c.candidate_name",
      sortable: true,
      filterKind: "TEXT",
      isAggregated: false,
    });
  });

  it("resolves a categorical column on PORTFOLIO_CANDIDATES", () => {
    expect(resolveColumn("PORTFOLIO_CANDIDATES", "global_health_area")).toEqual({
      sqlExpr: "d.global_health_area",
      sortable: true,
      filterKind: "CATEGORY",
      isAggregated: false,
    });
  });

  it("flags aggregated columns on PORTFOLIO_CANDIDATES", () => {
    expect(resolveColumn("PORTFOLIO_CANDIDATES", "developers_agg")).toMatchObject({
      isAggregated: true,
      filterKind: "TEXT",
    });
  });

  it("returns null for an unknown column", () => {
    expect(resolveColumn("PORTFOLIO_CANDIDATES", "nonexistent")).toBeNull();
  });

  it("isCategoryColumn returns true only for CATEGORY columns", () => {
    expect(isCategoryColumn("PORTFOLIO_CANDIDATES", "global_health_area")).toBe(true);
    expect(isCategoryColumn("PORTFOLIO_CANDIDATES", "candidate_name")).toBe(false);
    expect(isCategoryColumn("PORTFOLIO_CANDIDATES", "nonexistent")).toBe(false);
  });

  it("registers all four supported tables", () => {
    expect(Object.keys(TABLE_COLUMNS).sort()).toEqual([
      "CLINICAL_TRIALS",
      "PORTFOLIO_CANDIDATES",
      "RD_PRIORITIES",
      "RD_PRIORITIES_WITH_CANDIDATES",
    ]);
  });

  it("flags trial date columns as DATE", () => {
    expect(resolveColumn("CLINICAL_TRIALS", "start_date")?.filterKind).toBe("DATE");
    expect(resolveColumn("CLINICAL_TRIALS", "end_date")?.filterKind).toBe("DATE");
    expect(resolveColumn("CLINICAL_TRIALS", "last_updated")?.filterKind).toBe("DATE");
  });
});

describe("disease_name aligns filter/sort with the displayed specific disease", () => {
  it("is a flat CATEGORY column whose expression is the canonical disease_label", () => {
    expect(resolveColumn("PORTFOLIO_CANDIDATES", "disease_name")).toEqual({
      sqlExpr: "d.disease_label",
      sortable: true,
      filterKind: "CATEGORY",
      isAggregated: false,
    });
  });
});
