import { describe, it, expect } from "vitest";
import {
  resolveColumn,
  isCategoryColumn,
  TABLE_COLUMNS,
  describeColumns,
  type DataTableId,
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
    // Names every JavaScript object has are not columns.
    for (const name of ["constructor", "toString", "hasOwnProperty", "__proto__"]) {
      expect(resolveColumn("PORTFOLIO_CANDIDATES", name)).toBeNull();
    }
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
      note: expect.stringContaining("Malaria – <strain>"),
    });
  });
});

describe("describeColumns", () => {
  const tables = Object.keys(TABLE_COLUMNS) as DataTableId[];

  it("lists every registered column of each table, in registry order", () => {
    for (const table of tables) {
      expect(describeColumns(table).map((c) => c.name)).toEqual(Object.keys(TABLE_COLUMNS[table]));
    }
  });

  it("describes a column by kind, sortability, aggregation and note", () => {
    const disease = describeColumns("PORTFOLIO_CANDIDATES").find((c) => c.name === "disease_name");
    expect(disease).toEqual({
      name: "disease_name",
      filterKind: "CATEGORY",
      sortable: true,
      aggregated: false,
      note: expect.stringContaining("primary_disease_names"),
    });
    const name = describeColumns("PORTFOLIO_CANDIDATES").find((c) => c.name === "candidate_name");
    expect(name?.note).toBeNull();
  });

  // Notes are hand-written, so these rules keep the ones a test can check
  // from falling behind the registry.
  it("gives every disease_name column a note", () => {
    for (const table of tables) {
      const disease = describeColumns(table).find((c) => c.name === "disease_name");
      if (disease) expect(disease.note, table).toBeTruthy();
    }
  });

  it("gives every aggregated column a note and never a CATEGORY filter", () => {
    for (const table of tables) {
      for (const col of describeColumns(table).filter((c) => c.aggregated)) {
        expect(col.note, `${table}.${col.name}`).toBeTruthy();
        expect(col.filterKind, `${table}.${col.name}`).not.toBe("CATEGORY");
      }
    }
  });
});
