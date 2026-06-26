"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatFileSize, MAX_SUBMISSION_FILE_SIZE } from "@/lib/assignments/storage";
import { validateSubmissionFile } from "@/lib/assignments/submission-validation";
import { uploadFormDataWithProgress } from "@/lib/api/upload-with-progress";
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
import {
  AssignmentUploadOverlay,
  type AssignmentUploadOverlayPhase,
} from "@/components/student/assignment-upload-overlay";

const SUCCESS_DISPLAY_MS = 2200;

export function StudentAssignmentDetailClient({
  assignmentId,
  initial,
}: {
  assignmentId: string;
  initial: StudentAssignmentDetailData;
}) {
  const router = useRouter();
  const { assignment, submission, grade, downloadUrl } = initial;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInFlightRef = useRef(false);
  const successTimerRef = useRef<number | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayPhase, setOverlayPhase] = useState<AssignmentUploadOverlayPhase>("uploading");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  const handleDeadlinePassed = useCallback(() => {
    uploadInFlightRef.current = false;
    setOverlayOpen(false);
    setSelectedFile(null);
    clearSuccessTimer();
    router.refresh();
  }, [clearSuccessTimer, router]);

  const pastDeadline = useAssignmentPastDeadline(assignment.deadline, {
    assignmentId,
    initialPastDeadline: initial.pastDeadline,
    onDeadlinePassed: handleDeadlinePassed,
  });

  useEffect(() => {
    if (pastDeadline) {
      uploadInFlightRef.current = false;
      setOverlayOpen(false);
      setSelectedFile(null);
      clearSuccessTimer();
    }
  }, [clearSuccessTimer, pastDeadline]);

  useEffect(() => {
    return () => {
      clearSuccessTimer();
    };
  }, [clearSuccessTimer]);

  const submissionStatus = useMemo(() => {
    if (!submission) {
      return pastDeadline ? ("locked" as const) : ("not_submitted" as const);
    }
    if (grade !== null) return "graded" as const;
    if (submission.submission_status === "locked" || pastDeadline) return "locked" as const;
    return "submitted" as const;
  }, [submission, grade, pastDeadline]);

  const canUpload = !submission && !pastDeadline;
  const isUploading = overlayOpen && overlayPhase === "uploading";

  const gradeDisplay = useMemo(() => {
    if (grade === null) return null;
    return `${grade}/${Number(assignment.max_score)}`;
  }, [assignment.max_score, grade]);

  function handleFileSelect(file: File | null) {
    if (!file || isUploading) return;

    const error = validateSubmissionFile(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
  }

  const submitAssignment = useCallback(async () => {
    if (!selectedFile || uploadInFlightRef.current) return;

    if (!canUpload || pastDeadline) {
      setValidationError(
        submission
          ? "You have already submitted this assignment. You cannot upload again."
          : ASSIGNMENT_CLOSED_MESSAGE
      );
      return;
    }

    uploadInFlightRef.current = true;
    setValidationError(null);
    setOverlayPhase("uploading");
    setUploadProgress(0);
    setOverlayOpen(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const result = await uploadFormDataWithProgress(
        `/api/student/assignments/${assignmentId}/submit`,
        formData,
        {
          onProgress: (percent) => {
            setUploadProgress(percent);
          },
        }
      );

      if (!result.ok) {
        setOverlayPhase("failed");
        return;
      }

      setOverlayPhase("success");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      clearSuccessTimer();
      successTimerRef.current = window.setTimeout(() => {
        setOverlayOpen(false);
        setUploadProgress(null);
        router.refresh();
      }, SUCCESS_DISPLAY_MS);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setOverlayOpen(false);
        setUploadProgress(null);
        return;
      }
      setOverlayPhase("failed");
    } finally {
      uploadInFlightRef.current = false;
    }
  }, [
    assignmentId,
    canUpload,
    clearSuccessTimer,
    pastDeadline,
    router,
    selectedFile,
    submission,
  ]);

  function handleRetryUpload() {
    if (!selectedFile) {
      setOverlayOpen(false);
      setUploadProgress(null);
      return;
    }
    void submitAssignment();
  }

  function handleDismissUploadFailure() {
    setOverlayOpen(false);
    setUploadProgress(null);
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
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                disabled={isUploading || pastDeadline}
              />
              {selectedFile ? (
                <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm">
                  <p className="font-medium text-foreground">Selected file</p>
                  <p className="text-muted-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              ) : null}
              <Button
                type="button"
                variant="accent"
                className="w-full sm:w-auto"
                disabled={!selectedFile || isUploading || pastDeadline}
                onClick={() => void submitAssignment()}
              >
                Submit Assignment
              </Button>
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

      {validationError && (
        <p className="whitespace-pre-line text-sm text-destructive">{validationError}</p>
      )}

      <AssignmentUploadOverlay
        open={overlayOpen}
        phase={overlayPhase}
        progress={uploadProgress}
        onRetry={handleRetryUpload}
        onDismiss={handleDismissUploadFailure}
      />
    </div>
  );
}
