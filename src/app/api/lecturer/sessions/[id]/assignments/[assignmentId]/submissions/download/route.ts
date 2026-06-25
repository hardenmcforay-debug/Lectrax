import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

import { getProfileByUserId } from "@/lib/auth/get-profile";

import { getClassAssignmentForLecturer } from "@/lib/lecturer/class-assignments";

import { ASSIGNMENT_SUBMISSIONS_BUCKET } from "@/lib/assignments/storage";
import { getSignedSubmissionUrl } from "@/lib/assignments/submissions";
import { sanitizeFilename } from "@/lib/security/sanitize";



export async function GET(

  request: Request,

  { params }: { params: Promise<{ id: string; assignmentId: string }> }

) {

  const { id: classSessionId, assignmentId } = await params;

  const requestUrl = new URL(request.url);
  const enrollmentIdParam = requestUrl.searchParams.get("enrollmentId");
  const inline = requestUrl.searchParams.get("inline") === "1";

  if (!enrollmentIdParam) {
    return NextResponse.json({ error: "enrollmentId is required." }, { status: 400 });
  }

  const enrollmentIdParsed = z.string().uuid().safeParse(enrollmentIdParam);
  if (!enrollmentIdParsed.success) {
    return NextResponse.json({ error: "Invalid enrollmentId." }, { status: 400 });
  }

  const enrollmentId = enrollmentIdParsed.data;



  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) {

    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  }



  const profile = await getProfileByUserId(user.id);

  if (profile?.role !== "lecturer") {

    return NextResponse.json({ error: "Only lecturers can download submissions." }, { status: 403 });

  }



  const assignment = await getClassAssignmentForLecturer(assignmentId, user.id);

  if (!assignment || assignment.class_session_id !== classSessionId) {

    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  }



  const { data: submission, error } = await supabase

    .from("assignment_submissions")

    .select("storage_path, file_name")

    .eq("assignment_id", assignmentId)

    .eq("enrollment_id", enrollmentId)

    .maybeSingle();



  if (error || !submission?.storage_path) {

    return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  }



  if (inline) {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(ASSIGNMENT_SUBMISSIONS_BUCKET)
      .download(submission.storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: "Could not open submission PDF." }, { status: 500 });
    }

    const fileName = sanitizeFilename(submission.file_name ?? "submission.pdf");

    return new NextResponse(fileData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const signedUrl = await getSignedSubmissionUrl(supabase, submission.storage_path);

  if (!signedUrl) {
    return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
  }

  return NextResponse.json({ url: signedUrl, fileName: submission.file_name });

}

