import { describe, expect, it } from "vitest";
import { testScoresBulkSchema } from "@/lib/validations";

describe("grade publishing schema", () => {
  const enrollmentId = "33333333-3333-4333-8333-333333333333";

  it("accepts bulk grade payloads", () => {
    const result = testScoresBulkSchema.safeParse({
      scores: [{ enrollmentId, score: 18 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid enrollment UUIDs", () => {
    const result = testScoresBulkSchema.safeParse({
      scores: [{ enrollmentId: "not-a-uuid", score: 10 }],
    });
    expect(result.success).toBe(false);
  });

  it("allows clearing grades via deleteEnrollmentIds", () => {
    const result = testScoresBulkSchema.safeParse({
      scores: [],
      deleteEnrollmentIds: [enrollmentId],
    });
    expect(result.success).toBe(true);
  });
});
