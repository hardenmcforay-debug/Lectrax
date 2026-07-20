import Link from "next/link";
import { getAdminOverview } from "@/lib/admin/queries";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  GraduationCap,
  DollarSign,
  CreditCard,
  BookOpen,
  ClipboardList,
  BarChart3,
  Activity,
  Building2,
  Mail,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { formatChargeAmount } from "@/lib/subscription/payment-currency";

const QUICK_ACTIONS = [
  { href: "/admin/lecturers", label: "Manage lecturers", icon: Users },
  { href: "/admin/partnerships", label: "University partnerships", icon: Building2 },
  { href: "/admin/contact", label: "Contact messages", icon: Mail },
  { href: "/admin/landing", label: "Logo & landing page", icon: Sparkles },
  { href: "/admin/subscriptions", label: "Manage subscriptions", icon: CreditCard },
  { href: "/admin/payments", label: "Revenue & payments", icon: DollarSign },
  { href: "/admin/analytics", label: "Platform analytics", icon: BarChart3 },
  { href: "/admin/audit", label: "Audit logs", icon: ClipboardList },
  { href: "/admin/students", label: "View students", icon: GraduationCap },
];

export default async function AdminDashboard() {
  const stats = await getAdminOverview();

  return (
    <DashboardShell
      role="platform_admin"
      title="Platform Admin"
      description="Manage lecturers, subscriptions, revenue, and platform activity"
    >
      <div className="admin-stat-grid admin-stat-grid--cols-4">
        <StatCard title="Total Lecturers" value={stats.totalLecturers} icon={Users} />
        <StatCard title="Total Students" value={stats.totalStudents} icon={GraduationCap} />
        <StatCard
          title="Total Revenue"
          value={formatChargeAmount(stats.revenue, "SLE")}
          subtitle={
            stats.pendingRevenue > 0
              ? `${formatChargeAmount(stats.pendingRevenue, "SLE")} pending`
              : undefined
          }
          icon={DollarSign}
        />
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions}
          subtitle={`${stats.freeSubscriptions} free · ${stats.expiredSubscriptions} expired`}
          icon={CreditCard}
        />
      </div>

      <div className="admin-stat-grid admin-stat-grid--cols-3 mt-4">
        <StatCard title="Class Sessions" value={stats.totalSessions} icon={BookOpen} subtitle="Platform-wide" />
        <StatCard title="Free Plans" value={stats.freeSubscriptions} icon={CreditCard} subtitle="Lecturers on free tier" />
        <StatCard title="Expired Plans" value={stats.expiredSubscriptions} icon={Activity} subtitle="Grace or expired only" />
      </div>

      <div className="portal-section grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Admin actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Button key={action.href} variant="outline" className="w-full justify-start" asChild>
                  <Link href={action.href}>
                    <Icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent transactions</CardTitle>
            <Link href="/admin/audit" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transaction activity recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {stats.recentLogs.map((log) => (
                  <li key={log.id} className="border-b pb-2 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{log.action.replace(/_/g, " ")}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(log.profiles as unknown as { full_name: string } | null)?.full_name ?? "System"} ·{" "}
                      {log.entity_type}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent payments</CardTitle>
            <Link href="/admin/payments" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed payments yet.</p>
            ) : (
              <ul className="space-y-3">
                {stats.recentPayments.map((p) => {
                  const profile = p.profiles as unknown as { full_name: string; email: string } | null;
                  return (
                    <li key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{profile?.full_name ?? "Lecturer"}</p>
                        <p className="text-xs text-muted-foreground">{p.plan?.replace("_", " ")}</p>
                      </div>
                      <Badge variant="accent">{formatChargeAmount(Number(p.amount), "SLE")}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
