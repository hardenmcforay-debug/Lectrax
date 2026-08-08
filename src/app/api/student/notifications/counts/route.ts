import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import {
  aggregateNotificationCounts,
  EMPTY_STUDENT_NOTIFICATION_COUNTS,
  type StudentNotificationType,
} from "@/lib/student/notifications";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

export async function GET() {
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

  const { data, error } = await supabase
    .from("student_notifications")
    .select("type")
    .eq("student_id", user.id)
    .eq("is_read", false);

  if (error) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(error.message ?? "Could not load notifications") },
      { status: 500 }
    );
  }

  return NextResponse.json({
    counts: data ? aggregateNotificationCounts(data as { type: StudentNotificationType }[]) : EMPTY_STUDENT_NOTIFICATION_COUNTS,
  });
}
