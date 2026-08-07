import { describe, expect, it } from "vitest";
import {
  buildPhoneAuthEmail,
  isEmailIdentifier,
  isValidPhoneInput,
  normalizePhoneNumber,
} from "@/lib/auth/phone-number";

describe("phone-number", () => {
  it("detects email identifiers", () => {
    expect(isEmailIdentifier("lecturer@lectrax.app")).toBe(true);
    expect(isEmailIdentifier("076123456")).toBe(false);
  });

  it("accepts Sierra Leone local and E.164 phone inputs", () => {
    expect(isValidPhoneInput("076123456")).toBe(true);
    expect(isValidPhoneInput("+23276123456")).toBe(true);
    expect(isValidPhoneInput("not-a-phone")).toBe(false);
  });

  it("normalizes local numbers to +232…", () => {
    expect(normalizePhoneNumber("076123456")).toBe("+23276123456");
    expect(normalizePhoneNumber("+23276123456")).toBe("+23276123456");
  });

  it("builds synthetic phone auth emails", () => {
    expect(buildPhoneAuthEmail("+23276123456")).toBe(
      "phone+23276123456@auth.lectrax.app"
    );
  });
});
