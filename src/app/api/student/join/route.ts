import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { z } from "zod";

const joinSchema = z.object({
  sessionCode: z.string().min(4).max(10),
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
    return NextResponse.json({ error: "Only students can join classes" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid session code" }, { status: 400 });
  }

  const sessionCode = parsed.data.sessionCode.toUpperCase().trim();
  const service = await createServiceClient();

  const { data: session, error: sessionError } = await service
    .from("class_sessions")
    .select("id, title, course_code, session_code, is_active")
    .eq("session_code", sessionCode)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json(
      { error: "Session not found. Check the code and try again." },
      { status: 404 }
    );
  }

  if (!session.is_active) {
    return NextResponse.json(
      { error: "This class session is no longer active." },
      { status: 400 }
    );
  }

  const { error: enrollError } = await service.from("enrollments").insert({
    class_session_id: session.id,
    student_id: user.id,
    college_id: profile.college_id ?? null,
    is_manual: false,
  });

  if (enrollError) {
    if (enrollError.code === "23505") {
      return NextResponse.json({ error: "You are already enrolled in this class." }, { status: 409 });
    }
    return NextResponse.json({ error: enrollError.message }, { status: 500 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      courseCode: session.course_code,
      title: session.title,
      sessionCode: session.session_code,
    },
  });
}
