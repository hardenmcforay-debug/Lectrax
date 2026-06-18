"use client";

import { appFetch } from "@/lib/api/client-fetch";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { studentDashboardCardClass } from "@/components/student/student-dashboard-styles";
import { joinSessionSchema } from "@/lib/validations";
import { sanitizeSessionCode } from "@/lib/security/sanitize";
import { sanitizeErrorMessage } from "@/lib/errors/classify";

export default function JoinClassPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    setError(null);
    setSuccess(null);

    const parsed = joinSessionSchema.safeParse({ sessionCode: code });
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? "Enter a valid session code.");
      return;
    }

    setLoading(true);

    try {
      const res = await appFetch("/api/student/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(parsed.data),
      });

      const result = (await res.json()) as {
        error?: string;
        session?: { courseCode: string; title: string };
      };

      if (!res.ok || !result.session) {
        setError(
          sanitizeErrorMessage(result.error) ?? "Session not found. Check the code and try again."
        );
        return;
      }

      setSuccess(`Joined ${result.session.courseCode} — ${result.session.title}`);
      setTimeout(() => {
        router.push("/student/academic-overview");
      }, 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell role="student" title="Join Class" description="Enter the class session code provided by your lecturer.">
      <div className="flex min-h-full items-center justify-center px-4">
        <Card className={`w-full max-w-md ${studentDashboardCardClass}`}>
        <CardHeader><CardTitle>Session Code</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(sanitizeSessionCode(e.target.value))}
              placeholder="e.g. A3F9B2"
              className="font-mono text-lg tracking-widest"
              maxLength={10}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-accent">{success}</p>}
          <Button variant="accent" className="w-full" onClick={handleJoin} disabled={loading || !code.trim()}>
            {loading ? "Joining..." : "Join Class"}
          </Button>
        </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
