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

function hashString(raw: string): string {
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getCanvasFingerprint(): string {
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
    return hashString(canvas.toDataURL());
  } catch {
    return "canvas_unavailable";
  }
}

function getWebGlFingerprint(): string {
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
    return hashString(`${vendor}|${renderer}`);
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

export function getAttendanceDeviceIdentity(): AttendanceDeviceIdentity {
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
    getCanvasFingerprint(),
    getWebGlFingerprint(),
    nav.cookieEnabled,
    typeof nav.doNotTrack === "string" ? nav.doNotTrack : "",
  ].join("|");

  return {
    deviceFingerprint: `dev_${hashString(hardwareRaw)}`,
    browserFingerprint: `br_${hashString(browserRaw)}`,
    deviceIdentifier,
    deviceMetadata: {
      platform: nav.platform,
      userAgent: nav.userAgent,
      language: nav.language,
      screenWidth: screen.width,
      screenHeight: screen.height,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: nav.hardwareConcurrency ?? null,
    },
  };
}
