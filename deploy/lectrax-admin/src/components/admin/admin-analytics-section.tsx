"use client";

import dynamic from "next/dynamic";
import type { AdminAnalyticsData } from "@/lib/admin/queries";

const AdminAnalyticsCharts = dynamic(
  () =>
    import("@/components/admin/admin-analytics-charts").then(
      (mod) => mod.AdminAnalyticsCharts
    ),
  { ssr: false }
);

export function AdminAnalyticsSection({
  subscriptionData,
  revenueByPlan,
}: Pick<AdminAnalyticsData, "subscriptionData" | "revenueByPlan">) {
  return (
    <AdminAnalyticsCharts subscriptionData={subscriptionData} revenueByPlan={revenueByPlan} />
  );
}
