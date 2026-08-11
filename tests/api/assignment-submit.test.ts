import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requireStudentRole = vi.fn();

vi.mock("@/lib/auth/require-api-role", () => ({
  requireStudentRole: (...args: unknown[]) => requireStudentRole(...args),
}));

vi.mock("@/lib/security/parse-request", () => ({
  parseRouteUuid: (value: string) => {
    if (value === "not-a-uuid") {
      return {
        ok: false as const,
        response: NextResponse.json({ error: "Invalid assignment ID" }, { status: 400 }),
      };
    }
    return { ok: true as const, id: value };
  },
}));

vi.mock("@/lib/assignments/deadline-server", () => ({
  isAssignmentBeforeDeadline: vi.fn(async () => true),
}));

vi.mock("@/lib/assignments/submissions", () => ({
  lockExpiredAssignmentSubmissions: vi.fn(),
  uploadAssignmentSubmission: vi.fn(),
}));

vi.mock("@/lib/subscription/guards", () => ({
  requirePremiumFeature: vi.fn(async () => ({ ok: true })),
  subscriptionGuardResponse: () => ({
    error: "Premium required",
    code: "PREMIUM_REQUIRED",
    status: 403,
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

describe("API: POST /api/student/assignments/[assignmentId]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireStudentRole.mockResolvedValue({
      error: null,
      user: { id: "student-1" },
      userId: "student-1",
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                    lecturer_id: "lecturer-1",
                    class_session_id: "class-1",
                    deadline: "2099-01-01T00:00:00.000Z",
                    is_published: true,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      },
      service: {},
    });
  });

  it("rejects invalid assignment route IDs", async () => {
    const { POST } = await import(
      "@/app/api/student/assignments/[assignmentId]/submit/route"
    );
    const response = await POST(
      new Request("http://localhost/api/submit", { method: "POST" }),
      { params: Promise.resolve({ assignmentId: "not-a-uuid" }) }
    );
    expect(response.status).toBe(400);
  });

  it("requires a PDF file in multipart form data", async () => {
    const form = new FormData();
    form.set("note", "missing file");

    const { POST } = await import(
      "@/app/api/student/assignments/[assignmentId]/submit/route"
    );
    const response = await POST(
      new Request("http://localhost/api/submit", { method: "POST", body: form }),
      {
        params: Promise.resolve({
          assignmentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        }),
      }
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/pdf file is required/i);
  });
});
