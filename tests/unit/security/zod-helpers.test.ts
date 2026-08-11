import { describe, expect, it } from "vitest";
import { cn, formatPercent } from "@/lib/utils";
import { userFacingZodMessage } from "@/lib/security/zod-helpers";
import { z } from "zod";

describe("utils & zod helpers", () => {
  it("merges class names", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toContain("px-4");
  });

  it("formats percentages", () => {
    expect(formatPercent(12.345, 1)).toBe("12.3%");
  });

  it("returns user-friendly Zod messages", () => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse({ email: "nope" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(userFacingZodMessage(parsed.error, "Invalid input").length).toBeGreaterThan(0);
    }
  });
});
