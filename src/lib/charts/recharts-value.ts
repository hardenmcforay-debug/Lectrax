import type { TooltipProps, TooltipValueType } from "recharts";

/**
 * Narrow Recharts tooltip/axis values (`number | string | array`) to a finite number.
 */
export function chartValueToNumber(value: TooltipValueType | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (Array.isArray(value) && value.length > 0) {
    return chartValueToNumber(value[0]);
  }
  return 0;
}

/** YAxis `tickFormatter` — Recharts types the tick value as `any`. */
export function chartTickToNumber(value: unknown): number {
  return chartValueToNumber(value as TooltipValueType | undefined);
}

export type ChartTooltipFormatter = NonNullable<TooltipProps["formatter"]>;
