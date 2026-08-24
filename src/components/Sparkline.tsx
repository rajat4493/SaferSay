/**
 * Generic sparkline -- same inline-SVG polyline technique
 * src/components/console/OverviewDashboard.tsx's TrendSparkline already
 * uses, factored out for the tenant app side. The console's own copy is
 * left where it is (different surface, no shared consumer) rather than
 * importing across that boundary.
 */
export function Sparkline({ points, color = "var(--ink)" }: { points: number[]; color?: string }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const width = 280;
  const height = 60;
  const step = width / (points.length - 1);
  const path = points
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
