"use client";

import { Signal, WifiOff } from "lucide-react";
import {
  OFFLINE_MODE_MESSAGE,
  POOR_CONNECTION_MESSAGE,
} from "@/lib/errors/messages";
import type { ConnectionQuality } from "@/lib/network/connection-quality";
import { cn } from "@/lib/utils";

export function ConnectionNoticeToast({
  quality,
  visible,
}: {
  quality: ConnectionQuality;
  visible: boolean;
}) {
  if (quality === "online") {
    return null;
  }

  const isOffline = quality === "offline";

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      )}
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
    >
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-900 shadow-lg">
        {isOffline ? (
          <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <Signal className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        <span>{isOffline ? OFFLINE_MODE_MESSAGE : POOR_CONNECTION_MESSAGE}</span>
      </div>
    </div>
  );
}
