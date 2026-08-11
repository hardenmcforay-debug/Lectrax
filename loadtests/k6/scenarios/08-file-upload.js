/**
 * File upload stress — same path as assignment submit (primary student upload surface).
 * Alias scenario with larger think-time and optional repeated uploads per VU.
 *
 * Env: ASSIGNMENT_ID
 */
import { check, sleep } from "k6";
import http from "k6/http";
import { loginAs, pickUser } from "../lib/auth.js";
import { url, CSRF_HEADER } from "../lib/http.js";
import { metrics, observe } from "../lib/metrics.js";
import { multipartPdf, tinyPdfBytes } from "../lib/pdf.js";
import { allowRateLimits, env, thinkTimeSeconds } from "../lib/env.js";
import { vuScenario } from "../config/stages.js";
import { withThresholds } from "../config/thresholds.js";

export const options = withThresholds(vuScenario("file_upload"));

export default function () {
  const assignmentId = env("ASSIGNMENT_ID");
  if (!assignmentId) {
    sleep(1);
    return;
  }

  const user = pickUser(__VU);
  if (user.role === "lecturer") {
    sleep(1);
    return;
  }

  const session = loginAs(user);
  if (!session.ok) {
    sleep(thinkTimeSeconds());
    return;
  }

  const repeats = Number(env("UPLOADS_PER_ITER", "1"));
  for (let i = 0; i < repeats; i++) {
    const { body, contentType } = multipartPdf(
      "file",
      `vu-${__VU}-iter-${__ITER}-${i}.pdf`,
      tinyPdfBytes()
    );
    const res = http.post(url(`/api/student/assignments/${assignmentId}/submit`), body, {
      jar: session.jar,
      headers: { ...CSRF_HEADER, "Content-Type": contentType },
      tags: { flow: "file-upload" },
      timeout: "120s",
    });
    observe(res, metrics.uploadLatency, { allow429: allowRateLimits() });
    check(res, { "upload not 5xx": (r) => r.status < 500 });
    sleep(0.5);
  }

  sleep(thinkTimeSeconds());
}
