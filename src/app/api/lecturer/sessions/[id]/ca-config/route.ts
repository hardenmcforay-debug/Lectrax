import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import { caConfigSchema } from "@/lib/validations";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

export async function PUT(
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
    return NextResponse.json({ error: "Only lecturers can update CA settings" }, { status: 403 });
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

  const parsed = caConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid CA configuration" },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const { error } = await service.from("ca_configurations").upsert(
    {
      class_session_id: classSessionId,
      semester: session.semester,
      academic_year: session.academic_year,
      attendance_weight: parsed.data.attendanceWeight,
      assignment_weight: parsed.data.assignmentWeight,
      test_weight: parsed.data.testWeight,
    },
    { onConflict: "class_session_id,semester,academic_year" }
  );

  if (error) {
    return NextResponse.json(
      { error: sanitizeErrorMessage(error.message ?? "Could not save CA configuration") },
      { status: 500 }
    );
  }

  revalidatePath(`/lecturer/sessions/${classSessionId}`);

  return NextResponse.json({ message: "CA configuration saved." });
}
