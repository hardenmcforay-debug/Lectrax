"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { logClientCrash } from "@/lib/errors/logger";
import { ServiceUnavailableError } from "@/lib/errors/service-unavailable";

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const isServiceUnavailable =
      error instanceof ServiceUnavailableError || error.message === "SERVICE_UNAVAILABLE";

    if (!isServiceUnavailable) {
      logClientCrash("SegmentError", error);
    }
  }, [error]);

  const isServiceUnavailable =
    error instanceof ServiceUnavailableError || error.message === "SERVICE_UNAVAILABLE";

  return (
    <div className="p-4 sm:p-6">
      <ErrorFallback
        category={isServiceUnavailable ? "supabase" : "unknown"}
        onRetry={() => reset()}
        showGoBack
        showReload
      />
    </div>
  );
}
