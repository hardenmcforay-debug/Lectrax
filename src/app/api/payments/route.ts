import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireLecturerRole } from "@/lib/auth/require-api-role";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

export async function DELETE() {
  const auth = await requireLecturerRole();
  if (auth.error) return auth.error;

  const service = await createServiceClient();
  const { data: deleted, error } = await service
    .from("payments")
    .delete()
    .eq("lecturer_id", auth.userId)
    .neq("status", "completed")
    .select("id");

  if (error) {
    return NextResponse.json({ error: sanitizeErrorMessage(error.message) }, { status: 500 });
  }

  return NextResponse.json({
    message: "Deletable payment records removed.",
    deletedCount: deleted?.length ?? 0,
  });
}
