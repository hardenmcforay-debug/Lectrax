"use client";

import { Signal, WifiOff } from "lucide-react";
import {
  OFFLINE_MODE_MESSAGE,
  OFFLINE_MODE_SUBMESSAGE,
  POOR_CONNECTION_MESSAGE,
  POOR_CONNECTION_SUBMESSAGE,
} from "@/lib/errors/messages";
import type { ConnectionQuality } from "@/lib/network/connection-quality";

export function ConnectionBanner({ quality }: { quality: ConnectionQuality }) {
  const isOffline = quality === "offline";

  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 shadow-sm"
      role="status"
      aria-live="polite"
    >
      {isOffline ? (
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Signal className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span>
        {isOffline ? OFFLINE_MODE_MESSAGE : POOR_CONNECTION_MESSAGE}{" "}
        {isOffline ? OFFLINE_MODE_SUBMESSAGE : POOR_CONNECTION_SUBMESSAGE}
      </span>
    </div>
  );
}
