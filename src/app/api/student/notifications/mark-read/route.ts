import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

const markReadSchema = z.object({
  type: z.enum(["assignment", "grade", "attendance"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "student") {
    return NextResponse.json({ error: "Only students can update notifications" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = markReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid notification type" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("student_notifications")
    .update({ is_read: true })
    .eq("student_id", user.id)
    .eq("type", parsed.data.type)
    .eq("is_read", false);

  if (error) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(error.message ?? "Could not mark notifications as read") },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
