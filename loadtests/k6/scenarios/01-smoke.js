/**
 * Smoke — health, ready, live. No auth. Validates generator → app path.
 *
 * k6 run loadtests/k6/scenarios/01-smoke.js -e BASE_URL=http://localhost:3000 -e SCALE=100
 */
import { check, sleep } from "k6";
import { apiGet } from "../lib/http.js";
import { thinkTimeSeconds } from "../lib/env.js";
import { vuScenario } from "../config/stages.js";
import { withThresholds } from "../config/thresholds.js";

export const options = withThresholds({
  ...vuScenario("smoke"),
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
});

export default function () {
  const live = apiGet("/api/live", { tags: { flow: "smoke" } });
  check(live, { "live 200": (r) => r.status === 200 });

  const ready = apiGet("/api/ready", { tags: { flow: "smoke" } });
  check(ready, { "ready 200": (r) => r.status === 200 });

  const health = apiGet("/api/health", { tags: { flow: "smoke" } });
  check(health, { "health 200": (r) => r.status === 200 });

  sleep(thinkTimeSeconds());
}
