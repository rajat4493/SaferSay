import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderReportPdf } from "@/lib/server/reportPdf";

describe("renderReportPdf", () => {
  it("renders a suppression message, not row data, for a protected report", async () => {
    const bytes = await renderReportPdf({
      tenantName: "Acme Ltd",
      cycleName: "July Pulse",
      minGroupSize: 5,
      report: { protected: true, n: 2, rows: [] },
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("renders question rows for an unprotected report", async () => {
    const bytes = await renderReportPdf({
      tenantName: "Acme Ltd",
      cycleName: "July Pulse",
      minGroupSize: 5,
      report: {
        protected: false,
        n: 12,
        rows: [
          { questionId: "q1", label: "I understand what is expected of me at work.", n: 12, average: 4.1 },
          { questionId: "q2", label: "My manager gives me useful support when I need it.", n: 12, average: 3.4 },
        ],
      },
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("paginates when there are enough rows to overflow one page", async () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({
      questionId: `q${i}`,
      label: `Question number ${i} with some longer wording to take up more vertical space on the page.`,
      n: 10,
      average: 3.5,
    }));
    const bytes = await renderReportPdf({
      tenantName: "Acme Ltd",
      cycleName: "Full Year Review",
      minGroupSize: 5,
      report: { protected: false, n: 10, rows },
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });
});
