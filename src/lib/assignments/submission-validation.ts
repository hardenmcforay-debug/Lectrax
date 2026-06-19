/** Client-safe assignment submission file validation (no server imports). */

import { isPdfFile, MAX_SUBMISSION_FILE_SIZE } from "@/lib/assignments/storage";
import { sanitizeFilename } from "@/lib/security/sanitize";
import { hasBlockedUploadExtension } from "@/lib/security/file-validation-shared";

export function validateSubmissionFile(file: File): string | null {
  const safeName = sanitizeFilename(file.name);

  if (hasBlockedUploadExtension(safeName)) {
    return "This file type is not allowed.";
  }

  if (!safeName.toLowerCase().endsWith(".pdf")) {
    return "Only PDF files are allowed. Images, archives, and videos are not permitted.";
  }

  if (!isPdfFile({ type: file.type, name: safeName })) {
    return "Only PDF files are allowed. Images, archives, and videos are not permitted.";
  }

  if (file.size > MAX_SUBMISSION_FILE_SIZE) {
    return `File exceeds the 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`;
  }

  if (file.size === 0) {
    return "The selected file is empty.";
  }

  return null;
}
