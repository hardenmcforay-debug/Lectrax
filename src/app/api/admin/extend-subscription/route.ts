import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminExtendPremium } from "@/lib/subscription/lifecycle";

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

  const { subscriptionId, lecturerId, days = 30 } = await request.json();

  let targetLecturerId = lecturerId as string | undefined;
  if (!targetLecturerId && subscriptionId) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("lecturer_id")
      .eq("id", subscriptionId)
      .maybeSingle();
    targetLecturerId = sub?.lecturer_id;
  }

  if (!targetLecturerId) {
    return NextResponse.json({ error: "lecturerId or subscriptionId required" }, { status: 400 });
  }

  const subscription = await adminExtendPremium({
    lecturerId: targetLecturerId,
    days: Number(days),
    actorId: user.id,
  });

  return NextResponse.json({ success: true, subscription });
}
