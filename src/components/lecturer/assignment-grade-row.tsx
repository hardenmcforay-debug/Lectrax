"use client";

import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";

export const AssignmentGradeRow = memo(function AssignmentGradeRow({
  enrollmentId,
  name,
  collegeId,
  isManual,
  fileName,
  submittedAt,
  savedGrade,
  value,
  maxScore,
  isDirty,
  disabled,
  hasSubmission,
  onChange,
  onOpenPdf,
}: {
  enrollmentId: string;
  name: string;
  collegeId: string | null;
  isManual: boolean;
  fileName: string | null;
  submittedAt: string | null;
  savedGrade: number | null;
  value: string;
  maxScore: number;
  isDirty: boolean;
  disabled: boolean;
  hasSubmission: boolean;
  onChange: (enrollmentId: string, value: string) => void;
  onOpenPdf: (enrollmentId: string) => void;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(enrollmentId, e.target.value);
    },
    [enrollmentId, onChange]
  );

  const status = savedGrade !== null
    ? "Graded"
    : hasSubmission
      ? "Submitted"
      : isManual
        ? "Manual"
        : "No submission";

  return (
    <TableRow className={isDirty ? "bg-amber-50/50" : undefined}>
      <TableCell className="font-medium">
        {name}
        {isManual && (
          <Badge variant="secondary" className="ml-2">
            Manual
          </Badge>
        )}
      </TableCell>

      <TableCell className="text-sm text-muted-foreground">
        {collegeId ?? <span>-</span>}
      </TableCell>

      <TableCell>
        {hasSubmission ? (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm"
            onClick={() => onOpenPdf(enrollmentId)}
          >
            {fileName ?? "View PDF"}
          </Button>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>

      <TableCell className="text-sm">
        {submittedAt ? new Date(submittedAt).toLocaleString() : <span className="text-muted-foreground">-</span>}
      </TableCell>

      <TableCell className="text-sm">
        {status === "Graded" ? <Badge variant="accent">{status}</Badge> : status}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <Label htmlFor={`grade-${enrollmentId}`} className="sr-only">
            Grade for {name}
          </Label>
          <Input
            id={`grade-${enrollmentId}`}
            type="number"
            min={0}
            max={maxScore}
            className="w-24"
            placeholder={`0–${maxScore}`}
            value={value}
            onChange={handleChange}
            disabled={disabled}
          />
          <span className="text-xs text-muted-foreground">/ {maxScore}</span>
        </div>
      </TableCell>
    </TableRow>
  );
});
