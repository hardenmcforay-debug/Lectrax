import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const service = await createServiceClient();
  const { data: payment } = await service
    .from("payments")
    .select("id, lecturer_id, status")
    .eq("id", paymentId)
    .eq("lecturer_id", user.id)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  if (payment.status === "completed") {
    return NextResponse.json(
      { error: "Completed payment records cannot be deleted." },
      { status: 403 }
    );
  }

  const { error } = await service.from("payments").delete().eq("id", paymentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Payment record deleted." });
}
