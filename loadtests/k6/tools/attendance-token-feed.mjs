/**
 * Live QR token feed for sustained attendance load tests.
 *
 * Starts (or reuses) an attendance session and refreshes every 5s,
 * serving { qrToken, attendanceSessionId, expiresAt } on HTTP.
 *
 * Usage:
 *   node loadtests/k6/tools/attendance-token-feed.mjs
 *
 * Env (or loadtests/k6/.env):
 *   BASE_URL, LECTURER_IDENTIFIER, LECTURER_PASSWORD, CLASS_SESSION_ID
 *   FEED_PORT=9091
 *   ATTENDANCE_SESSION_ID + skip start if already open
 */
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotEnv() {
  const candidates = [
    resolve(__dirname, "../.env"),
    resolve(__dirname, "../../../.env.local"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadDotEnv();

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const PORT = Number(process.env.FEED_PORT || 9091);
const CSRF = { "X-Lectrax-Request": "1", "Content-Type": "application/json" };

let state = {
  qrToken: "",
  attendanceSessionId: "",
  expiresAt: "",
  lastError: null,
  refreshedAt: null,
};

function parseSetCookies(res) {
  const raw = res.headers.getSetCookie?.() || [];
  if (raw.length) return raw.map((c) => c.split(";")[0]).join("; ");
  const single = res.headers.get("set-cookie");
  return single ? single.split(",").map((c) => c.split(";")[0].trim()).join("; ") : "";
}

async function login() {
  const identifier = process.env.LECTURER_IDENTIFIER;
  const password = process.env.LECTURER_PASSWORD;
  if (!identifier || !password) {
    throw new Error("LECTURER_IDENTIFIER and LECTURER_PASSWORD required");
  }
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: CSRF,
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) {
    throw new Error(`login failed: ${res.status} ${await res.text()}`);
  }
  const cookie = parseSetCookies(res);
  if (!cookie) throw new Error("login succeeded but no Set-Cookie");
  return cookie;
}

async function api(cookie, method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { ...CSRF, Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { res, json, text };
}

async function ensureSession(cookie) {
  if (process.env.ATTENDANCE_SESSION_ID && process.env.QR_TOKEN) {
    state.attendanceSessionId = process.env.ATTENDANCE_SESSION_ID;
    state.qrToken = process.env.QR_TOKEN;
    return;
  }
  const classSessionId = process.env.CLASS_SESSION_ID;
  if (!classSessionId) throw new Error("CLASS_SESSION_ID required");

  const { res, json, text } = await api(cookie, "POST", "/api/attendance/start", {
    classSessionId,
    title: `token-feed ${new Date().toISOString()}`,
    durationMinutes: Number(process.env.ATTENDANCE_WINDOW_MIN || 30),
  });

  if (!res.ok) {
    throw new Error(`attendance start failed: ${res.status} ${text}`);
  }
  state.attendanceSessionId = json.session?.id || "";
  state.qrToken = json.qrToken || "";
  state.expiresAt = json.tokenExpiresAt || json.session?.qr_expires_at || "";
}

async function refresh(cookie) {
  const { res, json, text } = await api(cookie, "POST", "/api/attendance/refresh", {
    attendanceSessionId: state.attendanceSessionId,
  });
  if (!res.ok) {
    state.lastError = `${res.status} ${text.slice(0, 200)}`;
    return;
  }
  state.qrToken = json.qrToken || state.qrToken;
  state.expiresAt = json.tokenExpiresAt || state.expiresAt;
  state.refreshedAt = new Date().toISOString();
  state.lastError = null;
}

async function main() {
  console.log(`[token-feed] logging into ${BASE_URL}`);
  const cookie = await login();
  await ensureSession(cookie);
  console.log(`[token-feed] session ${state.attendanceSessionId}`);

  await refresh(cookie);
  setInterval(() => {
    refresh(cookie).catch((err) => {
      state.lastError = String(err);
    });
  }, 5000);

  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(
      JSON.stringify({
        qrToken: state.qrToken,
        token: state.qrToken,
        attendanceSessionId: state.attendanceSessionId,
        expiresAt: state.expiresAt,
        refreshedAt: state.refreshedAt,
        lastError: state.lastError,
      })
    );
  });

  server.listen(PORT, () => {
    console.log(`[token-feed] serving http://127.0.0.1:${PORT}/`);
    console.log(`[token-feed] k6: -e TOKEN_FEED_URL=http://127.0.0.1:${PORT}/`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
