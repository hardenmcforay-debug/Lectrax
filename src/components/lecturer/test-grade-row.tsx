"use client";

import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type TestGradeRowProps = {
  enrollmentId: string;
  name: string;
  collegeId: string | null;
  isManual: boolean;
  value: string;
  maxScore: number;
  isDirty: boolean;
  disabled: boolean;
  onChange: (enrollmentId: string, value: string) => void;
};

function TestGradeScoreInput({
  enrollmentId,
  name,
  value,
  maxScore,
  disabled,
  onChange,
  compact = false,
}: {
  enrollmentId: string;
  name: string;
  value: string;
  maxScore: number;
  disabled: boolean;
  onChange: (enrollmentId: string, value: string) => void;
  compact?: boolean;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(enrollmentId, e.target.value);
    },
    [enrollmentId, onChange]
  );

  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", compact ? "justify-end" : "justify-end")}>
      <Label htmlFor={`score-${enrollmentId}`} className="sr-only">
        Score for {name}
      </Label>
      <Input
        id={`score-${enrollmentId}`}
        type="number"
        min={0}
        max={maxScore}
        inputMode="decimal"
        className={cn(
          "min-w-0 tabular-nums",
          compact ? "h-9 w-[4.5rem] px-2 text-sm" : "w-24"
        )}
        placeholder={`0–${maxScore}`}
        value={value}
        onChange={handleChange}
        disabled={disabled}
      />
      <span className="shrink-0 text-xs text-muted-foreground">/ {maxScore}</span>
    </div>
  );
}

export const TestGradeMobileCard = memo(function TestGradeMobileCard({
  enrollmentId,
  name,
  collegeId,
  isManual,
  value,
  maxScore,
  isDirty,
  disabled,
  onChange,
}: TestGradeRowProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-3",
        isDirty && "border-amber-200 bg-amber-50/50"
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 text-sm font-medium leading-snug">{name}</p>
          {isManual && (
            <Badge variant="secondary" className="shrink-0">
              Manual
            </Badge>
          )}
        </div>
        {collegeId ? (
          <p className="break-all font-mono text-xs text-muted-foreground">{collegeId}</p>
        ) : (
          <p className="text-xs text-muted-foreground">No student ID</p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-xs font-medium text-muted-foreground">Score</span>
        <TestGradeScoreInput
          enrollmentId={enrollmentId}
          name={name}
          value={value}
          maxScore={maxScore}
          disabled={disabled}
          onChange={onChange}
          compact
        />
      </div>
    </div>
  );
});

export const TestGradeRow = memo(function TestGradeRow({
  enrollmentId,
  name,
  collegeId,
  isManual,
  value,
  maxScore,
  isDirty,
  disabled,
  onChange,
}: TestGradeRowProps) {
  return (
    <TableRow className={isDirty ? "bg-amber-50/50" : undefined}>
      <TableCell className="px-4 py-3 align-middle font-medium">
        <span className="line-clamp-2">{name}</span>
        {isManual && (
          <Badge variant="secondary" className="ml-2">
            Manual
          </Badge>
        )}
      </TableCell>
      <TableCell className="max-w-[8rem] px-4 py-3 align-middle font-mono text-sm tabular-nums">
        <span className="block truncate">{collegeId ?? "—"}</span>
      </TableCell>
      <TableCell className="whitespace-nowrap px-4 py-3 align-middle text-right">
        <TestGradeScoreInput
          enrollmentId={enrollmentId}
          name={name}
          value={value}
          maxScore={maxScore}
          disabled={disabled}
          onChange={onChange}
        />
      </TableCell>
    </TableRow>
  );
});
