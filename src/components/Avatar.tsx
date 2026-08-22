const SIZES = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-8 w-8 text-[11px]",
} as const;

/** Single-initial circle -- the app's one "person" visual, previously only
 * used in AppShell's own account card. Reused here so every person (team
 * members, employees) gets the same visual anchor instead of plain text rows. */
export function Avatar({ label, size = "md" }: { label: string; size?: keyof typeof SIZES }) {
  const initial = label.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <div className={`grid shrink-0 place-items-center rounded-full bg-[var(--ink)] font-semibold text-white ${SIZES[size]}`}>{initial}</div>
  );
}
