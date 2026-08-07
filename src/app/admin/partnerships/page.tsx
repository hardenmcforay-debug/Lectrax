import { createClient } from "@/lib/supabase/server";
import { getDataPageSize } from "@/lib/low-data/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { TablePagination } from "@/components/shared/table-pagination";
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
const PARTNERSHIP_PAYMENTS_CAP = 50;

export default async function AdminPartnershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSize = await getDataPageSize();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  const [
    { data: inquiries, error: inquiriesError, count: inquiriesCount },
    { data: notifications, error: notificationsError },
    { count: unreadNotifications },
    { data: payments, error: paymentsError },
    { count: newCount },
    { count: inDiscussionCount },
    { count: approvedCount },
    { count: completedPaymentsCount },
  ] = await Promise.all([
    supabase
      .from("university_partnership_inquiries")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("platform_admin_notifications")
      .select("*")
      .in("type", [...PARTNERSHIP_NOTIFICATION_TYPES])
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("platform_admin_notifications")
      .select("id", { count: "exact", head: true })
      .in("type", [...PARTNERSHIP_NOTIFICATION_TYPES])
      .eq("is_read", false),
    supabase
      .from("university_partnership_payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(PARTNERSHIP_PAYMENTS_CAP),
    supabase
      .from("university_partnership_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("university_partnership_inquiries")
      .select("id", { count: "exact", head: true })
      .in("status", ["in_discussion", "contacted"]),
    supabase
      .from("university_partnership_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("university_partnership_payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
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

  const pageInquiries = (inquiries ?? []) as UniversityPartnershipInquiry[];
  const totalInquiries = inquiriesCount ?? 0;
  const allNotifications = (notifications ?? []) as PlatformAdminNotification[];
  const allPayments = (payments ?? []) as UniversityPartnershipPayment[];
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
        <StatCard title="Total Inquiries" value={totalInquiries} icon={Building2} />
        <StatCard title="New" value={newCount ?? 0} icon={Bell} />
        <StatCard title="In Progress" value={inDiscussionCount ?? 0} icon={MessageSquare} />
        <StatCard
          title="Approved / Paid"
          value={approvedCount ?? 0}
          subtitle={
            unreadNotifications
              ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? "" : "s"}`
              : completedPaymentsCount
                ? `${completedPaymentsCount} paid partnership${completedPaymentsCount === 1 ? "" : "s"}`
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
      <div className="mb-4">
        <TablePagination
          basePath="/admin/partnerships"
          page={page}
          pageSize={pageSize}
          total={totalInquiries}
        />
      </div>
      <AdminPartnershipsTable inquiries={pageInquiries} paidInquiryIds={[...paidInquiryIds]} />
    </DashboardShell>
  );
}
