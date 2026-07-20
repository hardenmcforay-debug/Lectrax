"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  howItWorksLogos,
  type HowItWorksIconName,
  HOW_IT_WORKS_ICON_NAMES,
} from "@/components/landing/landing-how-it-works-logos";

export { HOW_IT_WORKS_ICON_NAMES, type HowItWorksIconName };

const ease = [0.45, 0, 0.55, 1] as const;

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
  const Logo = howItWorksLogos[iconName];

  return (
    <motion.div
      className={cn(
        "landing-how-icon-shell flex shrink-0 items-center justify-center rounded-full",
        isSmall ? "h-8 w-8 sm:h-9 sm:w-9" : "h-12 w-12 sm:h-14 sm:w-14",
        className
      )}
      animate={reducedMotion ? undefined : motionConfig.animate}
      transition={reducedMotion ? undefined : motionConfig.transition}
    >
      <Logo className={cn("h-full w-full", isSmall ? "drop-shadow-sm" : "drop-shadow-md")} />
    </motion.div>
  );
}
