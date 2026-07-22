"use client";

import type { ReactNode } from "react";

type LandingRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Static wrapper — scroll reveal animations removed from the landing page. */
export function LandingReveal({ children, className }: LandingRevealProps) {
  return className ? <div className={className}>{children}</div> : <>{children}</>;
}

type LandingStaggerProps = {
  children: ReactNode;
  className?: string;
};

export function LandingStagger({ children, className }: LandingStaggerProps) {
  return className ? <div className={className}>{children}</div> : <>{children}</>;
}

export function LandingStaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return className ? <div className={className}>{children}</div> : <>{children}</>;
}

export function LandingStaggerList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return className ? <ol className={className}>{children}</ol> : <ol>{children}</ol>;
}

export function LandingStaggerListItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return className ? <li className={className}>{children}</li> : <li>{children}</li>;
}
