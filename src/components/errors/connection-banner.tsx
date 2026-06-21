"use client";

import { Signal, WifiOff } from "lucide-react";
import {
  OFFLINE_MODE_MESSAGE,
  OFFLINE_MODE_SUBMESSAGE,
  POOR_CONNECTION_MESSAGE,
  POOR_CONNECTION_SUBMESSAGE,
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
      <div className="pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg">
        {isOffline ? (
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Signal className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        )}
        <span>
          <span className="font-medium">
            {isOffline ? OFFLINE_MODE_MESSAGE : POOR_CONNECTION_MESSAGE}
          </span>{" "}
          {isOffline ? OFFLINE_MODE_SUBMESSAGE : POOR_CONNECTION_SUBMESSAGE}
        </span>
      </div>
    </div>
  );
}
