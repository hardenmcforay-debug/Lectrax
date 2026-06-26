import type { NextRequest } from "next/server";

/** Default cap for JSON API bodies (contact forms, grades payloads, etc.). */
export const MAX_JSON_BODY_BYTES = 512 * 1024;

/** Assignment PDF uploads (10 MB file + multipart overhead). */
export const MAX_FILE_UPLOAD_BODY_BYTES = 12 * 1024 * 1024;

/** Admin branding image uploads (5 MB file + multipart overhead). */
export const MAX_BRANDING_UPLOAD_BODY_BYTES = 6 * 1024 * 1024;

const FILE_UPLOAD_PATH_PREFIXES = [
  "/api/student/assignments/",
] as const;

const BRANDING_UPLOAD_PATHS = new Set([
  "/api/admin/site-logo",
  "/api/admin/landing-hero",
  "/api/admin/landing-feature-cards",
]);

function isAssignmentSubmitPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/student/assignments/") && pathname.endsWith("/submit")
  );
}

export function getMaxBodyBytesForPath(pathname: string): number | null {
  if (!pathname.startsWith("/api/")) return null;

  if (BRANDING_UPLOAD_PATHS.has(pathname)) {
    return MAX_BRANDING_UPLOAD_BODY_BYTES;
  }

  if (isAssignmentSubmitPath(pathname)) {
    return MAX_FILE_UPLOAD_BODY_BYTES;
  }

  if (FILE_UPLOAD_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return MAX_FILE_UPLOAD_BODY_BYTES;
  }

  return MAX_JSON_BODY_BYTES;
}

export function getContentLength(request: NextRequest): number | null {
  const raw = request.headers.get("content-length");
  if (!raw) return null;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function isBodyTooLarge(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const maxBytes = getMaxBodyBytesForPath(pathname);
  if (maxBytes == null) return false;

  const contentLength = getContentLength(request);
  if (contentLength == null) return false;
  return contentLength > maxBytes;
}
