/**
 * Authentication load — login + role probe.
 *
 * NOTE: Per-IP login limit is 30/15m. For high SCALE, spread source IPs
 * (k6 Cloud / multiple runners) or raise staging limits temporarily.
 *
 * k6 run loadtests/k6/scenarios/02-auth.js -e BASE_URL=... -e SCALE=500
 */
import { check, sleep } from "k6";
import { loginAs, pickUser } from "../lib/auth.js";
import { thinkTimeSeconds } from "../lib/env.js";
import { vuScenario } from "../config/stages.js";
import { withThresholds } from "../config/thresholds.js";

export const options = withThresholds(vuScenario("auth"));

export default function () {
  const user = pickUser(__VU);
  const session = loginAs(user);

  check(session.res, {
    "auth login ok or rate-limited": (r) => r.status === 200 || r.status === 429,
  });

  sleep(thinkTimeSeconds() + Math.random());
}
