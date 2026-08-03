"use client";

import type { ReactNode } from "react";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

/**
 * Defers Radix Select until after hydration so server/client aria-controls IDs match.
 * Shows a static trigger-sized placeholder on the SSR/hydration pass.
 */
export function DeferredSelect({
  children,
  placeholderLabel,
  className,
  triggerClassName,
}: {
  children: ReactNode;
  placeholderLabel: string;
  className?: string;
  triggerClassName?: string;
}) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className={className}>
        <div
          aria-hidden
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground",
            triggerClassName
          )}
        >
          <span className="truncate">{placeholderLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}
