import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/admin/require-platform-admin";
import { PARTNERSHIP_INQUIRY_STATUSES } from "@/lib/partnerships/constants";
import { logServerError } from "@/lib/errors/logger";

const updateSchema = z.object({
  status: z.enum(PARTNERSHIP_INQUIRY_STATUSES),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

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

  const { data, error } = await auth.service
    .from("university_partnership_inquiries")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select("id, status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update inquiry" }, { status: 500 });
  }

  await auth.service.from("audit_logs").insert({
    actor_id: auth.userId,
    action: "partnership_inquiry_status_updated",
    entity_type: "university_partnership_inquiry",
    entity_id: id,
    metadata: { status: parsed.data.status },
  });

  return NextResponse.json({ success: true, inquiry: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;

  const { data: inquiry } = await auth.service
    .from("university_partnership_inquiries")
    .select("id, university_name, contact_person, selected_package")
    .eq("id", id)
    .maybeSingle();

  if (!inquiry) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  }

  const { error: notificationError } = await auth.service
    .from("platform_admin_notifications")
    .delete()
    .eq("type", "partnership_inquiry")
    .eq("reference_id", id);

  if (notificationError) {
    logServerError("partnerships.notification.delete", notificationError);
  }

  const { error } = await auth.service
    .from("university_partnership_inquiries")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not delete inquiry" }, { status: 500 });
  }

  await auth.service.from("audit_logs").insert({
    actor_id: auth.userId,
    action: "partnership_inquiry_deleted",
    entity_type: "university_partnership_inquiry",
    entity_id: id,
    metadata: {
      university_name: inquiry.university_name,
      contact_person: inquiry.contact_person,
      selected_package: inquiry.selected_package,
    },
  });

  return NextResponse.json({ success: true });
}
