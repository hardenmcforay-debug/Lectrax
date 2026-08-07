import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const getUser = vi.fn();
const requireSelfSubscribeAllowed = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
  createServiceClient: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { role: "lecturer", full_name: "Dr. Test" } }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: {
              id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
              amount: 120,
            },
            error: null,
          }),
        }),
      }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
  })),
}));

vi.mock("@/lib/monime", () => ({
  createMonimeCheckout: vi.fn(async () => ({
    checkoutUrl: "https://checkout.monime.io/session/test",
    sessionId: "sess_test",
  })),
}));

vi.mock("@/lib/subscription/payment-currency-server", () => ({
  getBillingChargeAmount: () => 120,
  getMonimeCurrency: () => "SLE",
}));

vi.mock("@/lib/subscription/guards", () => ({
  requireSelfSubscribeAllowed: (...args: unknown[]) => requireSelfSubscribeAllowed(...args),
  subscriptionGuardResponse: () => ({
    error: "blocked",
    code: "SUBSCRIPTION_BLOCKED",
    status: 403,
  }),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getAppUrl: () => "http://localhost:3000",
}));

vi.mock("@/lib/errors/api", () => ({
  apiUnauthorizedResponse: () =>
    NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  apiDatabaseErrorResponse: () =>
    NextResponse.json({ error: "Database error" }, { status: 500 }),
  apiPaymentUnavailableResponse: () =>
    NextResponse.json({ error: "Payment unavailable" }, { status: 503 }),
  handleApiRouteError: () =>
    NextResponse.json({ error: "Unexpected error" }, { status: 500 }),
}));

describe("API: POST /api/payments/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "lecturer-1" } } });
    requireSelfSubscribeAllowed.mockResolvedValue({ ok: true });
  });

  it("requires authentication", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { POST } = await import("@/app/api/payments/checkout/route");
    const response = await POST(
      new Request("http://localhost/api/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: "monthly", paymentMethod: "orange_money" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(response.status).toBe(401);
  });

  it("rejects invalid checkout bodies", async () => {
    const { POST } = await import("@/app/api/payments/checkout/route");
    const response = await POST(
      new Request("http://localhost/api/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: "lifetime" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(response.status).toBe(400);
  });
});
