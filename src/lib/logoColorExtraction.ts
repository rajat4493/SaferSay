"use client";

/**
 * Deterministic dominant-color extraction from an uploaded logo image --
 * NOT an AI/vision guess. Pixel-sampling a logo is reproducible (the same
 * image always yields the same suggestion) and fast, but it is still only
 * a suggestion: a logo's "brand color" is a human judgment (which mark,
 * which shade, ignoring incidental shadow/gradient pixels) that pure pixel
 * frequency can get wrong -- e.g. a duotone logo where the more numerous
 * color isn't the one a designer would call "the" brand color. Callers
 * MUST treat this as a proposal to preview and confirm, never something to
 * silently apply -- see the "Suggested from your logo" flow in
 * src/app/app/brand/page.tsx.
 */

const SAMPLE_SIZE = 50; // downsample for speed; enough resolution for a color histogram
const BUCKET_STEP = 24; // group similar shades together before counting frequency

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h, s, l };
}

export function toHex(n: number): string {
  return Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, "0");
}

/**
 * Returns a suggested accent color hex, or null if no image could be
 * sampled (load failure, empty/fully-transparent image) or every pixel is
 * background-like (near-white/near-transparent/near-gray) -- callers
 * should just skip the suggestion UI in that case, not show a bad guess.
 */
export async function suggestAccentColorFromImage(dataUrl: string): Promise<string | null> {
  const image = await loadImage(dataUrl).catch(() => null);
  if (!image) return null;

  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  } catch {
    return null; // canvas tainted (shouldn't happen for a same-origin data: URL, but fail safe)
  }

  // bucket key -> { count, rSum, gSum, bSum } so the returned color is the
  // average of the bucket, not one single noisy pixel's exact value.
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  const vividBuckets = new Map<string, { count: number; r: number; g: number; b: number }>();

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    if (a < 128) continue; // transparent background
    if (r > 245 && g > 245 && b > 245) continue; // near-white background
    if (r < 10 && g < 10 && b < 10) continue; // near-black background/outline

    const key = `${Math.round(r / BUCKET_STEP)}-${Math.round(g / BUCKET_STEP)}-${Math.round(b / BUCKET_STEP)}`;
    const entry = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    entry.count += 1;
    entry.r += r;
    entry.g += g;
    entry.b += b;
    buckets.set(key, entry);

    const { s, l } = rgbToHsl(r, g, b);
    if (s > 0.15 && l > 0.15 && l < 0.85) {
      const vividEntry = vividBuckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      vividEntry.count += 1;
      vividEntry.r += r;
      vividEntry.g += g;
      vividEntry.b += b;
      vividBuckets.set(key, vividEntry);
    }
  }

  // Prefer the most common "vivid" (actually colored, not grayscale) bucket
  // -- this is almost always the real brand mark color, not incidental
  // black text or gray anti-aliasing. Fall back to the most common bucket
  // overall (even if grayscale) only if nothing vivid was found at all.
  const best = pickLargestBucket(vividBuckets) ?? pickLargestBucket(buckets);
  if (!best) return null;

  return `#${toHex(best.r / best.count)}${toHex(best.g / best.count)}${toHex(best.b / best.count)}`;
}

export function pickLargestBucket(buckets: Map<string, { count: number; r: number; g: number; b: number }>) {
  let best: { count: number; r: number; g: number; b: number } | null = null;
  for (const entry of buckets.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image for color extraction."));
    image.src = dataUrl;
  });
}
