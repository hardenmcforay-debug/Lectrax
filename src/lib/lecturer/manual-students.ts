import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  PAGINATION,
  toRangeBounds,
  type OffsetPaginationInput,
} from "@/lib/pagination";

export type ManualStudentListItem = {
  id: string;
  fullName: string;
  collegeId: string | null;
  enrollmentId: string | null;
  createdAt: string;
};

export async function getManualStudentsForSession(
  classSessionId: string,
  lecturerId: string,
  pagination: OffsetPaginationInput = {
    page: PAGINATION.DEFAULT_PAGE,
    pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  }
): Promise<{ students: ManualStudentListItem[]; total: number }> {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("class_sessions")
    .select("id")
    .eq("id", classSessionId)
    .eq("lecturer_id", lecturerId)
    .maybeSingle();

  if (!session) return { students: [], total: 0 };

  const pageSize = Math.min(pagination.pageSize, PAGINATION.MAX_PAGE_SIZE);
  const { from, to } = toRangeBounds(pagination.page, pageSize);

  const { data: manuals, error, count } = await supabase
    .from("manual_students")
    .select("id, full_name, college_id, created_at, enrollments(id)", { count: "exact" })
    .eq("class_session_id", classSessionId)
    .order("full_name", { ascending: true })
    .range(from, to);

  if (error || !manuals) return { students: [], total: 0 };

  return {
    students: manuals.map((row) => {
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
    }),
    total: count ?? 0,
  };
}
