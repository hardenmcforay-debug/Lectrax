"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { applyPortalChromeMarks, isPortalRoutePath } from "@/lib/pwa/portal-chrome";

export function PortalChromeSync() {
  const pathname = usePathname();

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

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [pathname]);

  return null;
}
