/**
 * Dashboard loading — authenticated page + student-rows / notifications APIs.
 *
 * Env:
 *   CLASS_SESSION_ID (lecturer analytics / student-rows)
 *   SCALE, USERS_FILE / LECTURER_*
 */
import { check, sleep, group } from "k6";
import http from "k6/http";
import { loginAs, pickUser, pickLecturer } from "../lib/auth.js";
import { apiGet, url, CSRF_HEADER } from "../lib/http.js";
import { metrics } from "../lib/metrics.js";
import { env, thinkTimeSeconds } from "../lib/env.js";
import { vuScenario } from "../config/stages.js";
import { withThresholds } from "../config/thresholds.js";

export const options = withThresholds(vuScenario("dashboard"));

export default function () {
  const classSessionId = env("CLASS_SESSION_ID");
  const preferLecturer = __VU % 5 === 0 && (env("LECTURER_IDENTIFIER") || true);

  const user = preferLecturer ? (() => {
    try {
      return pickLecturer();
    } catch {
      return pickUser(__VU);
    }
  })() : pickUser(__VU);

  const session = loginAs(user);
  if (!session.ok) {
    sleep(thinkTimeSeconds());
    return;
  }

  group("dashboard_pages", () => {
    const path = user.role === "lecturer" ? "/lecturer" : "/student";
    const page = http.get(url(path), {
      jar: session.jar,
      headers: { ...CSRF_HEADER, Accept: "text/html" },
      tags: { flow: "dashboard-page", endpoint: path },
      timeout: "60s",
    });
    metrics.dashboardLatency.add(page.timings.duration);
    check(page, {
      "dashboard page ok": (r) => r.status === 200 || r.status === 307 || r.status === 302,
    });
  });

  group("dashboard_apis", () => {
    if (user.role === "student" || !classSessionId) {
      const counts = apiGet("/api/student/notifications/counts", {
        jar: session.jar,
        tags: { flow: "notifications" },
        trend: metrics.dashboardLatency,
      });
      check(counts, { "notifications api": (r) => [200, 401, 403, 429].includes(r.status) });
    }

    if ((user.role === "lecturer" || preferLecturer) && classSessionId) {
      const rows = apiGet(`/api/lecturer/sessions/${classSessionId}/student-rows`, {
        jar: session.jar,
        tags: { flow: "student-rows" },
        trend: metrics.analyticsLatency,
        timeout: "90s",
      });
      check(rows, {
        "student-rows ok or limited": (r) => [200, 401, 403, 429].includes(r.status),
        "student-rows not 5xx": (r) => r.status < 500,
      });
    }
  });

  sleep(thinkTimeSeconds() + Math.random() * 2);
}
