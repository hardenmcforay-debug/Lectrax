"use client";

import { WifiOff } from "lucide-react";
import { OFFLINE_MODE_MESSAGE, OFFLINE_MODE_SUBMESSAGE } from "@/lib/errors/messages";

export function ConnectionBanner() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        {OFFLINE_MODE_MESSAGE} {OFFLINE_MODE_SUBMESSAGE}
      </span>
    </div>
  );
}
