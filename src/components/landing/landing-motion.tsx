"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { useSafeReducedMotion } from "@/lib/hooks/use-safe-reduced-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const heroContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.04,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: EASE },
  },
};

const reducedHeroItemVariants: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0 } },
};

type MotionWrapProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Layout wrapper — no scroll-triggered animation. Always a single DOM node for grid/flex. */
export function LandingReveal({ children, className }: MotionWrapProps) {
  return <div className={className}>{children}</div>;
}

type LandingStaggerProps = {
  children: ReactNode;
  className?: string;
};

/** Layout wrapper — no scroll-triggered stagger. Always a single DOM node for grid/flex. */
export function LandingStagger({ children, className }: LandingStaggerProps) {
  return <div className={className}>{children}</div>;
}

export function LandingStaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function LandingStaggerList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ol className={className}>{children}</ol>;
}

export function LandingStaggerListItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <li className={className}>{children}</li>;
}

/**
 * Hero / page-load stagger — always the same DOM node on server and client.
 * Reduced-motion users get instant (non-animated) variants.
 */
export function HeroStagger({ children, className }: LandingStaggerProps) {
  const reducedMotion = useSafeReducedMotion();

  return (
    <motion.div
      className={className}
      variants={heroContainerVariants}
      initial={reducedMotion ? false : "hidden"}
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function HeroItem({
  children,
  className,
  /** Use outside HeroStagger so the item animates on its own. */
  standalone = false,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  standalone?: boolean;
  delay?: number;
}) {
  const reducedMotion = useSafeReducedMotion();
  const variants = reducedMotion ? reducedHeroItemVariants : heroItemVariants;

  if (standalone) {
    return (
      <motion.div
        className={className}
        variants={variants}
        initial={reducedMotion ? false : "hidden"}
        animate="show"
        transition={reducedMotion ? { duration: 0 } : { delay }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

/** Soft page-enter fade for marketing shells (same DOM node with/without reduced motion). */
export function MarketingPageEnter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reducedMotion = useSafeReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.16, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
