import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizedRequiredPhoneField } from "@/lib/security/zod-helpers";
import { profileExistsForPhone } from "@/lib/auth/resolve-login-identifier";
import { rejectIfKeyRateLimited } from "@/lib/security/enforce-rate-limit";
import { logServerError } from "@/lib/errors/logger";
import { createHash } from "crypto";

const checkPhoneSchema = z.object({
  phoneNumber: normalizedRequiredPhoneField,
});

function buildCheckPhoneRateLimitKey(phone: string): string {
  const hash = createHash("sha256").update(phone).digest("hex");
  return `checkPhone:${hash.slice(0, 24)}`;
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = checkPhoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid phone number" },
        { status: 400 }
      );
    }

    const phoneNumber = parsed.data.phoneNumber;
    const rateLimited = rejectIfKeyRateLimited(
      buildCheckPhoneRateLimitKey(phoneNumber),
      "checkPhone",
      "auth.check-phone"
    );
    if (rateLimited) return rateLimited;

    const exists = await profileExistsForPhone(phoneNumber);
    if (exists) {
      return NextResponse.json(
        {
          error: "Phone Number Already Registered",
          message: "An account already exists with this phone number.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ available: true });
  } catch (error) {
    logServerError("auth.checkPhone.unhandled", error);
    return NextResponse.json({ error: "Could not verify phone number." }, { status: 500 });
  }
}
