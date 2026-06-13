"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CourseAcademicOverview } from "@/lib/student/academic-overview";
import {
  studentDashboardCardClass,
  studentDashboardCardHeadingClass,
  studentDashboardDropdownClass,
  studentDashboardNestedItemClass,
} from "@/components/student/student-dashboard-styles";

const PREVIEW_LIMIT = 2;

type CoursePreview = Pick<CourseAcademicOverview, "enrollmentId" | "courseCode" | "courseTitle">;

function ClassItem({ course }: { course: CoursePreview }) {
  return (
    <div className={`rounded-lg border p-4 ${studentDashboardNestedItemClass}`}>
      <p className="font-medium">
        {course.courseCode} — {course.courseTitle}
      </p>
      <Badge variant="secondary" className="mt-1">
        Enrolled
      </Badge>
    </div>
  );
}

export const MyClassesCard = memo(function MyClassesCard({ courses }: { courses: CoursePreview[] }) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const showDropdown = courses.length > PREVIEW_LIMIT;
  const previewCourses = showDropdown ? courses.slice(0, PREVIEW_LIMIT) : courses;
  const extraCount = courses.length - PREVIEW_LIMIT;

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
      className={`relative mt-8 ${studentDashboardCardClass} ${open ? "z-30" : ""}`}
    >
      <CardHeader>
        <CardTitle className={studentDashboardCardHeadingClass}>My Classes</CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {courses.length === 0 ? (
          <p className="text-muted-foreground">Join a class using a session code.</p>
        ) : (
          <>
            {previewCourses.map((course) => (
              <ClassItem key={course.enrollmentId} course={course} />
            ))}

            {showDropdown && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-between px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setOpen((prev) => !prev)}
                aria-expanded={open}
                aria-controls="my-classes-dropdown"
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
            id="my-classes-dropdown"
            className={`absolute inset-x-0 top-full z-20 mt-1 max-h-60 space-y-4 overflow-y-auto rounded-md border p-4 shadow-lg ${studentDashboardDropdownClass}`}
          >
            {courses.slice(PREVIEW_LIMIT).map((course) => (
              <ClassItem key={course.enrollmentId} course={course} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
