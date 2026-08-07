export const ATTENDANCE_DEVICE_ID_KEY = "lectrax_attendance_device_id";

export type AttendanceDeviceIdentity = {
  deviceFingerprint: string;
  browserFingerprint: string;
  deviceIdentifier: string;
  deviceMetadata: Record<string, string | number | boolean | null>;
};

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** Legacy 32-bit hash — only used when SubtleCrypto is unavailable. */
function hashStringLegacy(raw: string): string {
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function sha256Hex(raw: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  // FNV-1a 64-bit style fallback (much stronger than 32-bit legacy).
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + i;
    h2 = Math.imul(h2, 0x01000193);
  }
  const a = (h1 >>> 0).toString(16).padStart(8, "0");
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${a}${b}${a}${b}${a}${b}${a}${b}`;
}

function getCanvasFingerprintRaw(): string {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no_canvas";
    canvas.width = 240;
    canvas.height = 60;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#0b3d91";
    ctx.fillRect(0, 0, 240, 60);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.fillText("lectrax-attendance-device", 12, 32);
    return canvas.toDataURL();
  } catch {
    return "canvas_unavailable";
  }
}

function getWebGlFingerprintRaw(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) return "no_webgl";
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR);
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    return `${vendor}|${renderer}`;
  } catch {
    return "webgl_unavailable";
  }
}

export function getOrCreateDeviceIdentifier(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(ATTENDANCE_DEVICE_ID_KEY);
  if (existing) return existing;
  const id = generateUuid();
  localStorage.setItem(ATTENDANCE_DEVICE_ID_KEY, id);
  return id;
}

/**
 * Stable device identity for attendance binding.
 * Primary binding is the local UUID (`deviceIdentifier`); fingerprints are secondary signals.
 */
export async function getAttendanceDeviceIdentity(): Promise<AttendanceDeviceIdentity> {
  if (typeof window === "undefined") {
    return {
      deviceFingerprint: "server",
      browserFingerprint: "server",
      deviceIdentifier: "server",
      deviceMetadata: {},
    };
  }

  const nav = window.navigator;
  const screen = window.screen;
  const deviceIdentifier = getOrCreateDeviceIdentifier();

  const hardwareRaw = [
    nav.platform,
    nav.hardwareConcurrency ?? 0,
    nav.maxTouchPoints ?? 0,
    screen.width,
    screen.height,
    screen.colorDepth,
    screen.pixelDepth,
    new Date().getTimezoneOffset(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");

  const browserRaw = [
    nav.userAgent,
    nav.language,
    nav.languages?.join(",") ?? "",
    getCanvasFingerprintRaw(),
    getWebGlFingerprintRaw(),
    nav.cookieEnabled,
    typeof nav.doNotTrack === "string" ? nav.doNotTrack : "",
  ].join("|");

  const [deviceHash, browserHash] = await Promise.all([
    sha256Hex(hardwareRaw),
    sha256Hex(browserRaw),
  ]);

  return {
    deviceFingerprint: `dev_${deviceHash}`,
    browserFingerprint: `br_${browserHash}`,
    deviceIdentifier,
    deviceMetadata: {
      platform: nav.platform,
      userAgent: nav.userAgent,
      language: nav.language,
      screenWidth: screen.width,
      screenHeight: screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: nav.hardwareConcurrency ?? null,
      fingerprintAlgo: crypto.subtle ? "sha256" : "fnv1a64-fallback",
      // Keep a legacy digest for diagnostics only (never used as auth alone).
      legacyDeviceHint: hashStringLegacy(hardwareRaw),
    },
  };
}
