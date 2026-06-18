import { appFetch } from "@/lib/api/client-fetch";
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFileSize, MAX_SUBMISSION_FILE_SIZE } from "@/lib/assignments/storage";
import { validateSubmissionFile } from "@/lib/assignments/submission-validation";
import { sanitizeErrorMessage } from "@/lib/errors/classify";
import type { StudentAssignmentDetailData } from "@/lib/student/assignment-queries";
import { studentDashboardCardClass } from "@/components/student/student-dashboard-styles";
import { AssignmentDeadline } from "@/components/shared/assignment-deadline";
import { AssignmentOpenClosedBadge } from "@/components/shared/assignment-status-badge";
import { useAssignmentPastDeadline } from "@/lib/assignments/use-assignment-past-deadline";
import {
  ASSIGNMENT_CLOSED_MESSAGE,
  ASSIGNMENT_CLOSED_TITLE,
  ASSIGNMENT_OPEN_MESSAGE,
  ASSIGNMENT_OPEN_TITLE,
} from "@/lib/assignments/deadline-messages";

export function StudentAssignmentDetailClient({
  assignmentId,
  initial,
}: {
  assignmentId: string;
  initial: StudentAssignmentDetailData;
}) {
  const router = useRouter();
  const { assignment, submission, grade, downloadUrl } = initial;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDeadlinePassed = useCallback(() => {
    setUploading(false);
    setSuccess(null);
    router.refresh();
  }, [router]);

  const pastDeadline = useAssignmentPastDeadline(assignment.deadline, {
    assignmentId,
    initialPastDeadline: initial.pastDeadline,
    onDeadlinePassed: handleDeadlinePassed,
  });

  useEffect(() => {
    if (pastDeadline) {
      setUploading(false);
    }
  }, [pastDeadline]);

  const submissionStatus = useMemo(() => {
    if (!submission) {
      return pastDeadline ? ("locked" as const) : ("not_submitted" as const);
    }
    if (grade !== null) return "graded" as const;
    if (submission.submission_status === "locked" || pastDeadline) return "locked" as const;
    return "submitted" as const;
  }, [submission, grade, pastDeadline]);

  const canUpload = !submission && !pastDeadline;

  const gradeDisplay = useMemo(() => {
    if (grade === null) return null;
    return `${grade}/${Number(assignment.max_score)}`;
  }, [assignment.max_score, grade]);

  async function handleFile(file: File | null) {
    if (!file) return;

    const validationError = validateSubmissionFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!canUpload || pastDeadline) {
      setError(
        submission
          ? "You have already submitted this assignment. You cannot upload again."
          : ASSIGNMENT_CLOSED_MESSAGE
      );
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await appFetch(`/api/student/assignments/${assignmentId}/submit`, {
        method: "POST",
        body: formData,
      });

      const body = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        throw new Error(
          sanitizeErrorMessage(body.error) ?? "Could not upload submission."
        );
      }

      setSuccess("Submission uploaded successfully.");
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? sanitizeErrorMessage(e.message)
          : "Could not upload submission."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className={studentDashboardCardClass}>
        <CardHeader>
          <CardTitle className="text-base">{assignment.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            <AssignmentDeadline value={assignment.deadline} prefix="Assignment Due: " />
          </p>
          {assignment.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm">{assignment.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {!submission && (
              <AssignmentOpenClosedBadge isOpen={!pastDeadline} />
            )}
            {submissionStatus === "not_submitted" && pastDeadline && (
              <Badge variant="outline">Submission deadline reached</Badge>
            )}
            {submissionStatus === "submitted" && (
              <Badge variant="secondary">Submitted</Badge>
            )}
            {submissionStatus === "locked" && submission && (
              <AssignmentOpenClosedBadge isOpen={false} />
            )}
            {submissionStatus === "graded" && <Badge variant="accent">Graded</Badge>}
            {gradeDisplay && <span className="font-medium">{gradeDisplay}</span>}
          </div>

          {submission && (
            <dl className="grid gap-1 text-sm">
              <div>
                <dt className="inline font-medium">File: </dt>
                <dd className="inline text-muted-foreground">
                  {submission.file_name ?? "submission.pdf"}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium">Submitted: </dt>
                <dd className="inline text-muted-foreground">
                  {new Date(submission.submitted_at).toLocaleString()}
                </dd>
              </div>
              {submission.file_size > 0 && (
                <div>
                  <dt className="inline font-medium">Size: </dt>
                  <dd className="inline text-muted-foreground">
                    {formatFileSize(submission.file_size)}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {downloadUrl && (
            <div>
              <Button variant="link" className="h-auto p-0" asChild>
                <a href={downloadUrl} target="_blank" rel="noreferrer">
                  View your uploaded PDF
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={studentDashboardCardClass}>
        <CardHeader>
          <CardTitle className="text-base">
            {canUpload ? ASSIGNMENT_OPEN_TITLE : ASSIGNMENT_CLOSED_TITLE}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {canUpload ? (
            <>
              <p className="text-sm text-muted-foreground">{ASSIGNMENT_OPEN_MESSAGE}</p>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                disabled={uploading || pastDeadline}
              />
              <p className="text-xs text-muted-foreground">
                PDF only, maximum {formatFileSize(MAX_SUBMISSION_FILE_SIZE)}. You can submit once
                per assignment. Submissions close automatically at the due time.
              </p>
            </>
          ) : submission ? (
            <p className="text-sm text-muted-foreground">
              You have already submitted this assignment. Further uploads are not allowed.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">{ASSIGNMENT_CLOSED_MESSAGE}</p>
          )}
        </CardContent>
      </Card>

      {error && <p className="whitespace-pre-line text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}
    </div>
  );
}
