import { createClient } from "@/lib/supabase/server";
import { getDataPageSize } from "@/lib/low-data/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { TablePagination } from "@/components/shared/table-pagination";
import { AdminSubscriptionsTable } from "@/components/admin/admin-subscriptions-table";
import { CreditCard, Gift, Clock, TriangleAlert } from "@/components/lucide-icons";

export default async function AdminSubscriptionsPage({
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
    { data: lecturers, count },
    { count: activePremium },
    { count: freePlan },
    { count: gracePeriod },
    { count: expired },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, subscription_plan, subscription_status, subscription_end_date, grace_period_end_date, created_at",
        { count: "exact" }
      )
      .eq("role", "lecturer")
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "lecturer")
      .eq("subscription_plan", "premium")
      .eq("subscription_status", "active"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "lecturer")
      .eq("subscription_plan", "free"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "lecturer")
      .eq("subscription_status", "grace_period"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "lecturer")
      .eq("subscription_status", "expired"),
  ]);

  const pageRows = lecturers ?? [];
  const total = count ?? 0;

  return (
    <DashboardShell
      role="platform_admin"
      title="Manage Subscriptions"
      description="View and manage lecturer subscription plans, grace periods, and expirations"
    >
      <div className="mb-6 admin-stat-grid admin-stat-grid--cols-4">
        <StatCard title="Active Premium" value={activePremium ?? 0} icon={CreditCard} />
        <StatCard title="Free Plan" value={freePlan ?? 0} icon={Gift} />
        <StatCard title="Grace Period" value={gracePeriod ?? 0} icon={TriangleAlert} />
        <StatCard title="Expired" value={expired ?? 0} icon={Clock} />
      </div>

      <div className="mb-4">
        <TablePagination
          basePath="/admin/subscriptions"
          page={page}
          pageSize={pageSize}
          total={total}
        />
      </div>

      <AdminSubscriptionsTable lecturers={pageRows} />
    </DashboardShell>
  );
}
