import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const getProfileByUserId = vi.fn();
const requireWritableSubscription = vi.fn();
const getClassAssignmentForLecturer = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
  createServiceClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/auth/get-profile", () => ({
  getProfileByUserId: (...args: unknown[]) => getProfileByUserId(...args),
}));

vi.mock("@/lib/subscription/guards", () => ({
  requireWritableSubscription: (...args: unknown[]) => requireWritableSubscription(...args),
  subscriptionGuardResponse: () => ({
    error: "Subscription required",
    code: "SUBSCRIPTION_REQUIRED",
    status: 403,
  }),
}));

vi.mock("@/lib/lecturer/class-assignments", () => ({
  getClassAssignmentForLecturer: (...args: unknown[]) => getClassAssignmentForLecturer(...args),
  ensureAssignmentSubmissionForGrading: vi.fn(),
}));

vi.mock("@/lib/student/notifications", () => ({
  getClassSessionLabel: vi.fn(async () => "CS101"),
  notifyStudentsByEnrollmentIds: vi.fn(),
}));

describe("API: PUT assignment grades (grade publishing)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "lecturer-1" } } });
    getProfileByUserId.mockResolvedValue({ role: "lecturer" });
    requireWritableSubscription.mockResolvedValue({ ok: true });
    getClassAssignmentForLecturer.mockResolvedValue({
      id: "assignment-1",
      class_session_id: "class-1",
      max_score: 20,
    });
  });

  it("rejects unauthenticated grade publishes", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { PUT } = await import(
      "@/app/api/lecturer/sessions/[id]/assignments/[assignmentId]/grades/route"
    );
    const response = await PUT(
      new Request("http://localhost/api/grades", {
        method: "PUT",
        body: JSON.stringify({ scores: [] }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }) }
    );
    expect(response.status).toBe(401);
  });

  it("rejects empty grade change sets", async () => {
    const { PUT } = await import(
      "@/app/api/lecturer/sessions/[id]/assignments/[assignmentId]/grades/route"
    );
    const response = await PUT(
      new Request("http://localhost/api/grades", {
        method: "PUT",
        body: JSON.stringify({ scores: [], deleteEnrollmentIds: [] }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }) }
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/no grade changes/i);
  });

  it("rejects scores above the assignment maximum", async () => {
    const { PUT } = await import(
      "@/app/api/lecturer/sessions/[id]/assignments/[assignmentId]/grades/route"
    );
    const response = await PUT(
      new Request("http://localhost/api/grades", {
        method: "PUT",
        body: JSON.stringify({
          scores: [
            {
              enrollmentId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
              score: 99,
            },
          ],
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }) }
    );
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/cannot exceed maximum/i);
  });
});
