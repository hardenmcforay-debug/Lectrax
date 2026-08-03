import { createServiceClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { AdminPartnershipsTable } from "@/components/admin/admin-partnerships-table";
import { AdminPartnershipNotifications } from "@/components/admin/admin-partnership-notifications";
import { AdminPartnershipPaymentsTable } from "@/components/admin/admin-partnership-payments-table";
import { Building2, Bell, CircleCheckBig, CreditCard, MessageSquare } from "@/components/lucide-icons";
import type {
  PlatformAdminNotification,
  UniversityPartnershipInquiry,
  UniversityPartnershipPayment,
} from "@/types/database";

const PARTNERSHIP_NOTIFICATION_TYPES = ["partnership_inquiry", "partnership_payment"] as const;

export default async function AdminPartnershipsPage() {
  const service = await createServiceClient();

  const [
    { data: inquiries, error: inquiriesError },
    { data: notifications, error: notificationsError },
    { count: unreadNotifications },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    service
      .from("university_partnership_inquiries")
      .select("*")
      .order("created_at", { ascending: false }),
    service
      .from("platform_admin_notifications")
      .select("*")
      .in("type", [...PARTNERSHIP_NOTIFICATION_TYPES])
      .order("created_at", { ascending: false })
      .limit(40),
    service
      .from("platform_admin_notifications")
      .select("id", { count: "exact", head: true })
      .in("type", [...PARTNERSHIP_NOTIFICATION_TYPES])
      .eq("is_read", false),
    service
      .from("university_partnership_payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (inquiriesError && process.env.NODE_ENV === "development") {
    console.error("Failed to load partnership inquiries:", inquiriesError);
  }
  if (notificationsError && process.env.NODE_ENV === "development") {
    console.error("Failed to load partnership notifications:", notificationsError);
  }
  if (paymentsError && process.env.NODE_ENV === "development") {
    console.error("Failed to load partnership payments:", paymentsError);
  }

  const all = (inquiries ?? []) as UniversityPartnershipInquiry[];
  const allNotifications = (notifications ?? []) as PlatformAdminNotification[];
  const allPayments = (payments ?? []) as UniversityPartnershipPayment[];
  const newInquiries = all.filter((inquiry) => inquiry.status === "new");
  const inDiscussion = all.filter(
    (inquiry) => inquiry.status === "in_discussion" || inquiry.status === "contacted"
  );
  const approved = all.filter((inquiry) => inquiry.status === "approved");
  const completedPayments = allPayments.filter((payment) => payment.status === "completed");
  const paidInquiryIds = new Set(
    allPayments
      .filter((payment) => payment.status === "completed" && payment.inquiry_id)
      .map((payment) => payment.inquiry_id as string)
  );

  return (
    <DashboardShell
      role="platform_admin"
      title="University Partnerships"
      description="Review departmental subscription inquiries, paid partnerships, and onboarding"
    >
      {inquiriesError ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Partnership inquiries could not be loaded. Ensure database migration{" "}
          <code className="rounded bg-amber-100 px-1">032_university_partnership_inquiries.sql</code>{" "}
          has been applied to your Supabase project.
        </div>
      ) : null}

      <div className="mb-6 admin-stat-grid admin-stat-grid--cols-4">
        <StatCard title="Total Inquiries" value={all.length} icon={Building2} />
        <StatCard title="New" value={newInquiries.length} icon={Bell} />
        <StatCard title="In Progress" value={inDiscussion.length} icon={MessageSquare} />
        <StatCard
          title="Approved / Paid"
          value={approved.length}
          subtitle={
            unreadNotifications
              ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? "" : "s"}`
              : completedPayments.length
                ? `${completedPayments.length} paid partnership${completedPayments.length === 1 ? "" : "s"}`
                : undefined
          }
          icon={CircleCheckBig}
        />
      </div>

      <AdminPartnershipNotifications notifications={allNotifications} />

      <div className="mb-8 space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Partnership payments</h2>
        </div>
        {paymentsError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Partnership payments could not be loaded. Ensure database migration{" "}
            <code className="rounded bg-amber-100 px-1">052_university_partnership_payments.sql</code>{" "}
            has been applied.
          </div>
        ) : (
          <AdminPartnershipPaymentsTable payments={allPayments} />
        )}
      </div>

      <div className="mb-3">
        <h2 className="text-base font-semibold text-foreground">Inquiries</h2>
        <p className="text-sm text-muted-foreground">
          Form submissions and records created from successful online partnership payments.
        </p>
      </div>
      <AdminPartnershipsTable inquiries={all} paidInquiryIds={[...paidInquiryIds]} />
    </DashboardShell>
  );
}
