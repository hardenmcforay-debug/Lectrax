import { describe, expect, it } from "vitest";
import { isPastDeadline } from "@/lib/assignments/deadline";
import {
  assignmentSchema,
  partnershipCheckoutSchema,
  testScoresBulkSchema,
} from "@/lib/validations";
import { billingPlanToSubscriptionPlan } from "@/lib/subscription/constants";
import { toMonimeMinorUnits, DEFAULT_SLE_CHARGE_AMOUNTS } from "@/lib/subscription/payment-currency";

describe("integration: assignment submission → grade publishing", () => {
  it("validates assignment creation then grade publish payloads", () => {
    const assignment = assignmentSchema.safeParse({
      title: "Lab Report",
      description: "Upload your PDF",
      maxScore: 25,
      deadline: "2026-12-01T23:59:00.000Z",
    });
    expect(assignment.success).toBe(true);

    expect(isPastDeadline("2020-01-01T00:00:00.000Z")).toBe(true);

    const grades = testScoresBulkSchema.safeParse({
      scores: [
        {
          enrollmentId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          score: 22,
        },
      ],
    });
    expect(grades.success).toBe(true);
    if (grades.success && assignment.success) {
      expect(grades.data.scores[0].score).toBeLessThanOrEqual(assignment.data.maxScore);
    }
  });
});

describe("integration: payment checkout contract", () => {
  it("maps plan selection to Monime charge units", () => {
    const plan = "monthly" as const;
    expect(billingPlanToSubscriptionPlan(plan)).toBe("1_month");
    expect(toMonimeMinorUnits(DEFAULT_SLE_CHARGE_AMOUNTS[plan])).toBe(24_000);
  });

  it("validates partnership checkout payloads used by payment UI", () => {
    const result = partnershipCheckoutSchema.safeParse({
      packageId: "small",
      universityName: "Fourah Bay College",
      departmentName: "Computer Science",
      contactPerson: "Dr. Kamara",
      email: "partnerships@university.edu.sl",
      phoneNumber: "+23276123456",
      country: "Sierra Leone",
      paymentMethod: "orange_money",
    });
    expect(result.success).toBe(true);
  });
});
