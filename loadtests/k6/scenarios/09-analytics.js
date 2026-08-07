/**
 * Analytics / CA table — heavy student-rows + optional export.
 *
 * Env:
 *   CLASS_SESSION_ID
 *   RUN_EXPORT=true to hit Excel export (expensive — keep SCALE low)
 */
import { check, sleep, group } from "k6";
import { loginAs, pickLecturer } from "../lib/auth.js";
import { apiGet, apiPost } from "../lib/http.js";
import { metrics } from "../lib/metrics.js";
import { boolEnv, env, thinkTimeSeconds } from "../lib/env.js";
import { vuScenario } from "../config/stages.js";
import { withThresholds } from "../config/thresholds.js";

export const options = withThresholds(vuScenario("analytics"));

export default function () {
  const classSessionId = env("CLASS_SESSION_ID");
  if (!classSessionId) {
    console.error("CLASS_SESSION_ID required");
    sleep(1);
    return;
  }

  const lecturer = pickLecturer();
  const session = loginAs(lecturer);
  if (!session.ok) {
    sleep(thinkTimeSeconds());
    return;
  }

  group("student_rows", () => {
    const rows = apiGet(`/api/lecturer/sessions/${classSessionId}/student-rows`, {
      jar: session.jar,
      tags: { flow: "analytics-rows" },
      trend: metrics.analyticsLatency,
      timeout: "120s",
    });
    check(rows, {
      "rows not 5xx": (r) => r.status < 500,
      "rows ok": (r) => [200, 403, 429].includes(r.status),
    });
  });

  if (boolEnv("RUN_EXPORT", false) && __VU === 1) {
    group("export", () => {
      const exp = apiPost(
        `/api/lecturer/sessions/${classSessionId}/export-student-performance`,
        {},
        {
          jar: session.jar,
          tags: { flow: "analytics-export" },
          trend: metrics.analyticsLatency,
          timeout: "180s",
        }
      );
      check(exp, { "export not 5xx": (r) => r.status < 500 });
    });
  }

  sleep(thinkTimeSeconds() + Math.random());
}
