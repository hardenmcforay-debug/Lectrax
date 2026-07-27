"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top progress indicator during in-app navigations so route changes feel instant.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimers() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    hideTimerRef.current = null;
    tickTimerRef.current = null;
  }

  function startProgress() {
    clearTimers();
    setVisible(true);
    setValue(12);
    tickTimerRef.current = setInterval(() => {
      setValue((current) => {
        if (current >= 88) return current;
        return current + Math.max(1.5, (90 - current) * 0.08);
      });
    }, 120);
  }

  function finishProgress() {
    clearTimers();
    setValue(100);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setValue(0);
    }, 180);
  }

  useEffect(() => {
    finishProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- complete whenever the route settles
  }, [routeKey]);

  useEffect(() => {
    function isInternalNavAnchor(anchor: HTMLAnchorElement): boolean {
      if (anchor.target && anchor.target !== "_self") return false;
      if (anchor.hasAttribute("download")) return false;
      if (anchor.dataset.noTransition === "true") return false;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return false;
      }

      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return false;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          url.hash !== window.location.hash
        ) {
          // Same page hash jump — not a route transition.
          return false;
        }
        return true;
      } catch {
        return false;
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!anchor || !isInternalNavAnchor(anchor)) return;
      startProgress();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      clearTimers();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden"
      role="progressbar"
      aria-hidden
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-accent via-emerald-400 to-primary transition-[width] duration-150 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
