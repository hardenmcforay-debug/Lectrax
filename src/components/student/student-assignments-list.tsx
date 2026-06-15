"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StudentAssignmentListItem } from "@/lib/student/assignment-queries";
import { studentDashboardCardClass } from "@/components/student/student-dashboard-styles";
import { AssignmentDeadline } from "@/components/shared/assignment-deadline";
import { AssignmentOpenClosedBadge } from "@/components/shared/assignment-status-badge";
import { useAssignmentPastDeadline } from "@/lib/assignments/use-assignment-past-deadline";

function StudentAssignmentListCard({ assignment }: { assignment: StudentAssignmentListItem }) {
  const pastDeadline = useAssignmentPastDeadline(assignment.deadline, {
    assignmentId: assignment.id,
    initialPastDeadline: assignment.pastDeadline,
  });

  const submissionStatus = useMemo(() => {
    if (assignment.submissionStatus !== "not_submitted") {
      return assignment.submissionStatus;
    }
    return pastDeadline ? ("locked" as const) : ("not_submitted" as const);
  }, [assignment.submissionStatus, pastDeadline]);

  const deadlineBadge = useMemo(() => {
    if (submissionStatus === "not_submitted") {
      return <AssignmentOpenClosedBadge isOpen={!pastDeadline} />;
    }
    return null;
  }, [pastDeadline, submissionStatus]);

  return (
    <Card className={studentDashboardCardClass}>
      <CardHeader>
        <CardTitle className="text-base">
          {assignment.course_code} — {assignment.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          <AssignmentDeadline value={assignment.deadline} prefix="Assignment Due: " />
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {deadlineBadge}
              {submissionStatus === "not_submitted" && !pastDeadline && (
                <p className="text-sm text-muted-foreground">Not submitted</p>
              )}
              {submissionStatus === "not_submitted" && pastDeadline && (
                <p className="text-sm text-muted-foreground">Submission deadline reached</p>
              )}
            </div>
            {submissionStatus === "submitted" && (
              <p className="text-sm text-primary">Submitted</p>
            )}
            {submissionStatus === "locked" && (
              <div className="flex items-center gap-2">
                <AssignmentOpenClosedBadge isOpen={false} />
                {assignment.gradeDisplay && (
                  <p className="text-sm font-medium">{assignment.gradeDisplay}</p>
                )}
              </div>
            )}
            {submissionStatus === "graded" && (
              <div className="flex items-center gap-2">
                <Badge variant="accent">Graded</Badge>
                <p className="text-sm font-medium">{assignment.gradeDisplay}</p>
              </div>
            )}
          </div>
          <Button size="sm" asChild variant="outline">
            <Link href={`/student/assignments/${assignment.id}`}>Open details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentAssignmentsList({
  assignments,
}: {
  assignments: StudentAssignmentListItem[];
}) {
  if (assignments.length === 0) {
    return <p className="text-muted-foreground">No assignments yet.</p>;
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <StudentAssignmentListCard key={assignment.id} assignment={assignment} />
      ))}
    </div>
  );
}
