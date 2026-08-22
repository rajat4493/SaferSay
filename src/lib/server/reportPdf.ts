import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { ProtectedReport } from "@/lib/server/repositories/types";

const INK = rgb(0.09, 0.13, 0.11);
const INK_MID = rgb(0.37, 0.38, 0.37);
const GREEN = rgb(0.05, 0.31, 0.22);
const BORDER = rgb(0.89, 0.89, 0.86);
const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;

/**
 * Renders the same k-anonymity-gated report the in-app dashboard and CSV/JSON
 * export show -- never anything more. Protected (n below threshold) reports
 * render the same suppression message, not the underlying rows, matching
 * ProtectedReportPanel's behavior.
 */
export async function renderReportPdf(params: {
  tenantName: string;
  cycleName: string;
  minGroupSize: number;
  report: ProtectedReport;
  generatedAt?: Date;
}): Promise<Uint8Array> {
  const { tenantName, cycleName, minGroupSize, report } = params;
  const generatedAt = params.generatedAt ?? new Date();

  const doc = await PDFDocument.create();
  doc.setTitle(`${cycleName} — SaferSay report`);
  doc.setProducer("SaferSay");

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_HEIGHT - MARGIN;

  page.drawText(tenantName, { x: MARGIN, y, size: 11, font: regular, color: INK_MID });
  y -= 28;
  page.drawText(cycleName, { x: MARGIN, y, size: 22, font: bold, color: INK });
  y -= 20;
  page.drawText(
    `Generated ${generatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · Confidential — grouped results only`,
    { x: MARGIN, y, size: 10, font: regular, color: INK_MID },
  );
  y -= 30;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: BORDER });
  y -= 30;

  if (report.protected) {
    page.drawText("Results are protected.", { x: MARGIN, y, size: 14, font: bold, color: INK });
    y -= 20;
    const message = wrapText(
      `Fewer than ${minGroupSize} people have responded so far. Results stay hidden until enough people respond to keep individuals unidentifiable — this protects every respondent's anonymity, including yours.`,
      regular,
      11,
      PAGE_WIDTH - MARGIN * 2,
    );
    for (const line of message) {
      page.drawText(line, { x: MARGIN, y, size: 11, font: regular, color: INK_MID });
      y -= 16;
    }
    return doc.save();
  }

  page.drawText(`${report.n} response${report.n === 1 ? "" : "s"} · minimum group size ${minGroupSize}`, {
    x: MARGIN,
    y,
    size: 11,
    font: bold,
    color: GREEN,
  });
  y -= 30;

  const colQuestion = MARGIN;
  const colResponses = PAGE_WIDTH - MARGIN - 150;
  const colAverage = PAGE_WIDTH - MARGIN - 70;

  const drawHeader = (p: PDFPage, rowY: number) => {
    p.drawText("QUESTION", { x: colQuestion, y: rowY, size: 9, font: bold, color: INK_MID });
    p.drawText("RESPONSES", { x: colResponses, y: rowY, size: 9, font: bold, color: INK_MID });
    p.drawText("AVERAGE", { x: colAverage, y: rowY, size: 9, font: bold, color: INK_MID });
    p.drawLine({ start: { x: MARGIN, y: rowY - 8 }, end: { x: PAGE_WIDTH - MARGIN, y: rowY - 8 }, thickness: 1, color: BORDER });
  };

  drawHeader(page, y);
  y -= 26;

  for (const row of report.rows) {
    if (y < MARGIN + 40) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
      drawHeader(page, y);
      y -= 26;
    }

    const label = row.label ?? row.construct ?? row.questionId;
    const lines = wrapText(label, regular, 10.5, colResponses - colQuestion - 12);
    for (const line of lines) {
      page.drawText(line, { x: colQuestion, y, size: 10.5, font: regular, color: INK });
      y -= 14;
    }
    const lastLineY = y + 14;
    page.drawText(String(row.n), { x: colResponses, y: lastLineY, size: 10.5, font: regular, color: INK });
    page.drawText(row.average !== null ? row.average.toFixed(2) : "—", { x: colAverage, y: lastLineY, size: 10.5, font: regular, color: INK });
    y -= 12;
  }

  return doc.save();
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
