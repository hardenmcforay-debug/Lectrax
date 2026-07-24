"use client";

import { appFetch } from "@/lib/api/client-fetch";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";

import { useRouter } from "next/navigation";

import { Trash2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";

import type { AssignmentGradeEntryData } from "@/lib/lecturer/class-assignments";

import { AssignmentGradeRow } from "@/components/lecturer/assignment-grade-row";

import {
  buildGradeSavePayload,
  countDirtyGrades,
  normalizeGradeInput,
  unsavedGradesLabel,
} from "@/lib/lecturer/grade-entry";

import { SEMESTER_LABELS } from "@/types/database";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";
import {
  AssignmentSubmissionPdfViewer,
  type AssignmentSubmissionViewerData,
} from "@/components/lecturer/assignment-submission-pdf-viewer";

function gradesFromRows(
  rows: AssignmentGradeEntryData["rows"],
): Record<string, string> {
  const map: Record<string, string> = {};

  for (const row of rows) {
    map[row.enrollmentId] =
      row.grade !== null && row.grade !== undefined ? String(row.grade) : "";
  }

  return map;
}

export function AssignmentGradesClient({
  classSessionId,

  data,
}: {
  classSessionId: string;

  data: AssignmentGradeEntryData;
}) {
  const router = useRouter();

  const { assignment, session, rows } = data;

  const maxScore = Number(assignment.max_score);

  const enrollmentIds = useMemo(() => rows.map((r) => r.enrollmentId), [rows]);

  const serverGrades = useMemo(() => gradesFromRows(rows), [rows]);

  const [grades, setGrades] = useState(serverGrades);

  const [savedGrades, setSavedGrades] = useState(serverGrades);

  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const gradesActionInFlightRef = useRef(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const [pdfViewer, setPdfViewer] = useState<AssignmentSubmissionViewerData | null>(
    null,
  );

  const submittedRows = useMemo(
    () => rows.filter((r) => r.hasSubmission),
    [rows],
  );

  const allSubmittedGraded = useMemo(
    () =>
      submittedRows.length > 0 &&
      submittedRows.every((r) => r.grade !== null && r.grade !== undefined),

    [submittedRows],
  );

  useEffect(() => {
    setGrades(serverGrades);

    setSavedGrades(serverGrades);
  }, [serverGrades]);

  const dirtyCount = useMemo(
    () => countDirtyGrades(enrollmentIds, grades, savedGrades),

    [enrollmentIds, grades, savedGrades],
  );

  const dirtyByEnrollment = useMemo(() => {
    const map = new Set<string>();

    for (const id of enrollmentIds) {
      if (
        normalizeGradeInput(grades[id] ?? "") !==
        normalizeGradeInput(savedGrades[id] ?? "")
      ) {
        map.add(id);
      }
    }

    return map;
  }, [enrollmentIds, grades, savedGrades]);

  const unsavedLabel = unsavedGradesLabel(dirtyCount);

  useEffect(() => {
    if (dirtyCount === 0) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();

      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyCount]);

  const updateGrade = useCallback((enrollmentId: string, value: string) => {
    startTransition(() => {
      setGrades((prev) => ({ ...prev, [enrollmentId]: value }));
    });

    setSuccess(null);

    setError(null);
  }, []);

  const courseLabel = session.class_name
    ? `${session.course_code} — ${session.class_name}`
    : `${session.course_code} — ${session.title}`;

  const openPdf = useCallback(
    (enrollmentId: string) => {
      const row = rows.find((r) => r.enrollmentId === enrollmentId);

      if (!row?.hasSubmission) {
        setError("Could not open submission PDF.");
        return;
      }

      setError(null);
      setPdfViewer({
        enrollmentId,
        studentName: row.name,
        studentId: row.collegeId,
        assignmentTitle: assignment.title,
        submittedAt: row.submittedAt,
        fileName: row.fileName,
        viewUrl: `/api/lecturer/sessions/${classSessionId}/assignments/${assignment.id}/submissions/download?enrollmentId=${enrollmentId}`,
      });
    },
    [assignment.id, assignment.title, classSessionId, rows],
  );

  const saveViewerGrade = useCallback(async () => {
    if (!pdfViewer || saving || deleting || gradesActionInFlightRef.current) return;

    setError(null);
    setSuccess(null);

    const { payload, error: validationError } = buildGradeSavePayload(
      [pdfViewer.enrollmentId],
      grades,
      savedGrades,
      maxScore,
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!payload) {
      setError("No grade changes to save.");
      return;
    }

    gradesActionInFlightRef.current = true;
    setSaving(true);

    try {
      const res = await appFetch(
        `/api/lecturer/sessions/${classSessionId}/assignments/${assignment.id}/grades`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Could not save grade.");
        return;
      }

      setSavedGrades({ ...grades });
      setSuccess("Grade saved successfully.");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      gradesActionInFlightRef.current = false;
      setSaving(false);
    }
  }, [
    assignment.id,
    classSessionId,
    deleting,
    grades,
    maxScore,
    pdfViewer,
    router,
    savedGrades,
    saving,
  ]);

  const viewerGrading = useMemo(() => {
    if (!pdfViewer) return null;

    const savedRaw = normalizeGradeInput(savedGrades[pdfViewer.enrollmentId] ?? "");
    const savedGrade = savedRaw === "" ? null : Number(savedRaw);

    return {
      value: grades[pdfViewer.enrollmentId] ?? "",
      savedGrade: Number.isNaN(savedGrade) ? null : savedGrade,
      maxScore,
      isDirty: dirtyByEnrollment.has(pdfViewer.enrollmentId),
      saving,
      disabled: saving || deleting,
      onChange: (value: string) => updateGrade(pdfViewer.enrollmentId, value),
      onSave: () => void saveViewerGrade(),
    };
  }, [
    deleting,
    dirtyByEnrollment,
    grades,
    maxScore,
    pdfViewer,
    saveViewerGrade,
    savedGrades,
    saving,
    updateGrade,
  ]);

  async function saveAllGrades() {
    if (saving || deleting || gradesActionInFlightRef.current) return;

    setError(null);

    setSuccess(null);

    const { payload, error: validationError } = buildGradeSavePayload(
      enrollmentIds,

      grades,

      savedGrades,

      maxScore,
    );

    if (validationError) {
      setError(validationError);

      return;
    }

    if (!payload) {
      setError("No grade changes to save.");

      return;
    }

    gradesActionInFlightRef.current = true;
    setSaving(true);

    try {
      const res = await appFetch(
        `/api/lecturer/sessions/${classSessionId}/assignments/${assignment.id}/grades`,

        {
          method: "PUT",

          headers: { "Content-Type": "application/json" },

          body: JSON.stringify(payload),
        },
      );

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;

        saved?: number;

        deleted?: number;
      };

      if (!res.ok) {
        setError(body.error ?? "Could not save grades.");

        return;
      }

      setSavedGrades({ ...grades });

      setSuccess("Grades saved successfully.");

      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      gradesActionInFlightRef.current = false;
      setSaving(false);
    }
  }

  async function deleteAllSubmissions() {
    if (saving || deleting || gradesActionInFlightRef.current) return;

    if (!allSubmittedGraded) {
      setError(
        "All submitted students must be graded before deleting submissions.",
      );

      return;
    }

    const confirmed = window.confirm(
      "Delete all submissions for this assignment? This removes PDF files from storage and cannot be undone.",
    );

    if (!confirmed) return;

    setError(null);

    setSuccess(null);

    gradesActionInFlightRef.current = true;
    setDeleting(true);

    try {
      const res = await appFetch(
        `/api/lecturer/sessions/${classSessionId}/assignments/${assignment.id}/submissions`,

        { method: "DELETE" },
      );

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        deleted?: number;
      };

      if (!res.ok) {
        setError(body.error ?? "Could not delete submissions.");

        return;
      }

      setSuccess(`Deleted ${body.deleted ?? 0} submission(s).`);

      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      gradesActionInFlightRef.current = false;
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className={lecturerPortalCardClass}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{assignment.title}</CardTitle>

              <CardDescription className="mt-1">
                {courseLabel} · {SEMESTER_LABELS[session.semester]} ·{" "}
                {session.academic_year}
              </CardDescription>
            </div>

            <Badge variant="secondary">Max score: {maxScore}</Badge>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">
            Review student PDFs, enter grades for all enrolled students (including those
            who did not submit), then optionally delete all submissions once marking is complete.
          </p>
        </CardContent>
      </Card>

      <Card className={lecturerPortalCardClass}>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Grade entry</CardTitle>

            {unsavedLabel && (
              <p className="text-sm font-medium text-amber-700">
                {unsavedLabel}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="accent"
              loading={saving}
              disabled={deleting || dirtyCount === 0}
              onClick={() => void saveAllGrades()}
            >
              {saving ? "Saving..." : "Save All"}
            </Button>

            {submittedRows.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                loading={deleting}
                disabled={saving || !allSubmittedGraded || dirtyCount > 0}
                aria-label={
                  deleting
                    ? "Deleting all submissions"
                    : "Delete all submissions"
                }
                onClick={() => void deleteAllSubmissions()}
              >
                {deleting ? null : <Trash2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students enrolled. Add students on the session Students tab
              first.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>

                    <TableHead>ID</TableHead>

                    <TableHead>File</TableHead>

                    <TableHead>Submission Date</TableHead>

                    <TableHead>Status</TableHead>

                    <TableHead className="text-right">Grade</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((row) => (
                    <AssignmentGradeRow
                      key={row.enrollmentId}
                      enrollmentId={row.enrollmentId}
                      name={row.name}
                      collegeId={row.collegeId}
                      isManual={row.isManual}
                      fileName={row.fileName}
                      submittedAt={row.submittedAt}
                      savedGrade={row.grade}
                      value={grades[row.enrollmentId] ?? ""}
                      maxScore={maxScore}
                      isDirty={dirtyByEnrollment.has(row.enrollmentId)}
                      disabled={saving || deleting}
                      hasSubmission={row.hasSubmission}
                      onChange={updateGrade}
                      onOpenPdf={(id) => void openPdf(id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          {success && <p className="mt-3 text-sm text-green-700">{success}</p>}
        </CardContent>
      </Card>

      <AssignmentSubmissionPdfViewer
        open={pdfViewer !== null}
        data={pdfViewer}
        grading={viewerGrading}
        onClose={() => setPdfViewer(null)}
      />
    </div>
  );
}
