import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import { getClassTestsForSession, getNextTestNumber } from "@/lib/lecturer/class-tests";
import { classTestSchema } from "@/lib/validations";
import {
  checkFreePlanLimit,
  requireWritableSubscription,
  subscriptionGuardResponse,
} from "@/lib/subscription/guards";

export async function GET(
  _request: Request,
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await getClassSessionForLecturer(classSessionId, user.id);
  if (!session) {
    return NextResponse.json({ error: "Class session not found" }, { status: 404 });
  }

  const tests = await getClassTestsForSession(
    classSessionId,
    session.semester,
    session.academic_year,
    user.id
  );
  const nextTestNumber = await getNextTestNumber(
    classSessionId,
    session.semester,
    session.academic_year
  );

  return NextResponse.json({
    tests,
    session: {
      id: session.id,
      courseCode: session.course_code,
      title: session.title,
      className: session.class_name,
      semester: session.semester,
      academicYear: session.academic_year,
    },
    nextTestNumber,
  });
}

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
    return NextResponse.json({ error: "Only lecturers can create tests" }, { status: 403 });
  }

  const writeGuard = await requireWritableSubscription(user.id);
  if (!writeGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(writeGuard);
    return NextResponse.json({ error, code }, { status });
  }

  const limitGuard = await checkFreePlanLimit(user.id, "create_test", { classSessionId });
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

  const parsed = classTestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid test data" },
      { status: 400 }
    );
  }

  const nextAvailable = await getNextTestNumber(
    classSessionId,
    session.semester,
    session.academic_year
  );

  if (nextAvailable === null) {
    return NextResponse.json(
      { error: "Test 1 and Test 2 already exist for this class." },
      { status: 409 }
    );
  }

  if (parsed.data.testNumber !== nextAvailable) {
    return NextResponse.json(
      {
        error:
          parsed.data.testNumber === 1
            ? "Create Test 1 first."
            : "Test 1 must exist before creating Test 2.",
      },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const { data: test, error } = await service
    .from("class_tests")
    .insert({
      class_session_id: classSessionId,
      lecturer_id: user.id,
      title: parsed.data.title.trim(),
      test_number: parsed.data.testNumber,
      max_score: parsed.data.maxScore,
      weight_percent: parsed.data.weightPercent ?? null,
      semester: session.semester,
      academic_year: session.academic_year,
    })
    .select("*")
    .single();

  if (error || !test) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create test" },
      { status: 500 }
    );
  }

  return NextResponse.json({ test }, { status: 201 });
}
