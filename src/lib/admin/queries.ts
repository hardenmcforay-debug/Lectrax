import { createClient } from "@/lib/supabase/server";
import { PLATFORM_TRANSACTION_AUDIT_ACTIONS } from "@/lib/admin/platform-transaction-audit";
import { PAGINATION } from "@/lib/pagination";

type LecturerPlanRow = {
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
};

/** Classify a lecturer for admin dashboard cards. Mutually exclusive buckets. */
export function classifyLecturerSubscription(
  lecturer: LecturerPlanRow,
  now = new Date()
): "free" | "active" | "expired" {
  if (lecturer.subscription_plan === "free") return "free";
  if (lecturer.subscription_plan !== "premium") return "free";

  const status = lecturer.subscription_status;
  const endDate = lecturer.subscription_end_date
    ? new Date(lecturer.subscription_end_date)
    : null;
  const periodStillActive = !endDate || endDate > now;

  // Active premium with a current (or open-ended) period — never Expired Plans.
  if (status === "active" && periodStillActive) return "active";

  // Paid period ended: grace, fully expired, or stale active past end date.
  if (status === "grace_period" || status === "expired" || status === "active") {
    return "expired";
  }

  return "free";
}

/** Head-count subscription buckets (approximate; ignores stale active past end date). */
async function countLecturerPlanBuckets(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [active, free, expiredish] = await Promise.all([
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
      .in("subscription_status", ["grace_period", "expired"]),
  ]);

  return {
    activeSubscriptions: active.count ?? 0,
    freeSubscriptions: free.count ?? 0,
    expiredSubscriptions: expiredish.count ?? 0,
  };
}

export async function getAdminOverview() {
  const supabase = await createClient();

  const [
    lecturersRes,
    studentsRes,
    sessionsRes,
    paymentTotals,
    pendingAmountsRes,
    planCounts,
    recentLogsRes,
    recentPaymentsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "lecturer"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("class_sessions").select("id", { count: "exact", head: true }),
    supabase.rpc("admin_completed_payment_totals"),
    supabase
      .from("payments")
      .select("amount")
      .eq("status", "pending")
      .limit(PAGINATION.MAX_PAGE_SIZE * 20),
    countLecturerPlanBuckets(supabase),
    supabase
      .from("audit_logs")
      .select("id, action, created_at, entity_type, profiles(full_name)")
      .in("action", [...PLATFORM_TRANSACTION_AUDIT_ACTIONS])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("payments")
      .select("id, amount, plan, paid_at, profiles(full_name, email)")
      .eq("status", "completed")
      .order("paid_at", { ascending: false })
      .limit(5),
  ]);

  const totalsPayload = paymentTotals.data as { total_revenue?: number } | null;
  const revenue = Number(totalsPayload?.total_revenue ?? 0);
  const pendingRevenue = (pendingAmountsRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );

  return {
    totalLecturers: lecturersRes.count ?? 0,
    totalStudents: studentsRes.count ?? 0,
    totalSessions: sessionsRes.count ?? 0,
    revenue,
    pendingRevenue,
    activeSubscriptions: planCounts.activeSubscriptions,
    freeSubscriptions: planCounts.freeSubscriptions,
    expiredSubscriptions: planCounts.expiredSubscriptions,
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

  const [lecturers, students, sessions, paymentTotals, planCounts, pending] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "lecturer"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("class_sessions").select("id", { count: "exact", head: true }),
      supabase.rpc("admin_completed_payment_totals"),
      countLecturerPlanBuckets(supabase),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

  const totalsPayload = paymentTotals.data as
    | { total_revenue?: number; by_plan?: Record<string, number> }
    | null;
  const revenue = Number(totalsPayload?.total_revenue ?? 0);
  const byPlanRaw = totalsPayload?.by_plan ?? {};

  const revenueByPlan = Object.entries(byPlanRaw).map(([plan, rev]) => ({
    plan: plan.replace("_", " "),
    revenue: Number(rev),
  }));

  return {
    totals: {
      lecturers: lecturers.count ?? 0,
      students: students.count ?? 0,
      revenue,
      sessions: sessions.count ?? 0,
    },
    subscriptionData: [
      { name: "Active", value: planCounts.activeSubscriptions },
      { name: "Free", value: planCounts.freeSubscriptions },
      { name: "Expired", value: planCounts.expiredSubscriptions },
      { name: "Pending pay", value: pending.count ?? 0 },
    ],
    revenueByPlan,
  };
}
