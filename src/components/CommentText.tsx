import { isFlagged, maskText, segmentText, type CommentDisplayMode } from "@/lib/profanityFilter";

/** Renders one open-text answer per the viewer's own chosen display
 * mode -- raw (default, unchanged), highlight (full text, flagged words
 * tinted so a reader can brace before reading closely), or filter
 * (flagged words masked, rest of the sentence intact). This is a
 * per-viewer reading preference, not a tenant policy or a suppression
 * change -- the underlying comment is identical in every mode. */
export function CommentText({ text, mode }: { text: string; mode: CommentDisplayMode }) {
  if (mode === "raw") return <>{text}</>;

  if (mode === "filter") return <>{maskText(text)}</>;

  return (
    <>
      {segmentText(text).map((segment, index) =>
        segment.flagged ? (
          <mark key={index} className="rounded-[3px] bg-[var(--red-bg)] px-0.5 text-[var(--red)]">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

export function StrongLanguageBadge({ text }: { text: string }) {
  if (!isFlagged(text)) return null;
  return (
    <span className="ml-2 inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--red-bg)] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[var(--red)]">
      Strong language
    </span>
  );
}
