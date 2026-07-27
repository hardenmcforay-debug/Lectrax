"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSafeReducedMotion } from "@/lib/hooks/use-safe-reduced-motion";

type ProductMediaMotionProps = {
  children: ReactNode;
  className?: string;
  /** Stagger entrance for grids/lists. */
  delay?: number;
  /** Continuous gentle float after entrance. Default true. */
  float?: boolean;
  /** Use a slightly stronger float for hero media. */
  intensity?: "soft" | "hero";
};

/**
 * Entrance + optional float for product page images/illustrations.
 * Always the same DOM node on server and client (no div vs motion.div branch).
 */
export function ProductMediaMotion({
  children,
  className,
  delay = 0,
  float = true,
  intensity = "soft",
}: ProductMediaMotionProps) {
  const reducedMotion = useSafeReducedMotion();
  const floatDistance = intensity === "hero" ? -10 : -6;
  const floatDuration = intensity === "hero" ? 4.5 : 3.8;

  return (
    <motion.div
      className={cn("will-change-transform", className)}
      initial={reducedMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              duration: 0.55,
              delay,
              ease: [0.22, 1, 0.36, 1],
            }
      }
    >
      {float && !reducedMotion ? (
        <motion.div
          className="h-full w-full"
          animate={{ y: [0, floatDistance, 0] }}
          transition={{
            duration: floatDuration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay + 0.4,
          }}
        >
          {children}
        </motion.div>
      ) : (
        children
      )}
    </motion.div>
  );
}
