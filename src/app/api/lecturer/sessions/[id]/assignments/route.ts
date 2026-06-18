import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { assignmentSchema } from "@/lib/validations";
import { normalizeAssignmentDeadline } from "@/lib/assignments/deadline";
import {
  checkAssignmentCreationLimit,
  requireWritableSubscription,
  subscriptionGuardResponse,
} from "@/lib/subscription/guards";
import {
  getClassSessionLabel,
  notifyEnrolledStudentsInClass,
} from "@/lib/student/notifications";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

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
    return NextResponse.json({ error: "Only lecturers can create assignments" }, { status: 403 });
  }

  const writeGuard = await requireWritableSubscription(user.id);
  if (!writeGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(writeGuard);
    return NextResponse.json({ error, code }, { status });
  }

  const limitGuard = await checkAssignmentCreationLimit(user.id, classSessionId);
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

  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid assignment data" },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const { data: session } = await service
    .from("class_sessions")
    .select("id, semester, academic_year")
    .eq("id", classSessionId)
    .eq("lecturer_id", user.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "Class session not found" }, { status: 404 });
  }

  let deadlineIso: string;
  try {
    deadlineIso = normalizeAssignmentDeadline(parsed.data.deadline);
  } catch {
    return NextResponse.json({ error: "Invalid assignment deadline." }, { status: 400 });
  }

  const { data: assignment, error } = await service
    .from("assignments")
    .insert({
      class_session_id: classSessionId,
      lecturer_id: user.id,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      deadline: deadlineIso,
      max_score: parsed.data.maxScore,
      semester: session.semester,
      academic_year: session.academic_year,
    })
    .select("id")
    .single();

  if (error || !assignment) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(error?.message ?? "Could not create assignment") },
      { status: 500 }
    );
  }

  const classLabel = await getClassSessionLabel(service, classSessionId);
  void notifyEnrolledStudentsInClass(service, classSessionId, {
    type: "assignment",
    referenceId: assignment.id,
    title: "New assignment",
    message: `"${parsed.data.title.trim()}" was posted for ${classLabel}.`,
  });

  return NextResponse.json({ assignment });
}
