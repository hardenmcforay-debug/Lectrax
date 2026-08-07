/**
 * QR Attendance concurrency test.
 *
 * Modes:
 * 1) BURST (default): setup starts session; students stampede within ~4s on one token.
 *    Best for DB uniqueness / scan RPC contention.
 * 2) SUSTAINED: set TOKEN_FEED_URL to a live token JSON feed (see tools/attendance-token-feed.mjs).
 *
 * Env:
 *   CLASS_SESSION_ID | ATTENDANCE_SESSION_ID+QR_TOKEN
 *   LECTURER_IDENTIFIER / LECTURER_PASSWORD
 *   TOKEN_FEED_URL (optional)
 *   SCALE
 */
import { check, sleep } from "k6";
import http from "k6/http";
import { loginAs, pickLecturer, pickUser } from "../lib/auth.js";
import { apiPost } from "../lib/http.js";
import { deviceIdentity } from "../lib/devices.js";
import { metrics } from "../lib/metrics.js";
import { env, thinkTimeSeconds } from "../lib/env.js";
import { currentProfile } from "../config/stages.js";
import { withThresholds } from "../config/thresholds.js";

const profile = currentProfile();
const peak = Math.min(profile.effectiveScale, Number(env("ATTENDANCE_MAX_VUS", String(profile.effectiveScale))));

export const options = withThresholds({
  scenarios: {
    student_scan_burst: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: Math.min(50, peak) },
        { duration: "40s", target: peak },
        { duration: "2m", target: peak },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "20s",
      exec: "studentScan",
      tags: { flow: "attendance-scan" },
    },
  },
});

export function setup() {
  const feed = env("TOKEN_FEED_URL");
  if (feed) {
    return { mode: "feed", feedUrl: feed, qrToken: "", attendanceSessionId: "" };
  }

  if (env("QR_TOKEN")) {
    return {
      mode: "static",
      qrToken: env("QR_TOKEN"),
      attendanceSessionId: env("ATTENDANCE_SESSION_ID", ""),
    };
  }

  const classSessionId = env("CLASS_SESSION_ID");
  if (!classSessionId) {
    console.error("Set CLASS_SESSION_ID or QR_TOKEN or TOKEN_FEED_URL");
    return { mode: "none", qrToken: "", attendanceSessionId: "" };
  }

  const lecturer = pickLecturer();
  const session = loginAs(lecturer);
  if (!session.ok) {
    console.error("Lecturer login failed");
    return { mode: "none", qrToken: "", attendanceSessionId: "" };
  }

  const start = apiPost(
    "/api/attendance/start",
    {
      classSessionId,
      title: `k6 attendance ${Date.now()}`,
      durationMinutes: Number(env("ATTENDANCE_WINDOW_MIN", "15")),
    },
    { jar: session.jar, tags: { flow: "attendance-setup" } }
  );

  if (start.status !== 200) {
    console.error(`start failed: ${start.status} ${String(start.body).slice(0, 300)}`);
    return { mode: "none", qrToken: "", attendanceSessionId: "" };
  }

  const body = start.json();
  return {
    mode: "burst",
    qrToken: body.qrToken || "",
    attendanceSessionId: body.session?.id || "",
  };
}

function resolveToken(data) {
  if (data.mode === "feed" && data.feedUrl) {
    const res = http.get(data.feedUrl, { timeout: "5s", tags: { flow: "token-feed" } });
    if (res.status === 200) {
      try {
        return res.json("qrToken") || res.json("token") || "";
      } catch {
        return "";
      }
    }
    return "";
  }
  return data.qrToken || "";
}

export function studentScan(data) {
  const token = resolveToken(data);
  if (!token) {
    sleep(1);
    return;
  }

  const user = pickUser(__VU);
  if (user.role === "lecturer") {
    sleep(thinkTimeSeconds());
    return;
  }

  const session = loginAs(user);
  if (!session.ok) {
    sleep(thinkTimeSeconds());
    return;
  }

  const identity = deviceIdentity(`${user.identifier}-${__VU}`);

  apiPost("/api/attendance/device/register", identity, {
    jar: session.jar,
    tags: { flow: "device-register" },
  });

  const scan = apiPost(
    "/api/attendance/scan",
    {
      token,
      ...identity,
    },
    {
      jar: session.jar,
      tags: { flow: "attendance-scan" },
      trend: metrics.attendanceScanLatency,
    }
  );

  check(scan, {
    "scan not 5xx": (r) => r.status > 0 && r.status < 500,
    "scan expected status": (r) => [200, 400, 403, 409, 410, 429].includes(r.status),
  });

  // Burst: minimal think time so many VUs hit the same token window.
  sleep(data.mode === "burst" ? 0.2 : thinkTimeSeconds());
}

export default studentScan;

export function teardown(data) {
  if (!data.attendanceSessionId || data.mode === "feed") return;
  try {
    const lecturer = pickLecturer();
    const session = loginAs(lecturer);
    if (!session.ok) return;
    apiPost(
      "/api/attendance/end",
      { attendanceSessionId: data.attendanceSessionId },
      { jar: session.jar, tags: { flow: "attendance-teardown" } }
    );
  } catch {
    /* ignore */
  }
}
