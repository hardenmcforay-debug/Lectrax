import "server-only";

export { brandingExtensionMatchesMime, hasBlockedUploadExtension } from "@/lib/security/file-validation-shared";
import { BRANDING_IMAGE_MAX_BYTES } from "@/lib/landing/branding-image-validation";

export function hasPdfMagicHeader(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    (bytes[4] === 0x2d || bytes[4] === 0x20)
  );
}

export function hasJpegMagicHeader(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function hasPngMagicHeader(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

export function hasGifMagicHeader(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  );
}

export function hasWebpMagicHeader(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function isDangerousSvgMarkup(svg: string): boolean {
  return (
    /<script\b/i.test(svg) ||
    /\bon\w+\s*=/i.test(svg) ||
    /<foreignObject\b/i.test(svg) ||
    /javascript:/i.test(svg)
  );
}

function looksLikeSvg(bytes: Uint8Array): boolean {
  const sample = new TextDecoder("utf-8", { fatal: false }).decode(
    bytes.slice(0, Math.min(bytes.length, 4096))
  );
  const trimmed = sample.trimStart();
  return trimmed.startsWith("<svg") || trimmed.startsWith("<?xml");
}

/** Server-side branding image byte validation (magic bytes + SVG safety). */
export function validateBrandingImageBytes(
  bytes: Uint8Array,
  mime: string
): string | null {
  switch (mime) {
    case "image/jpeg":
      return hasJpegMagicHeader(bytes) ? null : "Invalid JPEG file.";
    case "image/png":
      return hasPngMagicHeader(bytes) ? null : "Invalid PNG file.";
    case "image/gif":
      return hasGifMagicHeader(bytes) ? null : "Invalid GIF file.";
    case "image/webp":
      return hasWebpMagicHeader(bytes) ? null : "Invalid WebP file.";
    case "image/svg+xml": {
      if (!looksLikeSvg(bytes)) return "Invalid SVG file.";
      const svgText = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      return isDangerousSvgMarkup(svgText) ? "SVG contains disallowed content." : null;
    }
    default:
      return "Unsupported image type.";
  }
}

/** Read branding upload bytes with size cap and magic-byte validation. */
export async function readBrandingFileBytes(
  file: File
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; error: string }> {
  if (file.size > BRANDING_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Image exceeds maximum allowed size." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const byteValidation = validateBrandingImageBytes(bytes, file.type);
  if (byteValidation) {
    return { ok: false, error: byteValidation };
  }

  return { ok: true, bytes };
}
