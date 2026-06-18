import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import { deleteClassSession } from "@/lib/lecturer/delete-class-session";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";
import { requireWritableSubscription, subscriptionGuardResponse } from "@/lib/subscription/guards";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

export async function DELETE(
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
    return NextResponse.json({ error: "Only lecturers can close class sessions." }, { status: 403 });
  }

  const writeGuard = await requireWritableSubscription(user.id);
  if (!writeGuard.ok) {
    const { error, code, status } = subscriptionGuardResponse(writeGuard);
    return NextResponse.json({ error, code }, { status });
  }

  const session = await getClassSessionForLecturer(classSessionId, user.id);
  if (!session) {
    return NextResponse.json({ error: "Class session not found." }, { status: 404 });
  }

  try {
    const result = await deleteClassSession(classSessionId, user.id);
    if (!result) {
      return NextResponse.json({ error: "Class session not found." }, { status: 404 });
    }

    revalidatePath("/lecturer/sessions");
    revalidatePath(`/lecturer/sessions/${classSessionId}`);

    return NextResponse.json({
      message: "Class session closed and all related data deleted.",
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not close class session.";
    return NextResponse.json({ error: sanitizeErrorMessage(message) }, { status: 500 });
  }
}
