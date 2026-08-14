import { createHmac, createSign, generateKeyPairSync } from "node:crypto";
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
    expect(DEFAULT_SLE_CHARGE_AMOUNTS.monthly).toBe(240);
    expect(toMonimeMinorUnits(240)).toBe(24_000);
    expect(formatChargeAmount(240, "SLE")).toContain("Le");
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

  it("accepts timestamped Monime HMAC headers, including stale retries", () => {
    const payload = JSON.stringify({ event: { name: "payment.completed" } });
    const secret = process.env.MONIME_WEBHOOK_SECRET!;
    const timestamp = "1700000000";
    const v1 = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
    const v1Base64 = createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("base64");

    expect(verifyMonimeWebhookSignature(payload, `t=${timestamp},v1=${v1}`)).toBe(true);
    expect(verifyMonimeWebhookSignature(payload, `t=${timestamp},v1=${v1Base64}`)).toBe(true);
  });

  it("verifies ES256 Monime signatures from a PEM public key", () => {
    const payload = JSON.stringify({ event: { name: "payment.completed" } });
    const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
    const timestamp = "1700000000";
    const signature = createSign("SHA256")
      .update(`${timestamp}.${payload}`)
      .sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
    const previous = process.env.MONIME_WEBHOOK_SECRET;
    process.env.MONIME_WEBHOOK_SECRET = pem;
    try {
      expect(
        verifyMonimeWebhookSignature(payload, `t=${timestamp},v1=${signature.toString("base64")}`)
      ).toBe(true);
    } finally {
      process.env.MONIME_WEBHOOK_SECRET = previous;
    }
  });

  it("reads Monime signature headers", () => {
    const request = new Request("https://lectrax.app/api/webhooks/monime", {
      headers: { "monime-signature": "abc123" },
    });
    expect(getMonimeWebhookSignature(request)).toBe("abc123");
  });
});
