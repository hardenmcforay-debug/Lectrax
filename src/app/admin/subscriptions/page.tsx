import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { AdminSubscriptionsTable } from "@/components/admin/admin-subscriptions-table";
import { CreditCard, Gift, Clock, AlertTriangle } from "lucide-react";

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();

  const { data: lecturers } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, subscription_plan, subscription_status, subscription_end_date, grace_period_end_date, created_at"
    )
    .eq("role", "lecturer")
    .order("created_at", { ascending: false });

  const all = lecturers ?? [];
  const activePremium = all.filter(
    (l) => l.subscription_plan === "premium" && l.subscription_status === "active"
  );
  const gracePeriod = all.filter((l) => l.subscription_status === "grace_period");
  const expired = all.filter((l) => l.subscription_status === "expired");
  const freePlan = all.filter((l) => l.subscription_plan === "free");

  return (
    <DashboardShell
      role="platform_admin"
      title="Manage Subscriptions"
      description="View and manage lecturer subscription plans, grace periods, and expirations"
    >
      <div className="mb-6 admin-stat-grid admin-stat-grid--cols-4">
        <StatCard title="Active Premium" value={activePremium.length} icon={CreditCard} />
        <StatCard title="Free Plan" value={freePlan.length} icon={Gift} />
        <StatCard title="Grace Period" value={gracePeriod.length} icon={AlertTriangle} />
        <StatCard title="Expired" value={expired.length} icon={Clock} />
      </div>

      <AdminSubscriptionsTable lecturers={all} />
    </DashboardShell>
  );
}
