"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

type LandingRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function LandingReveal({ children, className, delay = 0 }: LandingRevealProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return className ? <div className={className}>{children}</div> : <>{children}</>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

export const landingStaggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const landingStaggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease },
  },
};

type LandingStaggerProps = {
  children: ReactNode;
  className?: string;
};

export function LandingStagger({ children, className }: LandingStaggerProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return className ? <div className={className}>{children}</div> : <>{children}</>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={landingStaggerContainer}
    >
      {children}
    </motion.div>
  );
}

export function LandingStaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return className ? <div className={className}>{children}</div> : <>{children}</>;
  }

  return (
    <motion.div className={className} variants={landingStaggerItem}>
      {children}
    </motion.div>
  );
}

export function LandingStaggerList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return className ? <ol className={className}>{children}</ol> : <ol>{children}</ol>;
  }

  return (
    <motion.ol
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={landingStaggerContainer}
    >
      {children}
    </motion.ol>
  );
}

export function LandingStaggerListItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return className ? <li className={className}>{children}</li> : <li>{children}</li>;
  }

  return (
    <motion.li className={className} variants={landingStaggerItem}>
      {children}
    </motion.li>
  );
}
