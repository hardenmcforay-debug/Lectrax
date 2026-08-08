import { createServiceClient } from "@/lib/supabase/server";
import { CLASS_SESSION_COLUMNS } from "@/lib/lecturer/class-session-columns";
import type { ClassSession } from "@/types/database";

/** Load a lecturer-owned class session (server-only, bypasses RLS). */
export async function getClassSessionForLecturer(
  sessionId: string,
  lecturerId: string
): Promise<ClassSession | null> {
  const service = await createServiceClient();
  const { data, error } = await service
    .from("class_sessions")
    .select(CLASS_SESSION_COLUMNS)
    .eq("id", sessionId)
    .eq("lecturer_id", lecturerId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ClassSession;
}

/** List all class sessions for a lecturer (server-only, bypasses RLS). */
export async function getLecturerClassSessions(lecturerId: string): Promise<ClassSession[]> {
  const service = await createServiceClient();
  const { data, error } = await service
    .from("class_sessions")
    .select(CLASS_SESSION_COLUMNS)
    .eq("lecturer_id", lecturerId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as ClassSession[];
}
