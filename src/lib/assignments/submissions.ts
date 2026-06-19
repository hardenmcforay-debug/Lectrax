import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ASSIGNMENT_SUBMISSIONS_BUCKET,
  buildSubmissionStoragePath,
} from "@/lib/assignments/storage";
import { validateSubmissionFile } from "@/lib/assignments/submission-validation";
import { sanitizeFilename } from "@/lib/security/sanitize";
import { scanAssignmentSubmissionPdf } from "@/lib/security/submission-file-scan";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
export { validateSubmissionFile } from "@/lib/assignments/submission-validation";
import type { Assignment, ClassSession } from "@/types/database";
import { SUBMISSION_CLOSED_ERROR } from "@/lib/assignments/deadline-messages";
import { isAssignmentBeforeDeadline } from "@/lib/assignments/deadline-server";

/** Lock submissions whose assignment deadline has passed (DB RPC). */
export async function lockExpiredAssignmentSubmissions(
  supabase: SupabaseClient,
  assignmentId?: string
): Promise<void> {
  await supabase.rpc("lock_expired_assignment_submissions", {
    p_assignment_id: assignmentId ?? null,
  });
}

export async function getSignedSubmissionUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ASSIGNMENT_SUBMISSIONS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function deleteSubmissionFile(
  supabase: SupabaseClient,
  storagePath: string | null
): Promise<void> {
  if (!storagePath) return;

  await supabase.storage.from(ASSIGNMENT_SUBMISSIONS_BUCKET).remove([storagePath]);
}

export async function uploadAssignmentSubmission(params: {
  supabase: SupabaseClient;
  userId: string;
  assignment: Pick<
    Assignment,
    "id" | "lecturer_id" | "class_session_id" | "deadline" | "semester" | "academic_year"
  >;
  session: Pick<ClassSession, "course_code">;
  enrollmentId: string;
  file: File;
  hasExistingSubmission?: boolean;
}): Promise<{ error: string | null; scanReason?: string }> {
  const validationError = validateSubmissionFile(params.file);
  if (validationError) return { error: validationError };

  if (params.hasExistingSubmission) {
    return {
      error: "You have already submitted this assignment. You cannot upload again.",
    };
  }

  const deadlineError = SUBMISSION_CLOSED_ERROR;

  const beforeUpload = await isAssignmentBeforeDeadline(
    null,
    params.assignment.id,
    params.assignment.deadline
  );
  if (!beforeUpload) {
    return { error: deadlineError };
  }

  const storagePath = buildSubmissionStoragePath({
    academicYear: params.assignment.academic_year,
    semester: params.assignment.semester,
    courseCode: params.session.course_code,
    assignmentId: params.assignment.id,
    studentId: params.userId,
  });

  const fileBytes = new Uint8Array(await params.file.arrayBuffer());
  const scan = await scanAssignmentSubmissionPdf(fileBytes);
  if (!scan.ok) {
    console.warn("[submission-scan] rejected", { reason: scan.reason });
    return { error: scan.error, scanReason: scan.reason };
  }

  const { error: uploadError } = await params.supabase.storage
    .from(ASSIGNMENT_SUBMISSIONS_BUCKET)
    .upload(storagePath, fileBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    const message = uploadError.message ?? "Could not upload file to storage.";
    if (message.toLowerCase().includes("deadline") || message.toLowerCase().includes("policy")) {
      return { error: deadlineError };
    }
    return { error: sanitizeErrorMessage(message) };
  }

  const beforeInsert = await isAssignmentBeforeDeadline(
    null,
    params.assignment.id,
    params.assignment.deadline
  );
  if (!beforeInsert) {
    await deleteSubmissionFile(params.supabase, storagePath);
    return { error: deadlineError };
  }

  const { error: insertError } = await params.supabase.from("assignment_submissions").insert({
    assignment_id: params.assignment.id,
    enrollment_id: params.enrollmentId,
    student_id: params.userId,
    lecturer_id: params.assignment.lecturer_id,
    class_session_id: params.assignment.class_session_id,
    file_name: sanitizeFilename(params.file.name),
    file_size: params.file.size,
    storage_path: storagePath,
    submission_status: "submitted",
    submitted_at: new Date().toISOString(),
  });

  if (insertError) {
    await deleteSubmissionFile(params.supabase, storagePath);

    const message = insertError.message ?? "Could not save submission metadata.";
    if (message.toLowerCase().includes("deadline") || insertError.code === "23514") {
      return { error: deadlineError };
    }

    return { error: sanitizeErrorMessage(message) };
  }

  return { error: null };
}
