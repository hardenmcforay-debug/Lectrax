import { NextResponse } from "next/server";
import { requireLecturerRole } from "@/lib/auth/require-api-role";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import { parseRouteUuid } from "@/lib/security/parse-request";
import { withApiObservability } from "@/lib/observability/with-api-observability";
import { createServiceClient } from "@/lib/supabase/server";

async function deleteHandler(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId: rawPaymentId } = await params;
  const paymentIdParsed = parseRouteUuid(rawPaymentId, "payment ID");
  if (!paymentIdParsed.ok) return paymentIdParsed.response;
  const paymentId = paymentIdParsed.id;

  const auth = await requireLecturerRole();
  if (auth.error) return auth.error;

  // Payments DELETE has no lecturer RLS policy — service required.
  const service = await createServiceClient();

  const { data: payment } = await service
    .from("payments")
    .select("id, lecturer_id, status")
    .eq("id", paymentId)
    .eq("lecturer_id", auth.userId)
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
    return NextResponse.json({ error: sanitizeErrorMessage(error.message) }, { status: 500 });
  }

  return NextResponse.json({ message: "Payment record deleted." });
}

export const DELETE = withApiObservability("payments.by-id.delete", deleteHandler);
