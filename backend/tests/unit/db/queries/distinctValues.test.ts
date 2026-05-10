import { describe, it, expect } from "vitest";
import { stripOwnColumnFilter } from "../../../../src/db/queries/distinctValues.js";

describe("stripOwnColumnFilter", () => {
  it("returns the same array if column is not in column_filters", () => {
    const result = stripOwnColumnFilter("technology_type", [
      { column: "indication", kind: "TEXT", text: "tb" },
    ]);
    expect(result).toEqual([{ column: "indication", kind: "TEXT", text: "tb" }]);
  });

  it("removes only the matching column entry", () => {
    const result = stripOwnColumnFilter("technology_type", [
      { column: "indication", kind: "TEXT", text: "tb" },
      { column: "technology_type", kind: "CATEGORY", values: ["Vaccine"] },
      { column: "current_rd_stage", kind: "CATEGORY", values: ["Phase III"] },
    ]);
    expect(result).toEqual([
      { column: "indication", kind: "TEXT", text: "tb" },
      { column: "current_rd_stage", kind: "CATEGORY", values: ["Phase III"] },
    ]);
  });

  it("handles undefined / null column_filters (returns empty)", () => {
    expect(stripOwnColumnFilter("technology_type", undefined)).toEqual([]);
    expect(stripOwnColumnFilter("technology_type", null)).toEqual([]);
  });
});
