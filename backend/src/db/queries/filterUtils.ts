/**
 * Append an IN-clause condition when `values` is a non-empty array.
 * Optionally deduplicates a JOIN clause.
 * Returns true when a condition was added.
 */
export function addArrayCondition(
  values: readonly (string | number)[] | undefined,
  column: string,
  conditions: string[],
  params: (string | number)[],
  joinCtx?: { joins: string[]; join: string },
): boolean {
  if (!values || values.length === 0) return false;
  if (joinCtx && !joinCtx.joins.includes(joinCtx.join)) {
    joinCtx.joins.push(joinCtx.join);
  }
  conditions.push(`${column} IN (${values.map(() => "?").join(", ")})`);
  params.push(...values);
  return true;
}
