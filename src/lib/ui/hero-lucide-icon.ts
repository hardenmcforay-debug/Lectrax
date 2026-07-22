import type { LucideProps } from "lucide-react";

/** Matches landing hero Lucide outline icons. */
export const HERO_LUCIDE_ICON_PROPS = {
  strokeWidth: 2,
  absoluteStrokeWidth: true,
} as const satisfies Pick<LucideProps, "strokeWidth" | "absoluteStrokeWidth">;
