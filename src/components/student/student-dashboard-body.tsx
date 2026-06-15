"use client";

import { useState } from "react";
import { BookOpen, FileText } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { ClassCAPerSessionCard } from "@/components/student/class-ca-per-session-card";
import { MyClassesCard } from "@/components/student/my-classes-card";
import {
  studentDashboardCardClass,
  studentDashboardCardHeadingClass,
} from "@/components/student/student-dashboard-styles";
import type { CourseAcademicOverview } from "@/lib/student/academic-overview";
import { cn } from "@/lib/utils";

type CoursePreview = Pick<
  CourseAcademicOverview,
  "enrollmentId" | "courseCode" | "courseTitle" | "totalCADisplay"
>;

type StudentDashboardBodyProps = {
  courses: CoursePreview[];
  submittedCount: number;
  totalAssignments: number;
};

export function StudentDashboardBody({
  courses,
  submittedCount,
  totalAssignments,
}: StudentDashboardBodyProps) {
  const [caDropdownOpen, setCaDropdownOpen] = useState(false);

  return (
    <div className="relative">
      <div className={cn("portal-stat-grid", caDropdownOpen && "relative z-50 overflow-visible")}>
        <StatCard
          title="Enrolled Classes"
          value={courses.length}
          icon={BookOpen}
          className={studentDashboardCardClass}
          titleClassName={studentDashboardCardHeadingClass}
        />
        <StatCard
          title="Assignment Submissions"
          value={submittedCount}
          icon={FileText}
          subtitle={
            totalAssignments > 0
              ? `${submittedCount} of ${totalAssignments} submitted`
              : "No assignments yet"
          }
          className={studentDashboardCardClass}
          titleClassName={studentDashboardCardHeadingClass}
        />
        <ClassCAPerSessionCard
          courses={courses}
          onDropdownOpenChange={setCaDropdownOpen}
        />
      </div>
      <MyClassesCard courses={courses} />
    </div>
  );
}
