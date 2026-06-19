/** Client-safe branding image validation (no server imports). */

import { brandingExtensionMatchesMime } from "@/lib/security/file-validation-shared";

export const BRANDING_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export function isAllowedBrandingImage(file: { type: string; size: number }): boolean {
  return (
    ALLOWED_IMAGE_TYPES.has(file.type) &&
    file.size > 0 &&
    file.size <= BRANDING_IMAGE_MAX_BYTES
  );
}

export function validateBrandingImageFile(file: File): string | null {
  if (!isAllowedBrandingImage(file)) {
    return "Invalid image. Use JPEG, PNG, WebP, GIF, or SVG up to 5 MB.";
  }
  if (!brandingExtensionMatchesMime(file)) {
    return "File extension does not match the image type.";
  }
  return null;
}
