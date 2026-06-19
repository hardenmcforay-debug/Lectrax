"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { applyPortalChromeMarks, isPortalRoutePath } from "@/lib/pwa/portal-chrome";

function syncPortalChromeMarks() {
  applyPortalChromeMarks();
  requestAnimationFrame(() => {
    applyPortalChromeMarks();
  });
}

export function PortalChromeSync() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    syncPortalChromeMarks();
  }, [pathname]);

  useLayoutEffect(() => {
    const handleResize = () => {
      applyPortalChromeMarks();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      syncPortalChromeMarks();
      if (event.persisted) {
        requestAnimationFrame(syncPortalChromeMarks);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    window.addEventListener("pageshow", handlePageShow);
    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("pageshow", handlePageShow);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  useLayoutEffect(() => {
    if (!isPortalRoutePath(pathname)) return;

    syncPortalChromeMarks();
  }, [pathname]);

  return null;
}
