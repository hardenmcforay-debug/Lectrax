import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { classSessionSchema } from "@/lib/validations";
import {
  checkFreePlanLimit,
  requireWritableSubscription,
  subscriptionGuardResponse,
} from "@/lib/subscription/guards";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can create class sessions" }, { status: 403 });
  }

  const writeGuard = await requireWritableSubscription(user.id);
  if (!writeGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(writeGuard);
    return NextResponse.json({ error, code }, { status });
  }

  const limitGuard = await checkFreePlanLimit(user.id, "create_session");
  if (!limitGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(limitGuard);
    return NextResponse.json({ error, code }, { status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = classSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid session data" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const service = await createServiceClient();

  const { data: session, error: sessionError } = await service
    .from("class_sessions")
    .insert({
      lecturer_id: user.id,
      class_name: data.className.trim(),
      title: data.title.trim(),
      course_code: data.courseCode.trim(),
      semester: data.semester,
      academic_year: data.academicYear.trim(),
    })
    .select("*")
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: sessionError?.message ?? "Could not create class session" },
      { status: 500 }
    );
  }

  return NextResponse.json({ session });
}
