import "server-only";

import { antivirusScanUserMessage, scanWithAntivirus } from "@/lib/security/antivirus-scan";
import { hasPdfMagicHeader } from "@/lib/security/file-validation";
import { inspectPdfContent, pdfInspectionUserMessage } from "@/lib/security/pdf-inspection";

export type SubmissionScanResult =
  | { ok: true }
  | { ok: false; error: string; reason: string };

/** Deep PDF inspection plus optional antivirus scan before assignment upload. */
export async function scanAssignmentSubmissionPdf(
  bytes: Uint8Array
): Promise<SubmissionScanResult> {
  if (!hasPdfMagicHeader(bytes)) {
    return {
      ok: false,
      error: "Only valid PDF files are allowed.",
      reason: "invalid_pdf_header",
    };
  }

  const pdfInspection = inspectPdfContent(bytes);
  if (!pdfInspection.safe) {
    return {
      ok: false,
      error: pdfInspectionUserMessage(pdfInspection.code),
      reason: `pdf_${pdfInspection.code}`,
    };
  }

  const antivirus = await scanWithAntivirus(bytes);
  if (!antivirus.safe) {
    return {
      ok: false,
      error: antivirusScanUserMessage(antivirus.detail),
      reason: "antivirus_rejected",
    };
  }

  return { ok: true };
}
