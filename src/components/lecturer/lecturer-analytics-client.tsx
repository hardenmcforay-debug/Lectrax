"use client";

import { memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  lecturerDashboardCardHeadingClass,
  lecturerPortalCardClass,
} from "@/components/lecturer/lecturer-dashboard-styles";
import type { LecturerAttendanceChartPoint } from "@/lib/lecturer/analytics";

function LecturerAnalyticsClientComponent({
  attendanceData,
}: {
  attendanceData: LecturerAttendanceChartPoint[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className={lecturerPortalCardClass}>
        <CardHeader>
          <CardTitle className={lecturerDashboardCardHeadingClass}>Attendance by Class</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rate" fill="#10B981" name="Participation %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className={lecturerPortalCardClass}>
        <CardHeader>
          <CardTitle className={lecturerDashboardCardHeadingClass}>Activity Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#0B3D91" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export const LecturerAnalyticsClient = memo(LecturerAnalyticsClientComponent);
