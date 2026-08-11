import { EyeOff, MessageSquare, Clock, Target } from "lucide-react";

export type SynthesisTheme = {
  icon: typeof MessageSquare;
  title: string;
  description: string;
};

// STUB: no summarization pipeline exists yet -- this is realistic seeded
// copy, not LLM output over real response text. Typed as SynthesisTheme[]
// so swapping in a real `/api/report/themes` call later is a data-only
// change, no markup change.
const placeholderThemes: SynthesisTheme[] = [
  {
    icon: MessageSquare,
    title: "Improve cross-team communication",
    description: "People want clearer updates and visibility across teams.",
  },
  {
    icon: Clock,
    title: "Reduce meeting overload",
    description: "Too many recurring meetings are cutting into focus time.",
  },
  {
    icon: Target,
    title: "More clarity on priorities",
    description: "The team wants sharper prioritization and context on “why now.”",
  },
];

export function AiSynthesisCard({
  themes = placeholderThemes,
  onViewAll,
  locked = false,
}: {
  themes?: SynthesisTheme[];
  onViewAll?: () => void;
  locked?: boolean;
}) {
  if (locked) {
    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="section-title">AI Synthesis</h2>
          <span className="badge-beta">Beta</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[14px] font-medium text-[var(--ink)]">
          <EyeOff size={16} strokeWidth={1.8} /> Locked with the rest of the report
        </div>
        <p className="mt-2 text-[12.5px] leading-[1.5] text-[var(--ink-mid)]">
          Themes will generate once enough responses exist to keep individuals unidentifiable.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="section-title">AI Synthesis</h2>
        <span className="badge-beta">Beta</span>
      </div>
      <p className="mt-1.5 text-[12px] text-[var(--ink-soft)]">Based on feedback so far, here are early themes and suggested actions.</p>

      <div className="mt-1">
        {themes.map((theme) => (
          <div key={theme.title} className="theme-row">
            <span className="theme-icon">
              <theme.icon size={15} strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-[var(--ink)]">{theme.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-[1.5] text-[var(--ink-mid)]">{theme.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onViewAll} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--green)] hover:underline">
        View all themes →
      </button>
    </div>
  );
}
