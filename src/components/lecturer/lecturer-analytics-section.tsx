import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LecturerAnalyticsCharts } from "@/components/lecturer/lecturer-analytics-charts";
import { isPremiumFeatureUnlocked } from "@/lib/subscription";
import type { LecturerSubscription } from "@/lib/subscription/types";
import type { LecturerAttendanceChartPoint } from "@/lib/lecturer/analytics";
import {
  lecturerDashboardCardHeadingClass,
  lecturerPortalCardClass,
} from "@/components/lecturer/lecturer-dashboard-styles";
import { cn } from "@/lib/utils";

export function LecturerAnalyticsSection({
  subscription,
  attendanceData,
}: {
  subscription: LecturerSubscription | null;
  attendanceData: LecturerAttendanceChartPoint[];
}) {
  if (!isPremiumFeatureUnlocked(subscription)) {
    return (
      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Attendance and class participation insights
          </p>
        </div>
        <Card className={cn(lecturerPortalCardClass, "border-amber-300 bg-amber-50")}>
          <CardHeader>
            <CardTitle className={lecturerDashboardCardHeadingClass}>Premium Feature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-900">
              Analytics is available on the Premium plan. Upgrade to unlock attendance insights and
              participation trends.
            </p>
            <Button variant="accent" asChild>
              <Link href="/lecturer/subscription">Upgrade to Premium</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-lg font-bold">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Attendance and class participation insights
        </p>
      </div>
      <LecturerAnalyticsCharts attendanceData={attendanceData} />
    </section>
  );
}
