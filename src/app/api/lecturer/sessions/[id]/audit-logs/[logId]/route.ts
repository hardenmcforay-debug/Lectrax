import { NextResponse } from "next/server";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import { requirePremiumFeature, subscriptionGuardResponse } from "@/lib/subscription/guards";
import { requireLecturerRole } from "@/lib/auth/require-api-role";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { withApiObservability } from "@/lib/observability/with-api-observability";

async function deleteHandler(
  _request: Request,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  const { id: classSessionId, logId } = await params;

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

  const { data: log, error: fetchError } = await auth.supabase
    .from("audit_logs")
    .select("id, class_session_id")
    .eq("id", logId)
    .maybeSingle();

  if (fetchError || !log) {
    return NextResponse.json({ error: "Activity log not found." }, { status: 404 });
  }

  if (log.class_session_id !== classSessionId) {
    return NextResponse.json({ error: "Activity log does not belong to this session." }, { status: 403 });
  }

  const { error: deleteError } = await auth.supabase.from("audit_logs").delete().eq("id", logId);

  if (deleteError) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(deleteError.message ?? "Could not delete activity log.") },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "Activity log deleted." });
}

export const DELETE = withApiObservability("lecturer.sessions.audit-logs.by-id.delete", deleteHandler);
