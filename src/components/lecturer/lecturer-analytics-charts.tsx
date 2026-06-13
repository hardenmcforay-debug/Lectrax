"use client";

import dynamic from "next/dynamic";
import type { LecturerAttendanceChartPoint } from "@/lib/lecturer/analytics";

const LecturerAnalyticsClient = dynamic(
  () =>
    import("@/components/lecturer/lecturer-analytics-client").then(
      (mod) => mod.LecturerAnalyticsClient
    ),
  { ssr: false }
);

export function LecturerAnalyticsCharts({
  attendanceData,
}: {
  attendanceData: LecturerAttendanceChartPoint[];
}) {
  return <LecturerAnalyticsClient attendanceData={attendanceData} />;
}
