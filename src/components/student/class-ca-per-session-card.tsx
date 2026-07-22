"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";
import { HERO_LUCIDE_ICON_PROPS } from "@/lib/ui/hero-lucide-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CourseAcademicOverview } from "@/lib/student/academic-overview";
import {
  studentDashboardCardClass,
  studentDashboardCaScoreClass,
  studentDashboardCardHeadingClass,
  studentDashboardDropdownClass,
} from "@/components/student/student-dashboard-styles";

const PREVIEW_LIMIT = 2;

type CoursePreview = Pick<
  CourseAcademicOverview,
  "enrollmentId" | "courseCode" | "courseTitle" | "totalCADisplay"
>;

function CourseCALine({ course }: { course: CoursePreview }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4">
      <p
        className="truncate text-sm"
        title={`${course.courseCode} — ${course.courseTitle}`}
      >
        <span className="font-medium">{course.courseCode}</span>
        <span className="text-muted-foreground"> · {course.courseTitle}</span>
      </p>
      <span className={studentDashboardCaScoreClass}>{course.totalCADisplay}</span>
    </li>
  );
}

export const ClassCAPerSessionCard = memo(function ClassCAPerSessionCard({
  courses,
  onDropdownOpenChange,
}: {
  courses: CoursePreview[];
  onDropdownOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const showDropdown = courses.length > PREVIEW_LIMIT;
  const previewCourses = showDropdown ? courses.slice(0, PREVIEW_LIMIT) : courses;
  const extraCount = courses.length - PREVIEW_LIMIT;

  useEffect(() => {
    onDropdownOpenChange?.(open);
  }, [open, onDropdownOpenChange]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <Card
      ref={cardRef}
      className={cn(
        "relative col-span-2 h-full min-w-0 overflow-visible lg:col-span-1",
        studentDashboardCardClass,
        open && "z-50"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn("text-sm text-muted-foreground", studentDashboardCardHeadingClass)}>
          CA Overview
        </CardTitle>
        <ClipboardList
          {...HERO_LUCIDE_ICON_PROPS}
          className="h-5 w-5 shrink-0 text-emerald-500"
          aria-hidden
        />
      </CardHeader>
      <CardContent className={cn("relative", open && "overflow-visible")}>
        {courses.length === 0 ? (
          <p className="text-xs text-muted-foreground">Join a class to see CA scores.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {previewCourses.map((course) => (
                <CourseCALine key={course.enrollmentId} course={course} />
              ))}
            </ul>

            {showDropdown && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-8 w-full justify-between px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-controls="ca-overview-dropdown"
              >
                <span>
                  {extraCount} more {extraCount === 1 ? "class" : "classes"}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </Button>
            )}
          </>
        )}

        {open && showDropdown && (
          <div
            id="ca-overview-dropdown"
            className={cn(
              "absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border px-3 py-2 shadow-lg",
              studentDashboardDropdownClass
            )}
          >
            <ul className="space-y-2">
              {courses.slice(PREVIEW_LIMIT).map((course) => (
                <CourseCALine key={course.enrollmentId} course={course} />
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
