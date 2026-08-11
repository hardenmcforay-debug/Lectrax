import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requireStudentRole = vi.fn();
const parseJsonBody = vi.fn();
const verifyQRToken = vi.fn();
const hashQRToken = vi.fn(() => "token-hash-abc");
const closeAttendanceSessionIfAbandoned = vi.fn();
const logAudit = vi.fn();

const rpc = vi.fn();
const from = vi.fn();

function chain(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  for (const method of ["select", "eq", "is", "gt", "update", "insert"]) {
    builder[method] = vi.fn(self);
  }
  builder.single = vi.fn(async () => result);
  builder.maybeSingle = vi.fn(async () => result);
  return builder;
}

vi.mock("@/lib/auth/require-api-role", () => ({
  requireStudentRole: (...args: unknown[]) =>
    (requireStudentRole as (...a: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/security/enforce-rate-limit", () => ({
  rejectIfUserRateLimited: vi.fn(async () => null),
  rejectIfDeviceRateLimited: vi.fn(async () => null),
}));

vi.mock("@/lib/security/parse-request", () => ({
  parseJsonBody: (...args: unknown[]) =>
    (parseJsonBody as (...a: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/qr-token", () => ({
  verifyQRToken: (...args: unknown[]) =>
    (verifyQRToken as (...a: unknown[]) => unknown)(...args),
  hashQRToken: (...args: unknown[]) =>
    (hashQRToken as (...a: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: (...args: unknown[]) =>
    (logAudit as (...a: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/attendance/close-session", () => ({
  closeAttendanceSessionIfAbandoned: (...args: unknown[]) =>
    (closeAttendanceSessionIfAbandoned as (...a: unknown[]) => unknown)(...args),
}));

const validIdentity = {
  token: "payload.sig",
  deviceFingerprint: "dev_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  browserFingerprint: "br_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  deviceIdentifier: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
};

describe("API: POST /api/attendance/scan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireStudentRole.mockResolvedValue({
      error: null,
      user: { id: "student-1" },
      userId: "student-1",
      supabase: { from, rpc },
      service: {},
    });
    closeAttendanceSessionIfAbandoned.mockResolvedValue(false);
    parseJsonBody.mockResolvedValue({ ok: true, body: validIdentity });
  });

  it("requires an authenticated student", async () => {
    requireStudentRole.mockResolvedValue({
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const { POST } = await import("@/app/api/attendance/scan/route");
    const response = await POST(
      new Request("http://localhost/api/attendance/scan", {
        method: "POST",
        body: JSON.stringify({ token: "a.b" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(response.status).toBe(403);
  });

  it("rejects invalid scan payloads before token verification", async () => {
    parseJsonBody.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Invalid scan payload" }, { status: 400 }),
    });

    const { POST } = await import("@/app/api/attendance/scan/route");
    const response = await POST(
      new Request("http://localhost/api/attendance/scan", {
        method: "POST",
        body: JSON.stringify({ token: "" }),
        headers: { "content-type": "application/json" },
      })
    );
    expect(response.status).toBe(400);
  });

  it("rejects class-session binding mismatches", async () => {
    verifyQRToken.mockReturnValue({
      attendanceSessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      classSessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      expiresAt: Date.now() + 5_000,
      nonce: "abc12345",
    });

    from.mockImplementation((table: string) => {
      if (table === "attendance_sessions") {
        return chain({
          data: {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            class_session_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            is_active: true,
            ended_at: null,
            session_expires_at: new Date(Date.now() + 60_000).toISOString(),
            qr_token_hash: "token-hash-abc",
            qr_expires_at: new Date(Date.now() + 5_000).toISOString(),
          },
        });
      }
      return chain({ data: null });
    });

    const { POST } = await import("@/app/api/attendance/scan/route");
    const response = await POST(
      new Request("http://localhost/api/attendance/scan", {
        method: "POST",
        body: JSON.stringify(validIdentity),
        headers: { "content-type": "application/json" },
      })
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/binding/i);
    expect(logAudit).toHaveBeenCalled();
  });
});
