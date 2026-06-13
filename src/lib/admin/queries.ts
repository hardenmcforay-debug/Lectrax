import { createClient } from "@/lib/supabase/server";

export async function getAdminOverview() {
  const supabase = await createClient();

  const [
    lecturersRes,
    studentsRes,
    sessionsRes,
    paymentsRes,
    activeSubsRes,
    freeSubsRes,
    expiredSubsRes,
    recentLogsRes,
    recentPaymentsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "lecturer"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("class_sessions").select("id", { count: "exact", head: true }),
    supabase
      .from("payments")
      .select("amount, status")
      .in("status", ["completed", "pending"]),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "free"])
      .gt("expires_at", new Date().toISOString()),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("is_free_override", true),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "expired"),
    supabase
      .from("audit_logs")
      .select("id, action, created_at, entity_type, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("payments")
      .select("id, amount, plan, paid_at, profiles(full_name, email)")
      .eq("status", "completed")
      .order("paid_at", { ascending: false })
      .limit(5),
  ]);

  const payments = paymentsRes.data ?? [];
  const completed = payments.filter((p) => p.status === "completed");
  const revenue = completed.reduce((s, p) => s + Number(p.amount), 0);
  const pendingRevenue = payments
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + Number(p.amount), 0);

  return {
    totalLecturers: lecturersRes.count ?? 0,
    totalStudents: studentsRes.count ?? 0,
    totalSessions: sessionsRes.count ?? 0,
    revenue,
    pendingRevenue,
    activeSubscriptions: activeSubsRes.count ?? 0,
    freeSubscriptions: freeSubsRes.count ?? 0,
    expiredSubscriptions: expiredSubsRes.count ?? 0,
    recentLogs: recentLogsRes.data ?? [],
    recentPayments: recentPaymentsRes.data ?? [],
  };
}

export type AdminAnalyticsData = {
  totals: {
    lecturers: number;
    students: number;
    revenue: number;
    sessions: number;
  };
  subscriptionData: { name: string; value: number }[];
  revenueByPlan: { plan: string; revenue: number }[];
};

export async function getAdminAnalytics(): Promise<AdminAnalyticsData> {
  const supabase = await createClient();

  const [lecturers, students, sessions, payments, active, expired, free, pending] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "lecturer"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("class_sessions").select("id", { count: "exact", head: true }),
      supabase.from("payments").select("amount, plan, status").eq("status", "completed"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "expired"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "free"),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

  const paymentRows = payments.data ?? [];
  const revenue = paymentRows.reduce((s, p) => s + Number(p.amount), 0);

  const byPlan: Record<string, number> = {};
  for (const p of paymentRows) {
    const plan = p.plan.replace("_", " ");
    byPlan[plan] = (byPlan[plan] ?? 0) + Number(p.amount);
  }

  return {
    totals: {
      lecturers: lecturers.count ?? 0,
      students: students.count ?? 0,
      revenue,
      sessions: sessions.count ?? 0,
    },
    subscriptionData: [
      { name: "Active", value: active.count ?? 0 },
      { name: "Free", value: free.count ?? 0 },
      { name: "Expired", value: expired.count ?? 0 },
      { name: "Pending pay", value: pending.count ?? 0 },
    ],
    revenueByPlan: Object.entries(byPlan).map(([plan, rev]) => ({ plan, revenue: rev })),
  };
}

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    user,
    isAdmin: profile?.role === "platform_admin",
  };
}
