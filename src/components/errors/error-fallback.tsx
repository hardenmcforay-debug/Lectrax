"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ErrorCategory } from "@/lib/errors/types";
import { ERROR_MESSAGES } from "@/lib/errors/messages";
import { cn } from "@/lib/utils";

type ErrorFallbackProps = {
  category?: ErrorCategory;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  showGoBack?: boolean;
  showReload?: boolean;
  compact?: boolean;
  className?: string;
};

export function ErrorFallback({
  category = "unknown",
  title,
  description,
  onRetry,
  onRefresh,
  showGoBack = false,
  showReload = false,
  compact = false,
  className,
}: ErrorFallbackProps) {
  const router = useRouter();
  const defaults = ERROR_MESSAGES[category];
  const Icon = category === "network" ? WifiOff : AlertTriangle;

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-6 shadow-sm",
        compact ? "max-w-md" : "mx-auto max-w-lg",
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-50 p-2 text-amber-700">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title ?? defaults.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {description ?? defaults.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button type="button" variant="accent" onClick={onRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            )}
            {onRefresh && (
              <Button type="button" variant="outline" onClick={onRefresh}>
                Refresh
              </Button>
            )}
            {showGoBack && (
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
            )}
            {showReload && (
              <Button type="button" variant="outline" onClick={handleReload}>
                Reload Page
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
