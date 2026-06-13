"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { lecturerPortalCardClass } from "@/components/lecturer/lecturer-dashboard-styles";
import { localDateTimeInputToIso } from "@/lib/assignments/deadline";

export function CreateAssignmentForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createAssignment() {
    if (!title.trim() || !deadline) {
      setError("Title and deadline are required.");
      return;
    }
    const parsedMaxScore = Number(maxScore);
    if (!Number.isFinite(parsedMaxScore) || parsedMaxScore < 1 || parsedMaxScore > 1000) {
      setError("Maximum score must be between 1 and 1000.");
      return;
    }

    setError(null);
    setCreating(true);

    let deadlineIso: string;
    try {
      deadlineIso = localDateTimeInputToIso(deadline);
    } catch {
      setError("Enter a valid deadline date and time.");
      setCreating(false);
      return;
    }

    try {
      const res = await fetch(`/api/lecturer/sessions/${sessionId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          deadline: deadlineIso,
          maxScore: parsedMaxScore,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create assignment.");
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
