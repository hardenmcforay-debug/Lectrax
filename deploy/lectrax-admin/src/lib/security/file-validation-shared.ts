const BLOCKED_UPLOAD_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".js",
  ".mjs",
  ".html",
  ".htm",
  ".php",
  ".sh",
  ".ps1",
  ".vbs",
  ".jar",
  ".dll",
  ".scr",
]);

export function hasBlockedUploadExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  for (const ext of BLOCKED_UPLOAD_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "image/svg+xml": ["svg"],
};

export function brandingExtensionMatchesMime(file: { type: string; name: string }): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) return false;
  const allowed = MIME_TO_EXTENSIONS[file.type];
  return allowed?.includes(ext) ?? false;
}
