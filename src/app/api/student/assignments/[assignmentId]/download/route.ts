import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { getSignedSubmissionUrl } from "@/lib/assignments/submissions";



export async function GET(

  _request: Request,

  { params }: { params: Promise<{ assignmentId: string }> }

) {

  const { assignmentId } = await params;



  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) {

    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  }



  const { data: submission, error } = await supabase

    .from("assignment_submissions")

    .select("storage_path, file_name")

    .eq("assignment_id", assignmentId)

    .eq("student_id", user.id)

    .maybeSingle();



  if (error || !submission?.storage_path) {

    return NextResponse.json({ error: "Submission not found." }, { status: 404 });

  }



  const signedUrl = await getSignedSubmissionUrl(supabase, submission.storage_path);

  if (!signedUrl) {

    return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });

  }



  return NextResponse.json({ url: signedUrl, fileName: submission.file_name });

}

