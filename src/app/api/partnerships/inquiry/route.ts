import { NextResponse } from "next/server";
import { partnershipInquirySchema } from "@/lib/validations";
import { createServiceClient } from "@/lib/supabase/server";
import { PARTNERSHIP_PACKAGES } from "@/lib/partnerships/constants";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = partnershipInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    return NextResponse.json(
      { error: "Could not submit your request. Please try again." },
      { status: 500 }
    );
  }

  const service = await createServiceClient();

  const { data: inquiry, error } = await service
    .from("university_partnership_inquiries")
    .insert({
      university_name: data.universityName,
      department_name: data.departmentName,
      contact_person: data.contactPerson,
      position_role: data.positionRole,
      email: data.email,
      phone_number: data.phoneNumber,
      expected_lecturers: data.expectedLecturers,
      selected_package: data.selectedPackage,
      additional_notes: data.additionalNotes?.trim() || null,
      status: "new",
    })
    .select("id, university_name, contact_person, selected_package")
    .single();

  if (error || !inquiry) {
    console.error("Partnership inquiry insert failed:", error);
    return NextResponse.json(
      { error: "Could not submit your request. Please try again." },
      { status: 500 }
    );
  }

  const packageLabel =
    PARTNERSHIP_PACKAGES.find((pkg) => pkg.id === inquiry.selected_package)?.name ??
    inquiry.selected_package;

  const { error: notificationError } = await service.from("platform_admin_notifications").insert({
    type: "partnership_inquiry",
    reference_id: inquiry.id,
    title: "New university partnership inquiry",
    message: `${inquiry.university_name} (${packageLabel}) — contact: ${inquiry.contact_person}`,
  });

  if (notificationError) {
    console.error("Admin notification insert failed:", notificationError);
  }

  await service.from("audit_logs").insert({
    actor_id: null,
    action: "partnership_inquiry_submitted",
    entity_type: "university_partnership_inquiry",
    entity_id: inquiry.id,
    metadata: {
      university_name: inquiry.university_name,
      selected_package: inquiry.selected_package,
    },
  });

  return NextResponse.json({ success: true });
}
