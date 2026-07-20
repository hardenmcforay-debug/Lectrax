import { NextResponse } from "next/server";
import { contactInquirySchema } from "@/lib/validations";
import { createServiceClient } from "@/lib/supabase/server";
import { logServerError } from "@/lib/errors/logger";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = contactInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const message = data.message.trim();
  const subject = message.length > 120 ? `${message.slice(0, 117)}...` : message;
  const service = await createServiceClient();

  const { data: inquiry, error } = await service
    .from("contact_inquiries")
    .insert({
      full_name: data.fullName,
      email: data.email,
      subject,
      message,
      status: "new",
    })
    .select("id, full_name, email, subject, message")
    .single();

  if (error || !inquiry) {
    logServerError("contact.inquiry.insert", error);
    return NextResponse.json(
      { error: "Could not send your message. Please try again." },
      { status: 500 }
    );
  }

  const { error: notificationError } = await service.from("platform_admin_notifications").insert({
    type: "contact_inquiry",
    reference_id: inquiry.id,
    title: "New contact message",
    message: `${inquiry.full_name} — ${inquiry.message}`,
  });

  if (notificationError) {
    logServerError("contact.inquiry.notification", notificationError);
  }

  await service.from("audit_logs").insert({
    actor_id: null,
    action: "contact_inquiry_submitted",
    entity_type: "contact_inquiry",
    entity_id: inquiry.id,
    metadata: {
      email: inquiry.email,
      message: inquiry.message,
    },
  });

  return NextResponse.json({ success: true });
}
