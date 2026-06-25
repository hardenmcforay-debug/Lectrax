"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";
import { BarChart3, BookOpen, UserPlus, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ease = [0.45, 0, 0.55, 1] as const;

export const HOW_IT_WORKS_ICON_NAMES = [
  "user-plus",
  "book-open",
  "users",
  "bar-chart-3",
] as const;

export type HowItWorksIconName = (typeof HOW_IT_WORKS_ICON_NAMES)[number];

const icons: Record<HowItWorksIconName, LucideIcon> = {
  "user-plus": UserPlus,
  "book-open": BookOpen,
  users: Users,
  "bar-chart-3": BarChart3,
};

const iconAnimations: Record<
  string,
  {
    animate: Record<string, number[]>;
    transition: Transition;
  }
> = {
  "01": {
    animate: { y: [0, -3, 0], scale: [1, 1.08, 1] },
    transition: { duration: 2.8, repeat: Infinity, ease },
  },
  "02": {
    animate: { rotate: [-5, 5, -5], y: [0, -2, 0] },
    transition: { duration: 3.2, repeat: Infinity, ease },
  },
  "03": {
    animate: { scale: [1, 1.07, 1], x: [0, 1, 0, -1, 0] },
    transition: { duration: 3, repeat: Infinity, ease },
  },
  "04": {
    animate: { y: [0, -4, 0], scale: [1, 1.06, 1] },
    transition: { duration: 2.6, repeat: Infinity, ease },
  },
};

type LandingHowItWorksIconProps = {
  step: string;
  iconName: HowItWorksIconName;
  size?: "sm" | "lg";
  className?: string;
};

export function LandingHowItWorksIcon({
  step,
  iconName,
  size = "lg",
  className,
}: LandingHowItWorksIconProps) {
  const reducedMotion = useReducedMotion();
  const motionConfig = iconAnimations[step] ?? iconAnimations["01"];
  const isSmall = size === "sm";
  const Icon = icons[iconName];

  return (
    <motion.div
      className={cn(
        "landing-how-icon-shell flex shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm",
        isSmall ? "h-10 w-10 sm:h-11 sm:w-11" : "h-16 w-16 rounded-2xl shadow-md",
        className
      )}
      animate={reducedMotion ? undefined : motionConfig.animate}
      transition={reducedMotion ? undefined : motionConfig.transition}
    >
      <Icon
        className={cn("text-white", isSmall ? "h-5 w-5" : "h-7 w-7")}
        aria-hidden
      />
    </motion.div>
  );
}
