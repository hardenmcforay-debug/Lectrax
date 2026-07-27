"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && "startViewTransition" in document;
}

/**
 * Intercepts same-origin link navigations and runs them inside the browser
 * View Transitions API for fast crossfades. Falls back to normal Next.js
 * client navigation when unsupported or when the user prefers reduced motion.
 */
export function ViewTransitionNav({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pendingRef = useRef(false);

  useEffect(() => {
    function prefersReducedMotion(): boolean {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function isInternalNavAnchor(anchor: HTMLAnchorElement): boolean {
      if (anchor.target && anchor.target !== "_self") return false;
      if (anchor.hasAttribute("download")) return false;
      if (anchor.dataset.noTransition === "true") return false;

      const hrefAttr = anchor.getAttribute("href");
      if (
        !hrefAttr ||
        hrefAttr.startsWith("#") ||
        hrefAttr.startsWith("mailto:") ||
        hrefAttr.startsWith("tel:")
      ) {
        return false;
      }

      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return false;
        return (
          url.pathname !== window.location.pathname ||
          url.search !== window.location.search
        );
      } catch {
        return false;
      }
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!supportsViewTransitions() || prefersReducedMotion()) return;
      if (pendingRef.current) return;

      const anchor = (event.target as Element | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!anchor || !isInternalNavAnchor(anchor)) return;

      const url = new URL(anchor.href, window.location.href);
      const next = `${url.pathname}${url.search}${url.hash}`;

      event.preventDefault();
      pendingRef.current = true;

      const transition = document.startViewTransition(() => {
        router.push(next);
      });

      void transition.finished.finally(() => {
        pendingRef.current = false;
      });
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return <>{children}</>;
}
