"use client";

import { formatAssignmentDeadline } from "@/lib/assignments/deadline";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export function AssignmentDeadline({
  value,
  prefix,
}: {
  value: string;
  prefix?: string;
}) {
  const hydrated = useHydrated();
  const text = hydrated ? formatAssignmentDeadline(value) : null;

  if (!text) {
    return (
      <span className="text-muted-foreground" suppressHydrationWarning>
        {prefix}
        {"\u00A0"}
      </span>
    );
  }

  return (
    <span suppressHydrationWarning>
      {prefix}
      {text}
    </span>
  );
}
