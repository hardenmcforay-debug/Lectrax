"use client";

import { useHydrated } from "@/lib/hooks/use-hydrated";
import { cn } from "@/lib/utils";

type DateMode = "date" | "datetime" | "time";

const SSR_OPTIONS: Record<DateMode, Intl.DateTimeFormatOptions> = {
  date: { dateStyle: "medium", timeZone: "UTC" },
  datetime: { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" },
  time: { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" },
};

const LOCAL_OPTIONS: Record<DateMode, Intl.DateTimeFormatOptions> = {
  date: { dateStyle: "medium" },
  datetime: { dateStyle: "medium", timeStyle: "short" },
  time: { hour: "2-digit", minute: "2-digit", hour12: true },
};

function formatWith(
  value: string | Date,
  mode: DateMode,
  hydrated: boolean
): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", hydrated ? LOCAL_OPTIONS[mode] : SSR_OPTIONS[mode]).format(
    date
  );
}

/**
 * Renders a date that matches on SSR and the hydration pass (UTC/en-US),
 * then switches to the viewer's local timezone after hydrate.
 */
export function ClientDateText({
  value,
  mode = "datetime",
  fallback = "—",
  className,
  prefix,
}: {
  value: string | Date | null | undefined;
  mode?: DateMode;
  fallback?: string;
  className?: string;
  prefix?: string;
}) {
  const hydrated = useHydrated();

  if (value == null || value === "") {
    return <span className={className}>{fallback}</span>;
  }

  const text = formatWith(value, mode, hydrated);
  if (!text) {
    return <span className={className}>{fallback}</span>;
  }

  return (
    <span className={cn(className)} suppressHydrationWarning>
      {prefix}
      {text}
    </span>
  );
}
