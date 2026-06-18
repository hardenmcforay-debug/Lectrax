"use client";

import { appFetch } from "@/lib/api/client-fetch";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TestGradeMobileCard, TestGradeRow } from "@/components/lecturer/test-grade-row";
import type { TestGradeEntryData } from "@/lib/lecturer/class-tests";
import {
  buildGradeSavePayload,
  countDirtyGrades,
  normalizeGradeInput,
  unsavedGradesLabel,
} from "@/lib/lecturer/grade-entry";
import { SEMESTER_LABELS } from "@/types/database";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";

function scoresFromRows(rows: TestGradeEntryData["rows"]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.enrollmentId] =
      row.score !== null && row.score !== undefined ? String(row.score) : "";
  }
  return map;
}

export function TestGradesClient({
  classSessionId,
  data,
}: {
  classSessionId: string;
  data: TestGradeEntryData;
}) {
  const router = useRouter();
  const { test, session, rows } = data;
  const maxScore = Number(test.max_score);
  const enrollmentIds = useMemo(
    () => rows.map((r) => r.enrollmentId),
    [rows]
  );

  const serverScores = useMemo(() => scoresFromRows(rows), [rows]);
  const [scores, setScores] = useState(serverScores);
  const [savedScores, setSavedScores] = useState(serverScores);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setScores(serverScores);
    setSavedScores(serverScores);
  }, [serverScores]);

  const dirtyCount = useMemo(
    () => countDirtyGrades(enrollmentIds, scores, savedScores),
    [enrollmentIds, scores, savedScores]
  );

  const dirtyByEnrollment = useMemo(() => {
    const map = new Set<string>();
    for (const id of enrollmentIds) {
      if (normalizeGradeInput(scores[id] ?? "") !== normalizeGradeInput(savedScores[id] ?? "")) {
        map.add(id);
      }
    }
    return map;
  }, [enrollmentIds, scores, savedScores]);

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

  const updateScore = useCallback((enrollmentId: string, value: string) => {
    startTransition(() => {
      setScores((prev) => ({ ...prev, [enrollmentId]: value }));
    });
    setSuccess(null);
    setError(null);
  }, []);

  async function saveAllGrades() {
    setError(null);
    setSuccess(null);

    const { payload, error: validationError } = buildGradeSavePayload(
      enrollmentIds,
      scores,
      savedScores,
      maxScore
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!payload) {
      setError("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      const res = await appFetch(
        `/api/lecturer/sessions/${classSessionId}/tests/${test.id}/scores`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const body = (await res.json()) as { error?: string; saved?: number; deleted?: number };

      if (!res.ok) {
        setError(body.error ?? "Could not save grades.");
        return;
      }

      setSavedScores({ ...scores });
      setSuccess("Grades saved successfully.");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const courseLabel = session.class_name
    ? `${session.course_code} — ${session.class_name}`
    : `${session.course_code} — ${session.title}`;

  return (
    <div className="space-y-6">
      <Card className={lecturerPortalCardClass}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{test.title}</CardTitle>
              <CardDescription className="mt-1">
                {courseLabel} · {SEMESTER_LABELS[session.semester]} · {session.academic_year}
              </CardDescription>
            </div>
            <Badge variant="secondary">Max score: {maxScore}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enter or edit scores for all students, then click Save All.
          </p>
        </CardContent>
      </Card>

      <Card className={lecturerPortalCardClass}>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Grade entry</CardTitle>
            {unsavedLabel && (
              <p className="text-sm font-medium text-amber-700">{unsavedLabel}</p>
            )}
          </div>
          <Button
            variant="accent"
            size="default"
            disabled={saving || dirtyCount === 0}
            onClick={() => void saveAllGrades()}
          >
            {saving ? "Saving..." : "Save All"}
          </Button>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students enrolled. Add students on the session Students tab first.
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {rows.map((row) => (
                  <TestGradeMobileCard
                    key={row.enrollmentId}
                    enrollmentId={row.enrollmentId}
                    name={row.name}
                    collegeId={row.collegeId}
                    isManual={row.isManual}
                    value={scores[row.enrollmentId] ?? ""}
                    maxScore={maxScore}
                    isDirty={dirtyByEnrollment.has(row.enrollmentId)}
                    disabled={saving}
                    onChange={updateScore}
                  />
                ))}
              </div>
              <div className="portal-table-scroll hidden rounded-lg border bg-white md:block">
                <Table className="min-w-[32rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[10rem] px-4 py-3 align-middle">
                        Student name
                      </TableHead>
                      <TableHead className="min-w-[7rem] px-4 py-3 align-middle">
                        Student ID
                      </TableHead>
                      <TableHead className="min-w-[9rem] px-4 py-3 text-right align-middle">
                        Score
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TestGradeRow
                        key={row.enrollmentId}
                        enrollmentId={row.enrollmentId}
                        name={row.name}
                        collegeId={row.collegeId}
                        isManual={row.isManual}
                        value={scores[row.enrollmentId] ?? ""}
                        maxScore={maxScore}
                        isDirty={dirtyByEnrollment.has(row.enrollmentId)}
                        disabled={saving}
                        onChange={updateScore}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {success && <p className="mt-3 text-sm text-green-700">{success}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
