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
