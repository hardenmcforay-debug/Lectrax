"use client";

import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";

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
}: {
  enrollmentId: string;
  name: string;
  collegeId: string | null;
  isManual: boolean;
  value: string;
  maxScore: number;
  isDirty: boolean;
  disabled: boolean;
  onChange: (enrollmentId: string, value: string) => void;
}) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(enrollmentId, e.target.value);
    },
    [enrollmentId, onChange]
  );

  return (
    <TableRow className={isDirty ? "bg-amber-50/50" : undefined}>
      <TableCell className="px-4 py-3 align-middle font-medium">
        {name}
        {isManual && (
          <Badge variant="secondary" className="ml-2">
            Manual
          </Badge>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 align-middle font-mono text-sm tabular-nums">
        {collegeId ?? "—"}
      </TableCell>
      <TableCell className="px-4 py-3 align-middle text-right">
        <div className="flex items-center justify-end gap-2">
          <Label htmlFor={`score-${enrollmentId}`} className="sr-only">
            Score for {name}
          </Label>
          <Input
            id={`score-${enrollmentId}`}
            type="number"
            min={0}
            max={maxScore}
            className="w-28"
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
