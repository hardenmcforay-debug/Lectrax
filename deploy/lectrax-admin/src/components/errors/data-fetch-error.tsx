"use client";

import { ErrorFallback } from "@/components/errors/error-fallback";

function reloadPage(): void {
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

export function DataFetchError({
  onRetry = reloadPage,
  onRefresh,
}: {
  onRetry?: () => void;
  onRefresh?: () => void;
}) {
  return (
    <ErrorFallback
      category="data"
      onRetry={onRetry}
      onRefresh={onRefresh ?? onRetry}
    />
  );
}
