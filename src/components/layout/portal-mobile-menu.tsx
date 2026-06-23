"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PortalMobileMenuProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel: string;
  panelClassName?: string;
};

/** Full-viewport mobile menu rendered at document body (avoids PWA header clipping). */
export function PortalMobileMenu({
  open,
  onClose,
  children,
  ariaLabel,
  panelClassName,
}: PortalMobileMenuProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="portal-mobile-menu-backdrop fixed inset-0 z-[200] bg-black/30"
        onClick={onClose}
      />
      <aside
        role="menu"
        aria-label={ariaLabel}
        className={cn(
          "portal-mobile-menu-panel fixed inset-0 z-[201] flex flex-col bg-white",
          "pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]",
          "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
          panelClassName
        )}
      >
        {children}
      </aside>
    </>,
    document.body
  );
}
