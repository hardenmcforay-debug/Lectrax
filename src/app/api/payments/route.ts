import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const service = await createServiceClient();
  const { data: deleted, error } = await service
    .from("payments")
    .delete()
    .eq("lecturer_id", user.id)
    .neq("status", "completed")
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Deletable payment records removed.",
    deletedCount: deleted?.length ?? 0,
  });
}
