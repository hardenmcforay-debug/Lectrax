"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminAnalyticsData } from "@/lib/admin/queries";

const COLORS = ["#0B3D91", "#10B981", "#64748B", "#F59E0B", "#EF4444"];

export function AdminAnalyticsCharts({
  subscriptionData,
  revenueByPlan,
}: Pick<AdminAnalyticsData, "subscriptionData" | "revenueByPlan">) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Subscription breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={subscriptionData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {subscriptionData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by plan</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {revenueByPlan.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No revenue data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByPlan}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="plan" />
                <YAxis />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
