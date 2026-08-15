"use client";

import { appFetch } from "@/lib/api/client-fetch";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";
import type { ManualStudentListItem } from "@/lib/lecturer/manual-students";
import { cn } from "@/lib/utils";

type RowState = {
  fullName: string;
  savedFullName: string;
  collegeId: string;
  savedCollegeId: string;
  saving: boolean;
  error: string | null;
  savedFlash: boolean;
};

function toRowState(student: ManualStudentListItem): RowState {
  const collegeId = student.collegeId ?? "";
  return {
    fullName: student.fullName,
    savedFullName: student.fullName,
    collegeId,
    savedCollegeId: collegeId,
    saving: false,
    error: null,
    savedFlash: false,
  };
}

function isRowDirty(row: RowState): boolean {
  return (
    row.fullName.trim() !== row.savedFullName.trim() ||
    row.collegeId.trim() !== row.savedCollegeId.trim()
  );
}

export function ManualStudentsManager({
  sessionId,
  initialStudents,
  canWrite,
}: {
  sessionId: string;
  initialStudents: ManualStudentListItem[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [students, setStudents] = useState(initialStudents);
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(initialStudents.map((student) => [student.id, toRowState(student)]))
  );

  const dirtyCount = useMemo(
    () => Object.values(rows).filter(isRowDirty).length,
    [rows]
  );

  const updateRow = useCallback((id: string, patch: Partial<Pick<RowState, "fullName" | "collegeId">>) => {
    setRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
        error: null,
        savedFlash: false,
      },
    }));
  }, []);

  const saveStudent = useCallback(
    async (id: string) => {
      const row = rows[id];
      if (!row || !canWrite || row.saving) return;

      const nextName = row.fullName.trim();
      const nextCollegeId = row.collegeId.trim();
      if (
        nextName === row.savedFullName.trim() &&
        nextCollegeId === row.savedCollegeId.trim()
      ) {
        return;
      }

      setRows((prev) => ({
        ...prev,
        [id]: { ...prev[id], saving: true, error: null, savedFlash: false },
      }));

      try {
        const res = await appFetch(
          `/api/lecturer/sessions/${sessionId}/students/manual/${id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName: nextName,
              collegeId: nextCollegeId || undefined,
            }),
          }
        );

        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          student?: { id: string; fullName: string; collegeId: string | null };
        };

        if (!res.ok || !body.student) {
          setRows((prev) => ({
            ...prev,
            [id]: {
              ...prev[id],
              saving: false,
              error: body.error ?? "Could not update student.",
            },
          }));
          return;
        }

        const savedName = body.student.fullName;
        const savedCollegeId = body.student.collegeId ?? "";
        setStudents((prev) =>
          prev.map((student) =>
            student.id === id
              ? {
                  ...student,
                  fullName: savedName,
                  collegeId: body.student?.collegeId ?? null,
                }
              : student
          )
        );
        setRows((prev) => ({
          ...prev,
          [id]: {
            fullName: savedName,
            savedFullName: savedName,
            collegeId: savedCollegeId,
            savedCollegeId: savedCollegeId,
            saving: false,
            error: null,
            savedFlash: true,
          },
        }));

        // Refresh session tables so name and College ID columns update when the lecturer goes back.
        router.refresh();

        window.setTimeout(() => {
          setRows((prev) => {
            const current = prev[id];
            if (!current) return prev;
            return { ...prev, [id]: { ...current, savedFlash: false } };
          });
        }, 2000);
      } catch {
        setRows((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            saving: false,
            error: "Network error. Please try again.",
          },
        }));
      }
    },
    [canWrite, rows, router, sessionId]
  );

  if (students.length === 0) {
    return (
      <Card className={lecturerPortalCardClass}>
        <CardHeader>
          <CardTitle className="text-base">Manual students</CardTitle>
          <CardDescription>
            No manual students in this class yet. Add one from the Students tab.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!canWrite ? (
        <Card className={cn(lecturerPortalCardClass, "border-amber-200 bg-amber-50")}>
          <CardContent className="py-4 text-sm text-amber-900">
            Your account is in read-only mode. Renew your subscription to update names and college IDs.
          </CardContent>
        </Card>
      ) : null}

      <Card className={lecturerPortalCardClass}>
        <CardHeader>
          <CardTitle className="text-base">Manual students</CardTitle>
          {dirtyCount > 0 ? (
            <CardDescription>
              <span className="text-amber-800">
                {dirtyCount} unsaved {dirtyCount === 1 ? "change" : "changes"}.
              </span>
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="w-full overflow-x-auto rounded-lg border bg-white">
            <Table className="w-full min-w-[36rem]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="min-w-[12rem]">College ID</TableHead>
                  <TableHead className="w-[8rem]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => {
                  const row = rows[student.id] ?? toRowState(student);
                  const dirty = isRowDirty(row);

                  return (
                    <TableRow key={student.id} className={dirty ? "bg-amber-50/60" : undefined}>
                      <TableCell className="text-center text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <Label htmlFor={`full-name-${student.id}`} className="sr-only">
                          Name for {student.fullName}
                        </Label>
                        <Input
                          id={`full-name-${student.id}`}
                          value={row.fullName}
                          placeholder="e.g. Jane Doe"
                          maxLength={120}
                          disabled={!canWrite || row.saving}
                          onChange={(event) =>
                            updateRow(student.id, { fullName: event.target.value })
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void saveStudent(student.id);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Label htmlFor={`college-id-${student.id}`} className="sr-only">
                          College ID for {student.fullName}
                        </Label>
                        <Input
                          id={`college-id-${student.id}`}
                          value={row.collegeId}
                          className="font-mono"
                          maxLength={50}
                          disabled={!canWrite || row.saving}
                          onChange={(event) =>
                            updateRow(student.id, { collegeId: event.target.value })
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void saveStudent(student.id);
                            }
                          }}
                        />
                        {row.error ? (
                          <p className="mt-1 text-xs text-destructive">{row.error}</p>
                        ) : null}
                        {row.savedFlash ? (
                          <p className="mt-1 text-xs font-medium text-accent">Saved</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant={dirty ? "accent" : "outline"}
                          loading={row.saving}
                          disabled={!canWrite || !dirty || row.saving}
                          onClick={() => void saveStudent(student.id)}
                        >
                          {row.saving ? "Saving..." : "Save"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
