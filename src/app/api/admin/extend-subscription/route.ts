import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { adminExtendPremium } from "@/lib/subscription/lifecycle";
import { adminExtendSubscriptionSchema } from "@/lib/validations";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { logPlatformAdminAudit } from "@/lib/admin/platform-admin-audit";

/** Legacy route — extends premium via profile subscription_end_date */
export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = adminExtendSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { subscriptionId, lecturerId, days } = parsed.data;

  let targetLecturerId = lecturerId;
  if (!targetLecturerId && subscriptionId) {
    const { data: sub } = await auth.service
      .from("subscriptions")
      .select("lecturer_id")
      .eq("id", subscriptionId)
      .maybeSingle();
    targetLecturerId = sub?.lecturer_id;
  }

  if (!targetLecturerId) {
    return NextResponse.json(
      { error: "lecturerId or subscriptionId required" },
      { status: 400 }
    );
  }

  try {
    const subscription = await adminExtendPremium({
      lecturerId: targetLecturerId,
      days,
      actorId: auth.userId,
    });

    await logPlatformAdminAudit({
      actorId: auth.userId,
      action: "admin_extend_premium",
      entityType: "profile",
      entityId: targetLecturerId,
      metadata: { days, subscriptionId: subscriptionId ?? null },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to extend subscription";
    return NextResponse.json(
      { error: sanitizeErrorMessage(message) },
      { status: 409 }
    );
  }
}
