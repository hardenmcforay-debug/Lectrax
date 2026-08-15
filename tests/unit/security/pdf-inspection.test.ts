import { describe, expect, it } from "vitest";
import { hasPdfMagicHeader } from "@/lib/security/file-validation";
import { inspectPdfContent } from "@/lib/security/pdf-inspection";

function pdfBytes(body: string, prefix = ""): Uint8Array {
  return new TextEncoder().encode(`${prefix}${body}`);
}

const MINIMAL_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`;

describe("assignment PDF inspection", () => {
  it("accepts a normal assignment PDF", () => {
    const bytes = pdfBytes(MINIMAL_PDF);
    expect(hasPdfMagicHeader(bytes)).toBe(true);
    expect(inspectPdfContent(bytes)).toEqual({ safe: true });
  });

  it("accepts a PDF with a short prefix before %PDF (ISO 32000)", () => {
    const bytes = pdfBytes(MINIMAL_PDF, "\n\n");
    expect(hasPdfMagicHeader(bytes)).toBe(true);
    expect(inspectPdfContent(bytes).safe).toBe(true);
  });

  it("accepts a PDF that opens on a page (OpenAction)", () => {
    const bytes = pdfBytes(
      MINIMAL_PDF.replace(
        "/Type /Catalog /Pages 2 0 R",
        "/Type /Catalog /Pages 2 0 R /OpenAction 3 0 R"
      )
    );
    expect(inspectPdfContent(bytes)).toEqual({ safe: true });
  });

  it("rejects a JPEG that is only named like a PDF", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(hasPdfMagicHeader(bytes)).toBe(false);
  });

  it("rejects JavaScript actions", () => {
    const bytes = pdfBytes(
      MINIMAL_PDF.replace(
        "/Type /Catalog /Pages 2 0 R",
        "/Type /Catalog /Pages 2 0 R /JavaScript (app.alert)"
      )
    );
    const result = inspectPdfContent(bytes);
    expect(result.safe).toBe(false);
    if (!result.safe) {
      expect(result.code).toBe("dangerous_content");
    }
  });

  it("rejects a truncated PDF without a trailer", () => {
    const bytes = pdfBytes("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n");
    const result = inspectPdfContent(bytes);
    expect(result.safe).toBe(false);
    if (!result.safe) {
      expect(result.code).toBe("invalid_structure");
    }
  });
});
