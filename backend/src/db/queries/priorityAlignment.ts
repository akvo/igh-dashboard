import { getDatabase } from "../connection.js";
import type {
  PriorityAlignmentInput,
  PriorityAlignmentOverview,
} from "../types.js";

/**
 * Single consolidated query for the Home page's WHO Priority Alignment section.
 *
 * Runs four small queries instead of one megaquery — the shapes are different
 * (scalar, per-area, per-product, lookup) and keeping them separate makes each
 * rule easy to read and test. With ~66 priorities the cost is negligible.
 *
 * Filtering: when `diseaseKeys` is non-empty, all four sub-queries narrow to
 * priorities/diseases in that set, EXCEPT `diseaseOptions`, which always
 * returns every priority-bearing disease so the dropdown isn't self-trimming.
 *
 * Stub priorities (priority_name null/empty) are excluded everywhere.
 */
export function getPriorityAlignmentOverview(
  _input: PriorityAlignmentInput,
): PriorityAlignmentOverview {
  // Real implementation lands in Task 2.
  void getDatabase(); // keep import live so tsc does not prune the import
  throw new Error("not implemented");
}
