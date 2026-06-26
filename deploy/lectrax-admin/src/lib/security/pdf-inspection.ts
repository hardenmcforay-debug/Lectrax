import "server-only";

export type PdfInspectionCode =
  | "invalid_structure"
  | "dangerous_content"
  | "encrypted"
  | "polyglot"
  | "size_anomaly";

export type PdfInspectionResult =
  | { safe: true }
  | { safe: false; code: PdfInspectionCode; detail: string };

const MAX_PDF_BYTES = 10 * 1024 * 1024;

/** PDF features that can execute code, launch files, or hide payloads. */
const DANGEROUS_PDF_PATTERNS: { pattern: RegExp; detail: string }[] = [
  { pattern: /\/JavaScript\b/i, detail: "JavaScript action" },
  { pattern: /\/JS\s*[\(<]/i, detail: "JavaScript stream" },
  { pattern: /\/OpenAction\b/i, detail: "open action" },
  { pattern: /\/AA\s*</, detail: "additional actions" },
  { pattern: /\/Launch\b/i, detail: "file launch action" },
  { pattern: /\/EmbeddedFile\b/i, detail: "embedded attachment" },
  { pattern: /\/EmbeddedFiles\b/i, detail: "embedded files collection" },
  { pattern: /\/RichMedia\b/i, detail: "rich media object" },
  { pattern: /\/XFA\b/i, detail: "dynamic XFA form" },
  { pattern: /\/ImportData\b/i, detail: "import data action" },
  { pattern: /\/SubmitForm\b/i, detail: "submit form action" },
  { pattern: /\/GoToR\b/i, detail: "remote go-to action" },
  { pattern: /\/URI\s*\(\s*javascript:/i, detail: "javascript URI" },
];

function decodePdfSample(bytes: Uint8Array): string {
  const length = Math.min(bytes.length, MAX_PDF_BYTES);
  let text = "";
  for (let i = 0; i < length; i += 1) {
    text += String.fromCharCode(bytes[i]!);
  }
  return text;
}

function hasValidPdfTrailer(bytes: Uint8Array): boolean {
  const tailSize = Math.min(bytes.length, 4096);
  const tail = decodePdfSample(bytes.subarray(bytes.length - tailSize));
  return tail.includes("%%EOF");
}

function countPdfHeaders(bytes: Uint8Array): number {
  const sample = decodePdfSample(bytes);
  return sample.match(/%PDF-\d/gi)?.length ?? 0;
}

function userMessageForCode(code: PdfInspectionCode): string {
  switch (code) {
    case "encrypted":
      return "Password-protected or encrypted PDFs are not accepted.";
    case "dangerous_content":
      return "This PDF contains disallowed active content and cannot be submitted.";
    case "polyglot":
      return "This file does not appear to be a valid PDF.";
    case "size_anomaly":
      return "This PDF exceeds allowed complexity limits.";
    case "invalid_structure":
    default:
      return "The file does not appear to be a valid PDF.";
  }
}

export function pdfInspectionUserMessage(code: PdfInspectionCode): string {
  return userMessageForCode(code);
}

/** Structural and content inspection for assignment PDF uploads. */
export function inspectPdfContent(bytes: Uint8Array): PdfInspectionResult {
  if (bytes.length === 0 || bytes.length > MAX_PDF_BYTES) {
    return {
      safe: false,
      code: "size_anomaly",
      detail: `PDF size out of range (${bytes.length} bytes)`,
    };
  }

  if (!hasValidPdfTrailer(bytes)) {
    return { safe: false, code: "invalid_structure", detail: "Missing PDF trailer (%%EOF)" };
  }

  const headerCount = countPdfHeaders(bytes);
  if (headerCount > 1) {
    return { safe: false, code: "polyglot", detail: "Multiple PDF headers detected" };
  }

  const content = decodePdfSample(bytes);

  if (!/^%PDF-\d/i.test(content.trimStart())) {
    return { safe: false, code: "invalid_structure", detail: "Invalid PDF version header" };
  }

  if (/\/Encrypt\b/i.test(content)) {
    return { safe: false, code: "encrypted", detail: "Encrypted PDF object" };
  }

  for (const { pattern, detail } of DANGEROUS_PDF_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, code: "dangerous_content", detail };
    }
  }

  const objectCount = (content.match(/\d+\s+\d+\s+obj\b/g) ?? []).length;
  if (objectCount > 5000) {
    return {
      safe: false,
      code: "size_anomaly",
      detail: `Excessive PDF object count (${objectCount})`,
    };
  }

  return { safe: true };
}
