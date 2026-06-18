import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { getProfileByUserId } from "@/lib/auth/get-profile";

import {

  deleteClassAssignment,

  getClassAssignmentForLecturer,

} from "@/lib/lecturer/class-assignments";

import { sanitizeErrorMessage } from "@/lib/errors/classify";

export async function DELETE(
  _request: Request,

  { params }: { params: Promise<{ id: string; assignmentId: string }> }

) {

  const { id: classSessionId, assignmentId } = await params;

  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) {

    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  }



  const profile = await getProfileByUserId(user.id);

  if (profile?.role !== "lecturer") {

    return NextResponse.json({ error: "Only lecturers can delete assignments." }, { status: 403 });

  }



  const assignment = await getClassAssignmentForLecturer(assignmentId, user.id);

  if (!assignment || assignment.class_session_id !== classSessionId) {

    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  }



  try {

    const result = await deleteClassAssignment(assignmentId, user.id);

    if (!result) {

      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

    }



    return NextResponse.json({

      message: "Assignment deleted successfully.",

      ...result,

    });

  } catch (err) {

    const message = err instanceof Error ? err.message : "Could not delete assignment.";

    return NextResponse.json({ error: sanitizeErrorMessage(message) }, { status: 500 });

  }

}

