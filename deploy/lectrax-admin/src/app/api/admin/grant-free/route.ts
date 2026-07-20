import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { adminActivatePremium } from "@/lib/subscription/lifecycle";
import { adminGrantFreeSchema } from "@/lib/validations";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { logPlatformAdminAudit } from "@/lib/admin/platform-admin-audit";

/** Legacy route — delegates to profile-based premium activation */
export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = adminGrantFreeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { lecturerId, days } = parsed.data;

  let billingPlan: "monthly" | "semester" | "annual" = "annual";
  if (days <= 35) billingPlan = "monthly";
  else if (days <= 130) billingPlan = "semester";

  try {
    const subscription = await adminActivatePremium({
      lecturerId,
      billingPlan,
      actorId: auth.userId,
      durationDays: days,
    });

    await logPlatformAdminAudit({
      actorId: auth.userId,
      action: "admin_grant_premium",
      entityType: "profile",
      entityId: lecturerId,
      metadata: { days, billingPlan },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to activate subscription";
    return NextResponse.json(
      { error: sanitizeErrorMessage(message) },
      { status: 409 }
    );
  }
}
