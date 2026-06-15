"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthUserMessage } from "@/lib/errors/auth-messages";
import { cn } from "@/lib/utils";

type AuthErrorNoticeProps = {
  error: AuthUserMessage;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function AuthErrorNotice({
  error,
  onRetry,
  retryLabel = "Try Again",
  className,
}: AuthErrorNoticeProps) {
  const isOffline = error.title === "You're Offline";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        isOffline ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-2.5">
        {isOffline ? (
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        ) : null}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-semibold",
              isOffline ? "text-amber-900" : "text-red-900"
            )}
          >
            {error.title}
          </p>
          <p className={cn("mt-1 text-sm", isOffline ? "text-amber-800" : "text-red-800")}>
            {error.description}
          </p>
          {error.retryable && onRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onRetry}
            >
              {retryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
