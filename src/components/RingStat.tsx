/**
 * Generic ring/donut stat -- the same inline-SVG technique
 * PsychologicalSafetyCard.tsx already uses (two concentric circles,
 * strokeDasharray/strokeDashoffset for the fill ratio, rotate(-90) to
 * start at 12 o'clock), factored out so other cards (response rate, etc.)
 * can reuse it without duplicating the SVG math. PsychologicalSafetyCard
 * itself is left as-is -- its props are shaped around the k-anonymity
 * gate specifically (protected/n/minGroupSize framing), not a generic
 * ratio, so migrating it isn't worth the churn here.
 */
export function RingStat({
  ratio,
  color,
  centerLabel,
  subLabel,
  size = 150,
}: {
  /** 0-1. Values outside that range are clamped, never overflow the ring. */
  ratio: number;
  color: string;
  centerLabel: string;
  subLabel: string;
  size?: number;
}) {
  const radius = size * 0.413; // matches PsychologicalSafetyCard's 62/150 proportion
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--bg-active)" strokeWidth="12" />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text x={center} y={center - 5} textAnchor="middle" className="fill-[var(--ink)]" style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500 }}>
        {centerLabel}
      </text>
      <text x={center} y={center + 15} textAnchor="middle" className="fill-[var(--ink-soft)]" style={{ fontFamily: "var(--font-body)", fontSize: 10.5 }}>
        {subLabel}
      </text>
    </svg>
  );
}
