export const ATTENDANCE_DEVICE_ID_KEY = "lectrax_attendance_device_id";

export type AttendanceDeviceIdentity = {
  deviceFingerprint: string;
  browserFingerprint: string;
  deviceIdentifier: string;
  deviceMetadata: Record<string, string | number | boolean | null>;
};

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
  const id = crypto.randomUUID();
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
