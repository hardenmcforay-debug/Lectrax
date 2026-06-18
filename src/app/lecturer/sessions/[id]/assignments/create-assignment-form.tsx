import { appFetch } from "@/lib/api/client-fetch";
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";
import { localDateTimeInputToIso } from "@/lib/assignments/deadline";
import { assignmentSchema } from "@/lib/validations";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

export function CreateAssignmentForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createAssignment() {
    let deadlineIso: string;
    try {
      deadlineIso = localDateTimeInputToIso(deadline);
    } catch {
      setError("Enter a valid deadline date and time.");
      return;
    }

    const parsed = assignmentSchema.safeParse({
      title,
      description: description || undefined,
      deadline: deadlineIso,
      maxScore,
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Invalid assignment details.");
      return;
    }

    setError(null);
    setCreating(true);

    try {
      const res = await appFetch(`/api/lecturer/sessions/${sessionId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(sanitizeErrorMessage(data.error) ?? "Could not create assignment.");
        return;
      }

      router.push(`/lecturer/sessions/${sessionId}?tab=assignments`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card className={lecturerPortalCardClass}>
        <CardHeader>
          <CardTitle>New Assignment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="assignment-title">Title</Label>
              <Input
                id="assignment-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Essay 1"
                disabled={creating}
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assignment-deadline">Deadline</Label>
              <Input
                id="assignment-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={creating}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="assignment-max-score">Maximum score</Label>
              <Input
                id="assignment-max-score"
                type="number"
                min={1}
                max={1000}
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                disabled={creating}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="assignment-description">Description</Label>
            <textarea
              id="assignment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions, requirements, or notes for students"
              rows={4}
              disabled={creating}
              maxLength={10000}
              className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-fit" onClick={() => void createAssignment()} disabled={creating}>
            {creating ? "Creating..." : "Create Assignment"}
          </Button>
        </CardContent>
      </Card>
  );
}
