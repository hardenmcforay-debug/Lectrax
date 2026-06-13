"use client";

import { useEffect, useState } from "react";
import { formatAssignmentDeadline } from "@/lib/assignments/deadline";

export function AssignmentDeadline({
  value,
  prefix,
}: {
  value: string;
  prefix?: string;
}) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setText(formatAssignmentDeadline(value));
  }, [value]);

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
