/**
 * Display-only title-case for a canonical (lowercase, whitespace-collapsed)
 * team label -- e.g. identityRepository.ts's normalizeTeamLabel output.
 * Never use this for grouping/comparison; only the canonical lowercase form
 * is safe to compare, since two different display transforms of the same
 * canonical value must still be treated as the same anonymity group.
 */
export function titleCaseTeam(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
