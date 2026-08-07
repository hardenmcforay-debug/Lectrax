import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  BILLING_PLANS,
  billingPlanToSubscriptionPlan,
  FREE_LIMITS,
} from "@/lib/subscription/constants";
import {
  DEFAULT_SLE_CHARGE_AMOUNTS,
  formatChargeAmount,
  toMonimeMinorUnits,
} from "@/lib/subscription/payment-currency";
import {
  getMonimeWebhookSignature,
  verifyMonimeWebhookSignature,
} from "@/lib/monime";

describe("payment & billing", () => {
  it("maps billing plans to subscription enums", () => {
    expect(billingPlanToSubscriptionPlan("monthly")).toBe("1_month");
    expect(billingPlanToSubscriptionPlan("semester")).toBe("3_months");
    expect(billingPlanToSubscriptionPlan("annual")).toBe("10_months");
  });

  it("exposes free-tier limits and SLE charge amounts", () => {
    expect(FREE_LIMITS.MAX_ACTIVE_CLASS_SESSIONS).toBe(2);
    expect(BILLING_PLANS.monthly.days).toBe(30);
    expect(DEFAULT_SLE_CHARGE_AMOUNTS.monthly).toBe(120);
    expect(toMonimeMinorUnits(120)).toBe(12_000);
    expect(formatChargeAmount(120, "SLE")).toContain("Le");
  });

  it("verifies Monime HMAC webhook signatures", () => {
    const payload = JSON.stringify({
      type: "payment.completed",
      data: { status: "completed" },
    });
    const secret = process.env.MONIME_WEBHOOK_SECRET!;
    const signature = createHmac("sha256", secret).update(payload).digest("hex");

    expect(verifyMonimeWebhookSignature(payload, signature)).toBe(true);
    expect(verifyMonimeWebhookSignature(payload, "bad-signature")).toBe(false);
    expect(verifyMonimeWebhookSignature(payload, null)).toBe(false);
  });

  it("reads Monime signature headers", () => {
    const request = new Request("https://lectrax.app/api/webhooks/monime", {
      headers: { "monime-signature": "abc123" },
    });
    expect(getMonimeWebhookSignature(request)).toBe("abc123");
  });
});
