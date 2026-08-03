"use client";

import { useEffect, useState } from "react";
import { stripSensitiveUrlParams } from "@/lib/security/client-storage";

const AUTO_DISMISS_MS = 5000;

export function AccountDeletedBanner({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show);
  const [prevShow, setPrevShow] = useState(show);

  if (show !== prevShow) {
    setPrevShow(show);
    setVisible(show);
  }

  useEffect(() => {
    if (!show) return;

    const timer = window.setTimeout(() => {
      setVisible(false);
      stripSensitiveUrlParams(["accountDeleted"]);
    }, AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-950"
      role="status"
      aria-live="polite"
    >
      Your account has been permanently deleted.
    </div>
  );
}
