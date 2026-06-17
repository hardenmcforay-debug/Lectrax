"use client";

import { useInsertionEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { applyPortalChromeMarks, isPortalRoutePath } from "@/lib/pwa/portal-chrome";

export function PortalChromeSync() {
  const pathname = usePathname();

  if (typeof document !== "undefined") {
    applyPortalChromeMarks();
  }

  useInsertionEffect(() => {
    applyPortalChromeMarks();
  }, [pathname]);

  useLayoutEffect(() => {
    applyPortalChromeMarks();
  }, [pathname]);

  useLayoutEffect(() => {
    if (!isPortalRoutePath(pathname)) return;

    const handleResize = () => {
      applyPortalChromeMarks();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [pathname]);

  return null;
}
