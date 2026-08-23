/**
 * Pure differencing-attack guard, shared by getDepartmentReleasability's
 * single-remainder rule and the manager-rollup sibling check
 * (managerRollupService.ts): among a set of same-level groups, if exactly
 * one would be the lone suppressed remainder against an otherwise-fully-
 * visible set of peers, bundle it into suppression too -- otherwise its
 * exact count is inferable by subtracting every visible peer from a
 * known total. No SQL, no schema knowledge -- just the math -- so it can
 * be reused across both callers without either repository reaching into
 * the other's schema.
 */
export function computeGroupReleasability<Id>(groups: Array<{ id: Id; n: number }>, minGroupSize: number): Map<Id, { n: number; releasable: boolean }> {
  const belowThreshold = groups.filter((row) => row.n < minGroupSize);
  const releasable = groups.filter((row) => row.n >= minGroupSize);

  const additionallySuppressed = new Set<Id>();
  if (belowThreshold.length === 1 && releasable.length >= 1) {
    const smallest = releasable.reduce((min, row) => (row.n < min.n ? row : min));
    additionallySuppressed.add(smallest.id);
  }

  const result = new Map<Id, { n: number; releasable: boolean }>();
  for (const row of groups) {
    result.set(row.id, { n: row.n, releasable: row.n >= minGroupSize && !additionallySuppressed.has(row.id) });
  }
  return result;
}
