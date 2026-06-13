"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function LecturerPageEnter({
  children,
  disableEnterAnimation,
}: {
  children: ReactNode;
  disableEnterAnimation?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className={disableEnterAnimation ? undefined : "lecturer-page-enter lecturer-stagger"}
    >
      {children}
    </div>
  );
}
