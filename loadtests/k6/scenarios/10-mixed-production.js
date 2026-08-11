/**
 * Mixed production-like workload.
 * Weights approximate real SaaS traffic: reads >> writes, attendance spikes separate.
 *
 * Scenario mix (by VU modulo):
 *   50% dashboard / notifications
 *   20% auth refresh (re-login)
 *   15% analytics rows (lecturer)
 *   10% assignment submit
 *   5%  grade publish
 *
 * Attendance is intentionally a separate scenario (03) — run in parallel via run-all.
 */
import { sleep } from "k6";
import { loginAs, pickUser, pickLecturer } from "../lib/auth.js";
import { apiGet, apiPut } from "../lib/http.js";
import http from "k6/http";
import { url, CSRF_HEADER } from "../lib/http.js";
import { metrics, observe } from "../lib/metrics.js";
import { multipartPdf, tinyPdfBytes } from "../lib/pdf.js";
import { allowRateLimits, env, thinkTimeSeconds } from "../lib/env.js";
import { vuScenario } from "../config/stages.js";
import { withThresholds } from "../config/thresholds.js";

export const options = withThresholds(vuScenario("mixed"));

export default function () {
  const bucket = __VU % 100;
  const classSessionId = env("CLASS_SESSION_ID", "");
  const assignmentId = env("ASSIGNMENT_ID", "");

  if (bucket < 50) {
    const user = pickUser(__VU);
    const session = loginAs(user);
    if (session.ok) {
      const path = user.role === "lecturer" ? "/lecturer" : "/student";
      const page = http.get(url(path), {
        jar: session.jar,
        headers: { Accept: "text/html", ...CSRF_HEADER },
        tags: { flow: "mixed-dashboard" },
      });
      metrics.dashboardLatency.add(page.timings.duration);
      if (user.role !== "lecturer") {
        apiGet("/api/student/notifications/counts", {
          jar: session.jar,
          tags: { flow: "mixed-notifications" },
          trend: metrics.dashboardLatency,
        });
      }
    }
  } else if (bucket < 70) {
    loginAs(pickUser(__VU));
  } else if (bucket < 85 && classSessionId) {
    try {
      const lecturer = pickLecturer();
      const session = loginAs(lecturer);
      if (session.ok) {
        apiGet(`/api/lecturer/sessions/${classSessionId}/student-rows`, {
          jar: session.jar,
          tags: { flow: "mixed-analytics" },
          trend: metrics.analyticsLatency,
          timeout: "90s",
        });
      }
    } catch {
      /* no lecturer */
    }
  } else if (bucket < 95 && assignmentId) {
    const user = pickUser(__VU);
    if (user.role !== "lecturer") {
      const session = loginAs(user);
      if (session.ok) {
        const { body, contentType } = multipartPdf("file", `mixed-${__VU}.pdf`, tinyPdfBytes());
        const res = http.post(url(`/api/student/assignments/${assignmentId}/submit`), body, {
          jar: session.jar,
          headers: { ...CSRF_HEADER, "Content-Type": contentType },
          tags: { flow: "mixed-upload" },
          timeout: "120s",
        });
        observe(res, metrics.assignmentSubmitLatency, { allow429: allowRateLimits() });
      }
    }
  } else if (classSessionId && assignmentId) {
    try {
      const lecturer = pickLecturer();
      const session = loginAs(lecturer);
      if (session.ok) {
        apiPut(
          `/api/lecturer/sessions/${classSessionId}/assignments/${assignmentId}/grades`,
          { scores: [] },
          {
            jar: session.jar,
            tags: { flow: "mixed-grades" },
            trend: metrics.gradePublishLatency,
          }
        );
      }
    } catch {
      /* ignore */
    }
  }

  sleep(thinkTimeSeconds() + Math.random() * 2);
}
