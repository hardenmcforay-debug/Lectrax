"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

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
 * Hero / page-load stagger — animates on mount (not scroll),
 * so the first viewport reveals in sequence.
 */
export function HeroStagger({ children, className }: LandingStaggerProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={heroContainerVariants}
      initial="hidden"
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
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  if (standalone) {
    return (
      <motion.div
        className={className}
        variants={heroItemVariants}
        initial="hidden"
        animate="show"
        transition={{ delay }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div className={className} variants={heroItemVariants}>
      {children}
    </motion.div>
  );
}

/** Soft page-enter fade for marketing shells (no layout shift). */
export function MarketingPageEnter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
