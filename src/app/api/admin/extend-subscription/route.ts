import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminExtendPremium } from "@/lib/subscription/lifecycle";
import { adminExtendSubscriptionSchema } from "@/lib/validations";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

/** Legacy route — extends premium via profile subscription_end_date */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "platform_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    const { data: sub } = await supabase
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
      actorId: user.id,
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
