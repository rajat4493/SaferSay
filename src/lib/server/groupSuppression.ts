/**
 * Pure differencing-attack guard for a set of peer groups: if exactly one
 * group would be the lone suppressed remainder against otherwise-visible
 * peers, suppress the smallest releasable peer too. Otherwise the first
 * group's exact count is inferable by subtraction from a known total.
 * No SQL or schema knowledge -- just the confidentiality math.
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
