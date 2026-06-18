import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { adminToggleLecturerSchema } from "@/lib/validations";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = adminToggleLecturerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { lecturerId, isActive } = parsed.data;

  const service = await createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", lecturerId)
    .eq("role", "lecturer");

  if (error) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(error.message) },
      { status: 400 }
    );
  }

  await service.from("audit_logs").insert({
    actor_id: auth.userId,
    action: isActive ? "lecturer_activated" : "lecturer_deactivated",
    entity_type: "profile",
    entity_id: lecturerId,
    metadata: { is_active: isActive },
  });

  return NextResponse.json({ success: true });
}
