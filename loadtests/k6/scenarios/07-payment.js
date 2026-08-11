/**
 * Payment checkout + status poll (lecturer subscription).
 *
 * Uses real Monime unless PAYMENT_DRY_RUN=true (then only validates auth + 4xx/429 paths
 * with an invalid plan to avoid creating charges — still measures gateway).
 *
 * Prefer staging Monime credentials. Never run destructive payment storms on production.
 */
import { check, sleep } from "k6";
import { loginAs, pickLecturer } from "../lib/auth.js";
import { apiGet, apiPost } from "../lib/http.js";
import { metrics } from "../lib/metrics.js";
import { boolEnv, env, thinkTimeSeconds } from "../lib/env.js";
import { arrivalScenario } from "../config/stages.js";
import { withThresholds } from "../config/thresholds.js";

export const options = withThresholds(arrivalScenario("payment"));

export default function () {
  const lecturer = pickLecturer();
  const session = loginAs(lecturer);
  if (!session.ok) {
    sleep(thinkTimeSeconds());
    return;
  }

  const dryRun = boolEnv("PAYMENT_DRY_RUN", true);
  const body = dryRun
    ? { plan: "not-a-real-plan", paymentMethod: "orange_money" }
    : {
        plan: env("PAYMENT_PLAN", "monthly"),
        paymentMethod: env("PAYMENT_METHOD", "orange_money"),
      };

  const checkout = apiPost("/api/payments/checkout", body, {
    jar: session.jar,
    tags: { flow: "payment-checkout" },
    trend: metrics.paymentLatency,
    timeout: "60s",
  });

  check(checkout, {
    "checkout not 5xx": (r) => r.status < 500,
    "checkout expected": (r) => [200, 400, 402, 403, 409, 429].includes(r.status),
  });

  if (!dryRun && checkout.status === 200) {
    let paymentId = null;
    try {
      paymentId = checkout.json("paymentId") || checkout.json("id");
    } catch {
      paymentId = null;
    }
    if (paymentId) {
      const status = apiGet(`/api/payments/${paymentId}/status`, {
        jar: session.jar,
        tags: { flow: "payment-status" },
        trend: metrics.paymentLatency,
      });
      check(status, { "status poll": (r) => [200, 404, 429].includes(r.status) });
    }
  }

  sleep(thinkTimeSeconds() * 3);
}
