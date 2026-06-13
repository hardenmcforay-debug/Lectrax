"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { ClassSession, ClassTest, SemesterType } from "@/types/database";
import { SEMESTER_LABELS } from "@/types/database";
import type { ClassTestSummary } from "@/lib/session-data";
import {
  getCreateTestButtonLabel,
  getCreateTestDialogTitle,
  getDefaultTestTitle,
  getNextTestNumber,
} from "@/lib/ca/test-columns";
import { EMPTY_CA_WEIGHTS, type CAWeights } from "@/lib/ca/constants";

interface CaStructurePanelProps {
  session: ClassSession;
  semester: SemesterType;
  initialClassTests: ClassTestSummary[];
  initialWeights?: CAWeights;
  readOnly?: boolean;
  onWeightsChange?: (weights: CAWeights) => void;
  onCaConfigSaved?: (weights: CAWeights) => void;
}

export function CaStructurePanel({
  session,
  semester,
  initialClassTests,
  readOnly = false,
  onWeightsChange,
  onCaConfigSaved,
}: CaStructurePanelProps) {
  const router = useRouter();
  const [caWeights, setCaWeights] = useState<CAWeights>({ ...EMPTY_CA_WEIGHTS });

  function handleWeightFieldChange(field: keyof CAWeights, rawValue: string) {
    const next = { ...caWeights, [field]: Number(rawValue) };
    setCaWeights(next);
    onWeightsChange?.(next);
  }

  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetWeights, setResetWeights] = useState<CAWeights>(() => ({ ...EMPTY_CA_WEIGHTS }));
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState("Test");
  const [maxScore, setMaxScore] = useState(100);
  const [classTests, setClassTests] = useState(initialClassTests);
  const [deleteTarget, setDeleteTarget] = useState<ClassTestSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [testActionMessage, setTestActionMessage] = useState<string | null>(null);

  useEffect(() => {
    setClassTests(initialClassTests);
  }, [initialClassTests]);

  const activeTestCount = classTests.length;
  const nextTestNumber = useMemo(() => getNextTestNumber(activeTestCount), [activeTestCount]);
  const canCreateTest = nextTestNumber !== null;

  function openCreateDialog() {
    if (!nextTestNumber) return;
    setCreateError(null);
    setTestTitle(getDefaultTestTitle(nextTestNumber));
    setMaxScore(100);
    setCreateOpen(true);
  }

  async function saveCAConfig(
    weights: CAWeights = caWeights
  ): Promise<{ ok: boolean; error?: string }> {
    setConfigError(null);
    setConfigMessage(null);

    setSavingConfig(true);

    try {
      const res = await fetch(`/api/lecturer/sessions/${session.id}/ca-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceWeight: weights.attendance,
          assignmentWeight: weights.assignment,
          testWeight: weights.test,
        }),
      });

      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        const error = data.error ?? "Could not save configuration.";
        setConfigError(error);
        return { ok: false, error };
      }

      setCaWeights({ ...EMPTY_CA_WEIGHTS });
      setConfigMessage(
        data.message ??
          "CA configuration saved. Attendance, grades, and Total C.A have been recalculated with the new weights."
      );
      onCaConfigSaved?.(weights);
      router.refresh();
      return { ok: true };
    } catch {
      const error = "Could not save configuration. Try again.";
      setConfigError(error);
      return { ok: false, error };
    } finally {
      setSavingConfig(false);
    }
  }

  function openResetDialog() {
    setResetError(null);
    setResetWeights({ ...EMPTY_CA_WEIGHTS });
    setResetOpen(true);
  }

  async function handleResetApply() {
    setResetError(null);
    setResetting(true);

    const result = await saveCAConfig(resetWeights);
    setResetting(false);

    if (result.ok) {
      setResetOpen(false);
    } else {
      setResetError(result.error ?? "Could not reset CA weights.");
    }
  }

  const totalCaWeight = caWeights.attendance + caWeights.assignment + caWeights.test;
  const resetTotalCaWeight =
    resetWeights.attendance + resetWeights.assignment + resetWeights.test;

  async function handleCreateTest() {
    if (!nextTestNumber) return;
    setCreateError(null);
    setCreating(true);

    try {
      const res = await fetch(`/api/lecturer/sessions/${session.id}/tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testNumber: nextTestNumber,
          title: testTitle.trim() || getDefaultTestTitle(nextTestNumber),
          maxScore,
        }),
      });

      const data = (await res.json()) as { test?: ClassTest; error?: string };

      if (!res.ok || !data.test) {
        setCreateError(data.error ?? "Could not create test.");
        return;
      }

      setCreateOpen(false);
      router.push(`/lecturer/sessions/${session.id}/tests/${data.test.id}`);
    } catch {
      setCreateError("Network error. Try again.");
    } finally {
      setCreating(false);
    }
  }

  function testListLabel(test: ClassTestSummary) {
    if (activeTestCount >= 2) return `Test ${test.test_number}`;
    return "Test";
  }

  async function handleDeleteTest() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);

    try {
      const res = await fetch(
        `/api/lecturer/sessions/${session.id}/tests/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        renumberedRemainingTest?: boolean;
      };

      if (!res.ok) {
        setDeleteError(data.error ?? "Could not delete test.");
        return;
      }

      setClassTests((prev) => {
        const next = prev.filter((t) => t.id !== deleteTarget.id);
        if (data.renumberedRemainingTest) {
          return next.map((t) =>
            t.test_number === 2
              ? {
                  ...t,
                  test_number: 1,
                  title: t.title === "Test 2" ? "Test" : t.title,
                }
              : t
          );
        }
        return next;
      });

      setDeleteTarget(null);
      setTestActionMessage(data.message ?? "Test deleted successfully.");
      router.refresh();
    } catch {
      setDeleteError("Network error. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  const courseLabel = session.class_name
    ? `${session.course_code} — ${session.class_name}`
    : `${session.course_code} — ${session.title}`;

  return (
    <>
      <Card className={lecturerPortalCardClass}>
        <CardHeader>
          <CardTitle>CA Structure</CardTitle>
          <CardDescription>
            Set continuous assessment weights and create tests for manual score entry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid gap-4 max-w-lg sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Attendance %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={caWeights.attendance}
                onChange={(e) => handleWeightFieldChange("attendance", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Assignment %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={caWeights.assignment}
                onChange={(e) => handleWeightFieldChange("assignment", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Test %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={caWeights.test}
                onChange={(e) => handleWeightFieldChange("test", e.target.value)}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Total C.A scale: {totalCaWeight} points ({totalCaWeight}% weight total)
          </p>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void saveCAConfig()} disabled={savingConfig || readOnly}>
              {savingConfig ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={readOnly || savingConfig || resetting}
              onClick={openResetDialog}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
          {configMessage && <p className="text-sm text-green-700">{configMessage}</p>}
          {configError && <p className="text-sm text-destructive">{configError}</p>}

          <div className="border-t pt-6">
            {readOnly ? (
            <p className="text-sm text-amber-800">
              Your account is in read-only mode. Renew your subscription to create tests or update grades.
            </p>
          ) : (
          <>
          <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold">Create Test</h3>
              <Button
                variant="accent"
                disabled={!canCreateTest}
                onClick={openCreateDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                {getCreateTestButtonLabel(nextTestNumber)}
              </Button>
            </div>

            {testActionMessage && (
              <p className="mt-4 text-sm text-green-700">{testActionMessage}</p>
            )}
            {deleteError && !deleteTarget && (
              <p className="mt-4 text-sm text-destructive">{deleteError}</p>
            )}

            {classTests.length > 0 && (
              <ul className="mt-4 space-y-2">
                {classTests.map((test) => (
                  <li
                    key={test.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {testListLabel(test)}
                        {test.title !== `Test ${test.test_number}` &&
                          test.title !== "Test" &&
                          test.title !== `Test ${test.test_number}` && (
                            <span className="text-muted-foreground"> — {test.title}</span>
                          )}
                      </span>
                      <Badge variant="secondary">Max {test.max_score}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/lecturer/sessions/${session.id}/tests/${test.id}`}>
                          Enter grades
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${testListLabel(test)}`}
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(test);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
          )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={resetOpen} onOpenChange={(open) => !resetting && setResetOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset CA Weights</DialogTitle>
            <DialogDescription>
              Enter new weight percentages. Your existing attendance records, test scores, and
              assignment grades will not be deleted — Total C.A and all contributions will be
              recalculated automatically using the new weights.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="reset-attendance-weight">Attendance %</Label>
              <Input
                id="reset-attendance-weight"
                type="number"
                min={0}
                max={100}
                value={resetWeights.attendance}
                onChange={(e) =>
                  setResetWeights({ ...resetWeights, attendance: Number(e.target.value) })
                }
                disabled={resetting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reset-assignment-weight">Assignment %</Label>
              <Input
                id="reset-assignment-weight"
                type="number"
                min={0}
                max={100}
                value={resetWeights.assignment}
                onChange={(e) =>
                  setResetWeights({ ...resetWeights, assignment: Number(e.target.value) })
                }
                disabled={resetting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reset-test-weight">Test %</Label>
              <Input
                id="reset-test-weight"
                type="number"
                min={0}
                max={100}
                value={resetWeights.test}
                onChange={(e) =>
                  setResetWeights({ ...resetWeights, test: Number(e.target.value) })
                }
                disabled={resetting}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Total C.A scale: {resetTotalCaWeight} points ({resetTotalCaWeight}% weight total)
          </p>
          {resetError && <p className="text-sm text-destructive">{resetError}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button variant="accent" onClick={() => void handleResetApply()} disabled={resetting}>
              {resetting ? "Applying..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{getCreateTestDialogTitle(nextTestNumber)}</DialogTitle>
            <DialogDescription>
              Test scores are recorded manually by the lecturer. This is not an online examination.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="test-name">Test name</Label>
              <Input
                id="test-name"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder={nextTestNumber ? getDefaultTestTitle(nextTestNumber) : "Test"}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="max-score">Maximum score</Label>
              <Input
                id="max-score"
                type="number"
                min={1}
                max={1000}
                value={maxScore}
                onChange={(e) => setMaxScore(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Course / class</Label>
              <Input value={courseLabel} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                {SEMESTER_LABELS[semester]} · {session.academic_year}
              </p>
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button variant="accent" onClick={() => void handleCreateTest()} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Delete {deleteTarget ? testListLabel(deleteTarget) : "test"}?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-left">
              <span className="block">Are you sure you want to delete this test?</span>
              <span className="block">This action cannot be undone.</span>
              <span className="block">
                All grades associated with this test will be permanently removed.
              </span>
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteTest()}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
