/**
 * Pure, client-safe text analysis for open-text survey answers. Anonymous
 * comments run harsher than named ones -- a respondent has zero social
 * cost to writing something a report viewer (especially the specific
 * manager it's about) finds genuinely upsetting. This never changes what
 * was stored or suppressed; it only changes how one viewer chooses to
 * *see* an already-unlocked, already-suppressed comment. Raw stays the
 * default everywhere -- nothing is hidden or softened unless a viewer
 * opts in, matching "we recognize and recommend, it's your choice."
 *
 * Starter word list, not exhaustive -- covers common profanity plus
 * direct personal-insult terms (the "you're an idiot" register, which is
 * what actually stings a named manager, not just swearing).
 */
const FLAGGED_TERMS = [
  "fuck",
  "fucking",
  "fucked",
  "shit",
  "bullshit",
  "bitch",
  "bastard",
  "asshole",
  "ass",
  "dick",
  "piss",
  "damn",
  "crap",
  "idiot",
  "idiotic",
  "moron",
  "moronic",
  "stupid",
  "incompetent",
  "useless",
  "worthless",
  "pathetic",
  "lazy",
  "clueless",
  "spineless",
  "hate",
  "retard",
  "retarded",
];

const TERM_PATTERN = new RegExp(`\\b(${FLAGGED_TERMS.join("|")})\\b`, "gi");

export type TextSegment = { text: string; flagged: boolean };

/** Splits `text` into segments, marking which ones matched a flagged term.
 * Segments are for the "highlight" render mode; join their `.text` back
 * together (unmasked) to reconstruct the original string exactly. */
export function segmentText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(TERM_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) segments.push({ text: text.slice(lastIndex, index), flagged: false });
    segments.push({ text: match[0], flagged: true });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), flagged: false });
  return segments;
}

export function isFlagged(text: string): boolean {
  TERM_PATTERN.lastIndex = 0;
  return TERM_PATTERN.test(text);
}

/** Masks flagged words to their first letter + asterisks (e.g. "f***"),
 * preserving sentence structure and every other word so the substantive
 * feedback survives even when the sharpest language doesn't. */
export function maskText(text: string): string {
  return text.replace(TERM_PATTERN, (word) => word[0] + "*".repeat(Math.max(1, word.length - 1)));
}

export type CommentDisplayMode = "raw" | "highlight" | "filter";
