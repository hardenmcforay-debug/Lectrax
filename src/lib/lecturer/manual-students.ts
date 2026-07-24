import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

export type ManualStudentListItem = {
  id: string;
  fullName: string;
  collegeId: string | null;
  enrollmentId: string | null;
  createdAt: string;
};

export async function getManualStudentsForSession(
  classSessionId: string,
  lecturerId: string
): Promise<ManualStudentListItem[]> {
  const service = await createServiceClient();

  const { data: session } = await service
    .from("class_sessions")
    .select("id")
    .eq("id", classSessionId)
    .eq("lecturer_id", lecturerId)
    .maybeSingle();

  if (!session) return [];

  const { data: manuals, error } = await service
    .from("manual_students")
    .select("id, full_name, college_id, created_at, enrollments(id)")
    .eq("class_session_id", classSessionId)
    .order("full_name", { ascending: true });

  if (error || !manuals) return [];

  return manuals.map((row) => {
    const enrollments = row.enrollments as unknown as { id: string }[] | { id: string } | null;
    const enrollmentId = Array.isArray(enrollments)
      ? enrollments[0]?.id ?? null
      : enrollments?.id ?? null;

    return {
      id: row.id,
      fullName: row.full_name,
      collegeId: row.college_id,
      enrollmentId,
      createdAt: row.created_at,
    };
  });
}
