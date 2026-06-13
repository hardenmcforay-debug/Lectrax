"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadWorkbookBuffer } from "@/lib/lecturer/download-workbook";
import type { StudentTableRow } from "@/types/database";

function fileNameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;

  const match = header.match(/filename="([^"]+)"/i);
  return match?.[1] ?? null;
}

export function StudentPerformanceExportButton({
  sessionId,
  rows,
  testCount,
  assignmentCount,
  disabled = false,
}: {
  sessionId: string;
  rows: StudentTableRow[];
  testCount: number;
  assignmentCount: number;
  disabled?: boolean;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/lecturer/sessions/${sessionId}/export-student-performance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows, assignmentCount, testCount }),
        }
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Export failed.");
      }

      const buffer = await response.arrayBuffer();
      const fileName =
        fileNameFromContentDisposition(response.headers.get("Content-Disposition")) ??
        "StudentPerformance.xlsx";

      downloadWorkbookBuffer(buffer, fileName);
    } catch (err) {
      console.error("[StudentPerformanceExport]", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not export the student performance table. Please try again."
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size={exporting ? "icon" : "default"}
        className={exporting ? "h-9 w-9 shrink-0" : undefined}
        disabled={exporting || disabled}
        onClick={() => void handleExport()}
        aria-label={exporting ? "Exporting student performance" : "Export student performance"}
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Export
          </>
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {disabled && (
        <p className="text-sm text-muted-foreground">Add students to enable export.</p>
      )}
    </div>
  );
}
