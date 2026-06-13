import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

  const { lecturerId, isActive } = await request.json();
  if (!lecturerId || typeof isActive !== "boolean") {
    return NextResponse.json({ error: "lecturerId and isActive required" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", lecturerId)
    .eq("role", "lecturer");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await service.from("audit_logs").insert({
    actor_id: user.id,
    action: isActive ? "lecturer_activated" : "lecturer_deactivated",
    entity_type: "profile",
    entity_id: lecturerId,
    metadata: { is_active: isActive },
  });

  return NextResponse.json({ success: true });
}
