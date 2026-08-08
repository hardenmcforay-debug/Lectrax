import { ASSIGNMENT_SUBMISSIONS_BUCKET } from "@/lib/assignments/storage";
import { createServiceClient } from "@/lib/supabase/server";
import { getClassSessionForLecturer } from "@/lib/lecturer/class-sessions";

export interface DeleteClassSessionResult {
  deletedSessionId: string;
  deletedSubmissionFiles: number;
}

/** Permanently delete a class session and all related data (DB cascade + submission files). */
export async function deleteClassSession(
  sessionId: string,
  lecturerId: string
): Promise<DeleteClassSessionResult | null> {
  const supabase = await createServiceClient();
  const session = await getClassSessionForLecturer(sessionId, lecturerId);
  if (!session) return null;

  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("storage_path")
    .eq("class_session_id", sessionId);

  const storagePaths = (submissions ?? [])
    .map((s) => s.storage_path)
    .filter((path): path is string => Boolean(path));

  if (storagePaths.length > 0) {
    await supabase.storage.from(ASSIGNMENT_SUBMISSIONS_BUCKET).remove(storagePaths);
  }

  await supabase.from("audit_logs").delete().eq("class_session_id", sessionId);

  const { error: deleteError } = await supabase
    .from("class_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("lecturer_id", lecturerId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return {
    deletedSessionId: sessionId,
    deletedSubmissionFiles: storagePaths.length,
  };
}
