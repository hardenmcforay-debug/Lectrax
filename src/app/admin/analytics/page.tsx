import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { DollarSign, Users, GraduationCap, CreditCard } from "lucide-react";
import { getAdminAnalytics } from "@/lib/admin/queries";
import { AdminAnalyticsSection } from "@/components/admin/admin-analytics-section";

export default async function AdminAnalyticsPage() {
  const { totals, subscriptionData, revenueByPlan } = await getAdminAnalytics();

  return (
    <DashboardShell
      role="platform_admin"
      title="Platform Analytics"
      description="Subscription analytics, revenue tracking, and platform growth"
    >
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Lecturers" value={totals.lecturers} icon={Users} />
        <StatCard title="Students" value={totals.students} icon={GraduationCap} />
        <StatCard title="Revenue" value={`$${totals.revenue.toFixed(2)}`} icon={DollarSign} />
        <StatCard title="Class sessions" value={totals.sessions} icon={CreditCard} />
      </div>

      <AdminAnalyticsSection subscriptionData={subscriptionData} revenueByPlan={revenueByPlan} />
    </DashboardShell>
  );
}
