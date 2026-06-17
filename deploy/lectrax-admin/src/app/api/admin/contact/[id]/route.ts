import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { CONTACT_INQUIRY_STATUSES } from "@/lib/contact/constants";

const updateSchema = z.object({
  status: z.enum(CONTACT_INQUIRY_STATUSES),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "platform_admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, user };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("contact_inquiries")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update inquiry" }, { status: 500 });
  }

  await auth.supabase.from("audit_logs").insert({
    actor_id: auth.user.id,
    action: "contact_inquiry_status_updated",
    entity_type: "contact_inquiry",
    entity_id: id,
    metadata: { status: parsed.data.status },
  });

  return NextResponse.json({ success: true, inquiry: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;
  const service = await createServiceClient();

  const { data: inquiry } = await service
    .from("contact_inquiries")
    .select("id, full_name, email, subject")
    .eq("id", id)
    .maybeSingle();

  if (!inquiry) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  }

  const { error: notificationError } = await service
    .from("platform_admin_notifications")
    .delete()
    .eq("type", "contact_inquiry")
    .eq("reference_id", id);

  if (notificationError) {
    console.error("Contact notification delete failed:", notificationError);
  }

  const { error } = await service.from("contact_inquiries").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not delete inquiry" }, { status: 500 });
  }

  await service.from("audit_logs").insert({
    actor_id: auth.user.id,
    action: "contact_inquiry_deleted",
    entity_type: "contact_inquiry",
    entity_id: id,
    metadata: {
      full_name: inquiry.full_name,
      email: inquiry.email,
      subject: inquiry.subject,
    },
  });

  return NextResponse.json({ success: true });
}
