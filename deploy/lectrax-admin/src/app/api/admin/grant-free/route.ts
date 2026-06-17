import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminActivatePremium } from "@/lib/subscription/lifecycle";
import type { BillingPlan } from "@/types/database";

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

  const { lecturerId, days = 365 } = await request.json();
  if (!lecturerId) {
    return NextResponse.json({ error: "lecturerId required" }, { status: 400 });
  }

  let billingPlan: BillingPlan = "annual";
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
    const message = error instanceof Error ? error.message : "Failed to activate subscription";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
