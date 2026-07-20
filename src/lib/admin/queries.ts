import { createClient } from "@/lib/supabase/server";
import { PLATFORM_TRANSACTION_AUDIT_ACTIONS } from "@/lib/admin/platform-transaction-audit";

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

function countLecturerPlans(lecturers: LecturerPlanRow[]) {
  let activeSubscriptions = 0;
  let freeSubscriptions = 0;
  let expiredSubscriptions = 0;

  for (const lecturer of lecturers) {
    const bucket = classifyLecturerSubscription(lecturer);
    if (bucket === "active") activeSubscriptions += 1;
    else if (bucket === "expired") expiredSubscriptions += 1;
    else freeSubscriptions += 1;
  }

  return { activeSubscriptions, freeSubscriptions, expiredSubscriptions };
}

export async function getAdminOverview() {
  const supabase = await createClient();

  const [
    lecturersRes,
    studentsRes,
    sessionsRes,
    paymentsRes,
    lecturerPlansRes,
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
      .from("profiles")
      .select("subscription_plan, subscription_status, subscription_end_date")
      .eq("role", "lecturer"),
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

  const payments = paymentsRes.data ?? [];
  const completed = payments.filter((p) => p.status === "completed");
  const revenue = completed.reduce((s, p) => s + Number(p.amount), 0);
  const pendingRevenue = payments
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + Number(p.amount), 0);

  const planCounts = countLecturerPlans((lecturerPlansRes.data ?? []) as LecturerPlanRow[]);

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

  const [lecturers, students, sessions, paymentTotals, lecturerPlansRes, pending] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "lecturer"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
      supabase.from("class_sessions").select("id", { count: "exact", head: true }),
      supabase.rpc("admin_completed_payment_totals"),
      supabase
        .from("profiles")
        .select("subscription_plan, subscription_status, subscription_end_date")
        .eq("role", "lecturer"),
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

  const planCounts = countLecturerPlans((lecturerPlansRes.data ?? []) as LecturerPlanRow[]);

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
