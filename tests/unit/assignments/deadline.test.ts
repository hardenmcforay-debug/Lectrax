import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatAssignmentDeadline,
  isPastDeadline,
  localDateTimeInputToIso,
  normalizeAssignmentDeadline,
} from "@/lib/assignments/deadline";
import { assignmentSchema } from "@/lib/validations";

describe("assignment deadlines & submission schema", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects past deadlines", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-04T12:00:00.000Z"));

    expect(isPastDeadline("2026-08-04T11:59:59.000Z")).toBe(true);
    expect(isPastDeadline("2026-08-04T12:00:01.000Z")).toBe(false);
    expect(isPastDeadline("not-a-date")).toBe(true);
  });

  it("normalizes deadlines to UTC ISO", () => {
    const iso = normalizeAssignmentDeadline("2026-08-04T15:30:00.000Z");
    expect(iso).toBe("2026-08-04T15:30:00.000Z");
    expect(() => normalizeAssignmentDeadline("bad")).toThrow(/Invalid assignment deadline/);
  });

  it("converts datetime-local style values", () => {
    const iso = localDateTimeInputToIso("2026-08-04T10:00");
    expect(Number.isNaN(Date.parse(iso))).toBe(false);
  });

  it("formats deadlines for display", () => {
    const formatted = formatAssignmentDeadline("2026-08-04T15:30:00.000Z");
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("validates assignment create payloads", () => {
    expect(
      assignmentSchema.safeParse({
        title: "Essay 1",
        description: "Submit PDF",
        maxScore: 20,
        deadline: "2026-08-10T23:59",
      }).success
    ).toBe(true);

    expect(
      assignmentSchema.safeParse({
        title: "E",
        maxScore: 0,
        deadline: "",
      }).success
    ).toBe(false);
  });
});
