import Link from "next/link";
import { BookOpen, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CourseAcademicOverview, StudentAcademicOverview } from "@/lib/student/academic-overview";
import { CaTestTableCells, CaTestTableHeaders } from "@/components/shared/ca-test-table-columns";
import { formatPercent } from "@/lib/utils";
import { SEMESTER_LABELS } from "@/types/database";
import { studentDashboardCardClass } from "@/components/student/student-dashboard-styles";

const scoreHeadClass =
  "min-w-[6.5rem] whitespace-nowrap px-4 py-3 text-center align-middle";
const scoreCellClass = "px-4 py-3 text-center align-middle tabular-nums whitespace-nowrap";

function CourseOverviewSection({ course }: { course: CourseAcademicOverview }) {
  return (
    <Card className={studentDashboardCardClass}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              {course.courseCode} — {course.courseTitle}
            </CardTitle>
            <CardDescription className="mt-1">
              {SEMESTER_LABELS[course.semester]} · {course.academicYear}
            </CardDescription>
          </div>
          <Badge variant="secondary">Enrolled</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-card">
          <Table className="w-full min-w-[44rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[11rem] whitespace-nowrap px-4 py-3 align-middle">
                  Name
                </TableHead>
                <TableHead className="w-[5.5rem] min-w-[5.5rem] whitespace-nowrap px-3 py-3 text-center align-middle">
                  Attendance %
                </TableHead>
                <TableHead className="min-w-[8rem] whitespace-nowrap px-4 py-3 text-center align-middle">
                  Classes Attended
                </TableHead>
                {course.assignmentDisplays.length <= 1 ? (
                  <TableHead className={scoreHeadClass}>Assignment</TableHead>
                ) : (
                  <>
                    <TableHead className={scoreHeadClass}>Assignment 1</TableHead>
                    <TableHead className={scoreHeadClass}>Assignment 2</TableHead>
                  </>
                )}
                <CaTestTableHeaders testCount={course.testCount} />
                <TableHead className="min-w-[5.5rem] whitespace-nowrap px-4 py-3 text-center align-middle">
                  Total C.A
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="px-4 py-3 align-middle font-medium">
                  {course.studentName}
                </TableCell>
                <TableCell className="px-3 py-3 text-center align-middle text-sm font-medium tabular-nums">
                  {formatPercent(course.attendancePercent)}
                </TableCell>
                <TableCell className="px-4 py-3 text-center align-middle tabular-nums text-muted-foreground">
                  {course.totalAttended}/{course.totalSessions}
                </TableCell>
                {course.assignmentDisplays.length <= 1 ? (
                  <TableCell className={scoreCellClass}>{course.assignmentDisplays[0] ?? "-"}</TableCell>
                ) : (
                  <>
                    <TableCell className={scoreCellClass}>{course.assignmentDisplays[0] ?? "-"}</TableCell>
                    <TableCell className={scoreCellClass}>{course.assignmentDisplays[1] ?? "-"}</TableCell>
                  </>
                )}
                <CaTestTableCells
                  testCount={course.testCount}
                  test1Display={course.test1Display}
                  test2Display={course.test2Display}
                />
                <TableCell className="px-4 py-3 text-center align-middle">
                  <Badge variant="accent">{course.totalCADisplay}</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function AcademicOverviewView({ data }: { data: StudentAcademicOverview }) {
  if (data.courses.length === 0) {
    return (
      <Card className={`border-dashed ${studentDashboardCardClass}`}>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No enrolled courses yet</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Join a class with your lecturer&apos;s session code to see attendance and continuous
            assessment scores here.
          </p>
          <Link
            href="/student/join"
            className="mt-6 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Join a class
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Student Name</p>
              <p className="text-lg font-semibold">{data.studentName}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">College ID</p>
            <p className="font-mono text-lg">{data.collegeId ?? "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Enrolled Courses</p>
            <p className="text-lg font-semibold">{data.courses.length}</p>
          </div>
        </div>
      </div>

      {data.courses.map((course) => (
        <CourseOverviewSection key={course.enrollmentId} course={course} />
      ))}
    </div>
  );
}
