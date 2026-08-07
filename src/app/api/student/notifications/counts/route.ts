import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import {
  EMPTY_STUDENT_NOTIFICATION_COUNTS,
  type StudentNotificationType,
} from "@/lib/student/notifications";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { withApiObservability } from "@/lib/observability/with-api-observability";

const NOTIFICATION_TYPES: StudentNotificationType[] = ["assignment", "grade", "attendance"];

async function getHandler() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "student") {
    return NextResponse.json({ error: "Only students can read notifications" }, { status: 403 });
  }

  const results = await Promise.all(
    NOTIFICATION_TYPES.map((type) =>
      supabase
        .from("student_notifications")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("is_read", false)
        .eq("type", type)
    )
  );

  const firstError = results.find((r) => r.error)?.error;
  if (firstError) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(firstError.message ?? "Could not load notifications") },
      { status: 500 }
    );
  }

  const counts = { ...EMPTY_STUDENT_NOTIFICATION_COUNTS };
  NOTIFICATION_TYPES.forEach((type, index) => {
    counts[type] = results[index].count ?? 0;
  });

  return NextResponse.json({ counts });
}

export const GET = withApiObservability("student.notifications.counts.get", getHandler);
