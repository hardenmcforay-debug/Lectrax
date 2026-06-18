import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminActivatePremium } from "@/lib/subscription/lifecycle";
import { adminGrantFreeSchema } from "@/lib/validations";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

/** Legacy route — delegates to profile-based premium activation */
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
      actorId: user.id,
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
