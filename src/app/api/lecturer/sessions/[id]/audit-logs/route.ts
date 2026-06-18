import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import { requirePremiumFeature, subscriptionGuardResponse } from "@/lib/subscription/guards";
import { requireLecturerRole } from "@/lib/auth/require-api-role";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classSessionId } = await params;

  const auth = await requireLecturerRole();
  if (auth.error) return auth.error;

  const premiumGuard = await requirePremiumFeature(auth.userId, "audit_logs");
  if (!premiumGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(premiumGuard);
    return NextResponse.json({ error, code }, { status });
  }

  const session = await getClassSessionForLecturer(classSessionId, auth.userId);
  if (!session) {
    return NextResponse.json({ error: "Class session not found." }, { status: 404 });
  }

  const service = await createServiceClient();
  const { error: deleteError } = await service
    .from("audit_logs")
    .delete()
    .eq("class_session_id", classSessionId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message ?? "Could not delete activity logs." },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "All activity logs deleted." });
}
