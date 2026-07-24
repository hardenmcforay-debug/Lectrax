import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { PARTNERSHIP_PACKAGES } from "@/lib/partnerships/constants";
import { logServerError } from "@/lib/errors/logger";

type PartnershipPaymentRow = {
  id: string;
  package_id: string;
  package_name: string;
  university_name: string;
  department_name: string;
  contact_person: string;
  email: string;
  phone_number: string;
  country: string;
  display_amount_usd: number;
  status: string;
  inquiry_id: string | null;
  metadata: Record<string, unknown> | null;
};

/**
 * Marks a partnership payment completed, stores institution details for admin,
 * and notifies platform admins. Safe to call repeatedly (idempotent).
 */
export async function completePartnershipPayment(params: {
  payment: PartnershipPaymentRow;
  transactionReference?: string | null;
  service: SupabaseClient;
}): Promise<{ completed: boolean; alreadyCompleted: boolean }> {
  const { payment, transactionReference, service } = params;

  if (payment.status === "completed") {
    return { completed: true, alreadyCompleted: true };
  }

  const paidAt = new Date().toISOString();

  const { error: paymentUpdateError } = await service
    .from("university_partnership_payments")
    .update({
      status: "completed",
      paid_at: paidAt,
      ...(transactionReference
        ? { transaction_reference: transactionReference }
        : {}),
    })
    .eq("id", payment.id)
    .neq("status", "completed");

  if (paymentUpdateError) {
    logServerError("partnerships.payment.complete_update", paymentUpdateError);
    throw paymentUpdateError;
  }

  // Re-check in case another worker won the race
  const { data: refreshed } = await service
    .from("university_partnership_payments")
    .select("status, inquiry_id")
    .eq("id", payment.id)
    .maybeSingle();

  if (refreshed?.status !== "completed") {
    return { completed: false, alreadyCompleted: false };
  }

  if (refreshed.inquiry_id) {
    return { completed: true, alreadyCompleted: false };
  }

  const packageLabel =
    PARTNERSHIP_PACKAGES.find((pkg) => pkg.id === payment.package_id)?.name ??
    payment.package_name;

  const lecturerLimit =
    PARTNERSHIP_PACKAGES.find((pkg) => pkg.id === payment.package_id)?.lecturerLimit ?? 10;

  const { data: inquiry, error: inquiryError } = await service
    .from("university_partnership_inquiries")
    .insert({
      university_name: payment.university_name,
      department_name: payment.department_name,
      contact_person: payment.contact_person,
      position_role: "Partnership Payment",
      email: payment.email,
      phone_number: payment.phone_number,
      expected_lecturers: lecturerLimit,
      selected_package: payment.package_id,
      additional_notes: [
        "Paid online via Monime partnership checkout.",
        `Country: ${payment.country}`,
        `Package: ${payment.package_name}`,
        `Amount (USD display): $${Number(payment.display_amount_usd).toLocaleString()} / Academic Year`,
        `Payment ID: ${payment.id}`,
        transactionReference ? `Transaction: ${transactionReference}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      status: "approved",
    })
    .select("id")
    .single();

  if (inquiryError || !inquiry) {
    logServerError("partnerships.payment.inquiry_insert", inquiryError);
  } else {
    await service
      .from("university_partnership_payments")
      .update({ inquiry_id: inquiry.id })
      .eq("id", payment.id);
  }

  const { error: notificationError } = await service.from("platform_admin_notifications").insert({
    type: "partnership_payment",
    reference_id: payment.id,
    title: "New paid university partnership",
    message: `${payment.university_name} — ${packageLabel} ($${Number(payment.display_amount_usd).toLocaleString()}/Academic Year). Contact: ${payment.contact_person} <${payment.email}>. Dept: ${payment.department_name}. Country: ${payment.country}. Phone: ${payment.phone_number}.`,
  });

  if (notificationError) {
    logServerError("partnerships.payment.notification", notificationError);
  }

  await service.from("audit_logs").insert({
    actor_id: null,
    action: "partnership_payment_completed",
    entity_type: "university_partnership_payment",
    entity_id: payment.id,
    metadata: {
      university_name: payment.university_name,
      package_id: payment.package_id,
      email: payment.email,
      country: payment.country,
      inquiry_id: inquiry?.id ?? null,
    },
  });

  return { completed: true, alreadyCompleted: false };
}
