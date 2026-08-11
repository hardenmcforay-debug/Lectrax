import { describe, expect, it, vi } from "vitest";
import {
  buildLiveReport,
  checkEnvironmentConfig,
  healthHttpStatus,
} from "@/lib/observability/health";
import { createRequestId, normalizeRequestId, resolveRequestId } from "@/lib/observability/request-id";
import {
  BUSINESS_EVENTS,
  TENANT_HEADER,
  classifyApiOutcome,
} from "@/lib/observability/constants";
import { OBSERVABILITY_ALERTS } from "@/lib/observability/alerts";
import { buildRequestContext, getDeviceInfo } from "@/lib/observability/context";
import {
  bindObservabilityUser,
  getObservabilityIdentity,
  peekUserIdFromCookieHeader,
  runWithObservabilityStore,
} from "@/lib/observability/request-store";
import { withApiObservability } from "@/lib/observability/with-api-observability";

describe("observability request IDs", () => {
  it("mints and normalizes request IDs", () => {
    const id = createRequestId();
    expect(normalizeRequestId(id)).toBe(id);
    expect(normalizeRequestId("bad id")).toBeNull();
  });

  it("prefers inbound x-request-id", () => {
    const existing = createRequestId();
    const request = new Request("http://localhost/api/health", {
      headers: { "x-request-id": existing },
    });
    expect(resolveRequestId(request)).toBe(existing);
  });
});

describe("observability health", () => {
  it("reports liveness without dependency failures", () => {
    const report = buildLiveReport();
    expect(report.probes.some((p) => p.name === "process")).toBe(true);
    expect(["pass", "warn"]).toContain(report.status);
    expect(healthHttpStatus("pass", "live")).toBe(200);
    expect(healthHttpStatus("fail", "live")).toBe(503);
  });

  it("validates environment probe shape", () => {
    const probe = checkEnvironmentConfig();
    expect(probe.name).toBe("environment");
    expect(["pass", "warn", "fail"]).toContain(probe.status);
  });
});

describe("observability catalog", () => {
  it("exposes business events and alert rules", () => {
    expect(BUSINESS_EVENTS.LOGIN_SUCCESS).toBe("auth.login.success");
    expect(BUSINESS_EVENTS.API_RATE_LIMIT_FAILURE).toBe("api.rate_limit_failure");
    expect(OBSERVABILITY_ALERTS.length).toBeGreaterThan(5);
    expect(OBSERVABILITY_ALERTS.every((a) => a.id && a.threshold)).toBe(true);
  });

  it("classifies user agents", () => {
    expect(getDeviceInfo("Mozilla/5.0 Chrome/120.0")).toBe("chrome");
    expect(getDeviceInfo(null)).toBeNull();
  });

  it("classifies API outcomes", () => {
    expect(classifyApiOutcome(200)).toBe("success");
    expect(classifyApiOutcome(400)).toBe("validation_failure");
    expect(classifyApiOutcome(401)).toBe("authorization_failure");
    expect(classifyApiOutcome(403)).toBe("authorization_failure");
    expect(classifyApiOutcome(429)).toBe("rate_limit_failure");
    expect(classifyApiOutcome(500)).toBe("server_error");
  });
});

describe("observability request context", () => {
  it("captures tenant, device, IP, and route fields", () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0 Chrome/120.0",
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        [TENANT_HEADER]: "campus-a",
        "x-request-id": createRequestId(),
      },
    });

    const ctx = buildRequestContext(request);
    expect(ctx.route).toBe("/api/auth/login");
    expect(ctx.method).toBe("POST");
    expect(ctx.tenant).toBe("campus-a");
    expect(ctx.ip).toBe("203.0.113.10");
    expect(ctx.device).toBe("chrome");
  });

  it("peeks user id from JWT-shaped auth cookie", () => {
    const payload = Buffer.from(JSON.stringify({ sub: "user-123" })).toString("base64url");
    const token = `hdr.${payload}.sig`;
    const cookie = `sb-xxx-auth-token=${encodeURIComponent(token)}`;
    expect(peekUserIdFromCookieHeader(cookie)).toBe("user-123");
  });

  it("binds user id inside the observability store", () => {
    runWithObservabilityStore({ userId: null, tenant: null }, () => {
      bindObservabilityUser("bound-user");
      expect(getObservabilityIdentity().userId).toBe("bound-user");
    });
  });
});

describe("withApiObservability", () => {
  it("adds request id, status, and duration on success", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const handler = withApiObservability("auth.login.post", async () =>
      Response.json({ ok: true }, { status: 200 })
    );

    // Force success sampling by stubbing Math.random
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const requestId = createRequestId();
    const response = await handler(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "x-request-id": requestId },
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe(requestId);
    expect(info).toHaveBeenCalled();
    const payload = JSON.parse(String(info.mock.calls[0]?.[0]));
    expect(payload.message).toBe("api.request");
    expect(payload.scope).toBe("auth.login.post");
    expect(payload.status).toBe(200);
    expect(payload.outcome).toBe("success");
    expect(typeof payload.durationMs).toBe("number");

    info.mockRestore();
    random.mockRestore();
  });

  it("classifies authorization failures without throwing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const handler = withApiObservability("auth.role.get", async () =>
      Response.json({ error: "Unauthorized" }, { status: 401 })
    );

    const response = await handler(new Request("http://localhost/api/auth/role"));
    expect(response.status).toBe(401);
    expect(warn).toHaveBeenCalled();
    const payload = JSON.parse(String(warn.mock.calls[0]?.[0]));
    expect(payload.outcome).toBe("authorization_failure");
    warn.mockRestore();
  });
});
