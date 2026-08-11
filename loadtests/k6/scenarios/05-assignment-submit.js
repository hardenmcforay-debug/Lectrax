/**
 * Assignment submission (multipart PDF upload).
 *
 * Env:
 *   ASSIGNMENT_ID (uuid)
 *   student users enrolled for that assignment's class
 */
import { check, sleep } from "k6";
import http from "k6/http";
import { loginAs, pickUser } from "../lib/auth.js";
import { url, CSRF_HEADER } from "../lib/http.js";
import { metrics, observe } from "../lib/metrics.js";
import { multipartPdf, tinyPdfBytes } from "../lib/pdf.js";
import { allowRateLimits, env, thinkTimeSeconds } from "../lib/env.js";
import { arrivalScenario } from "../config/stages.js";
import { withThresholds } from "../config/thresholds.js";

export const options = withThresholds(arrivalScenario("assignment_submit"));

export default function () {
  const assignmentId = env("ASSIGNMENT_ID");
  if (!assignmentId) {
    console.error("ASSIGNMENT_ID required");
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

  const { body, contentType } = multipartPdf("file", `vu-${__VU}-submission.pdf`, tinyPdfBytes());
  const res = http.post(url(`/api/student/assignments/${assignmentId}/submit`), body, {
    jar: session.jar,
    headers: {
      ...CSRF_HEADER,
      "Content-Type": contentType,
    },
    tags: { flow: "assignment-submit", endpoint: "/api/student/assignments/:id/submit" },
    timeout: "120s",
  });

  observe(res, metrics.assignmentSubmitLatency, { allow429: allowRateLimits() });
  metrics.uploadLatency.add(res.timings.duration);

  check(res, {
    "submit not 5xx": (r) => r.status > 0 && r.status < 500,
    "submit expected": (r) => [200, 201, 400, 403, 409, 413, 415, 429].includes(r.status),
  });

  sleep(thinkTimeSeconds() * 2);
}
