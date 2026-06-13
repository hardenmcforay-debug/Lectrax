import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import { manualStudentSchema } from "@/lib/validations";
import {
  checkFreePlanLimit,
  requireWritableSubscription,
  subscriptionGuardResponse,
} from "@/lib/subscription/guards";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classSessionId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const profile = await getProfileByUserId(user.id);
  if (profile?.role !== "lecturer") {
    return NextResponse.json({ error: "Only lecturers can add students" }, { status: 403 });
  }

  const writeGuard = await requireWritableSubscription(user.id);
  if (!writeGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(writeGuard);
    return NextResponse.json({ error, code }, { status });
  }

  const limitGuard = await checkFreePlanLimit(user.id, "add_student", { classSessionId });
  if (!limitGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(limitGuard);
    return NextResponse.json({ error, code }, { status });
  }

  const session = await getClassSessionForLecturer(classSessionId, user.id);
  if (!session) {
    return NextResponse.json({ error: "Class session not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = manualStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid student data" },
      { status: 400 }
    );
  }

  const fullName = parsed.data.fullName.trim();
  const collegeId = parsed.data.collegeId?.trim() || null;
  const service = await createServiceClient();

  const { data: manual, error: manualError } = await service
    .from("manual_students")
    .insert({
      class_session_id: classSessionId,
      full_name: fullName,
      college_id: collegeId,
    })
    .select("id, full_name, college_id")
    .single();

  if (manualError || !manual) {
    return NextResponse.json(
      { error: manualError?.message ?? "Could not create manual student" },
      { status: 500 }
    );
  }

  const { data: enrollment, error: enrollError } = await service
    .from("enrollments")
    .insert({
      class_session_id: classSessionId,
      manual_student_id: manual.id,
      college_id: collegeId,
      is_manual: true,
    })
    .select("id")
    .single();

  if (enrollError || !enrollment) {
    await service.from("manual_students").delete().eq("id", manual.id);
    return NextResponse.json(
      { error: enrollError?.message ?? "Could not enroll manual student" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    student: {
      id: manual.id,
      enrollmentId: enrollment.id,
      fullName: manual.full_name,
      collegeId: manual.college_id,
    },
  });
}
