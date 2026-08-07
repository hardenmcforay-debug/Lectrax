/**
 * Grade publishing — bulk PUT scores (up to 500 rows).
 *
 * Env:
 *   CLASS_SESSION_ID
 *   ASSIGNMENT_ID or TEST_ID
 *   ENROLLMENT_IDS — comma-separated UUIDs (or auto-empty scores → measures validation path)
 *   LECTURER_IDENTIFIER / LECTURER_PASSWORD
 */
import { check, sleep } from "k6";
import { loginAs, pickLecturer } from "../lib/auth.js";
import { apiPut } from "../lib/http.js";
import { metrics } from "../lib/metrics.js";
import { env, thinkTimeSeconds } from "../lib/env.js";
import { vuScenario } from "../config/stages.js";
import { withThresholds } from "../config/thresholds.js";

export const options = withThresholds(vuScenario("grade_publish"));

function buildScores() {
  const raw = env("ENROLLMENT_IDS", "");
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 500);

  if (ids.length === 0) {
    // Still hits auth + validation; useful for gateway load without DB writes.
    return [];
  }

  return ids.map((enrollmentId, i) => ({
    enrollmentId,
    score: (i % 100) + 1,
  }));
}

export default function () {
  const classSessionId = env("CLASS_SESSION_ID");
  const assignmentId = env("ASSIGNMENT_ID");
  const testId = env("TEST_ID");

  if (!classSessionId || (!assignmentId && !testId)) {
    console.error("CLASS_SESSION_ID and ASSIGNMENT_ID or TEST_ID required");
    sleep(1);
    return;
  }

  const lecturer = pickLecturer();
  const session = loginAs(lecturer);
  if (!session.ok) {
    sleep(thinkTimeSeconds());
    return;
  }

  const scores = buildScores();
  const path = assignmentId
    ? `/api/lecturer/sessions/${classSessionId}/assignments/${assignmentId}/grades`
    : `/api/lecturer/sessions/${classSessionId}/tests/${testId}/scores`;

  const res = apiPut(
    path,
    { scores },
    {
      jar: session.jar,
      tags: { flow: "grade-publish" },
      trend: metrics.gradePublishLatency,
      timeout: "90s",
    }
  );

  check(res, {
    "grades not 5xx": (r) => r.status < 500,
    "grades expected": (r) => [200, 400, 403, 429].includes(r.status),
  });

  sleep(thinkTimeSeconds() + 1);
}
