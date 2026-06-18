import { NextResponse } from "next/server";
import { getSignedSubmissionUrl } from "@/lib/assignments/submissions";
import { requireStudentRole } from "@/lib/auth/require-api-role";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const { assignmentId } = await params;

  const auth = await requireStudentRole();
  if (auth.error) return auth.error;

  const { data: submission, error } = await auth.supabase
    .from("assignment_submissions")
    .select("storage_path, file_name")
    .eq("assignment_id", assignmentId)
    .eq("student_id", auth.userId)
    .maybeSingle();

  if (error || !submission?.storage_path) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }

  const signedUrl = await getSignedSubmissionUrl(auth.supabase, submission.storage_path);
  if (!signedUrl) {
    return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
  }

  return NextResponse.json({ url: signedUrl, fileName: submission.file_name });
}
