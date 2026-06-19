import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { backfillMissingSubscriptionRecords } from "@/lib/subscription/lifecycle";
import { handleApiRouteError } from "@/lib/errors/api";

/** Repairs missing subscription history rows for the signed-in lecturer. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const backfilled = await backfillMissingSubscriptionRecords();
    return NextResponse.json({ ok: true, backfilled });
  } catch (error) {
    return handleApiRouteError("subscription.sync", error);
  }
}
