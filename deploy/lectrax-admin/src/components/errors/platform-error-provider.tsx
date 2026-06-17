"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ConnectionBanner } from "@/components/errors/connection-banner";
import { ErrorFallback } from "@/components/errors/error-fallback";
import type { ErrorCategory } from "@/lib/errors/types";
import { logPlatformError } from "@/lib/errors/logger";
import { createPlatformError } from "@/lib/errors/classify";

type PlatformErrorState = {
  category: ErrorCategory;
  title?: string;
  description?: string;
};

type PlatformErrorContextValue = {
  isOnline: boolean;
  globalError: PlatformErrorState | null;
  showGlobalError: (error: PlatformErrorState) => void;
  clearGlobalError: () => void;
  retryGlobal: () => void;
};

const PlatformErrorContext = createContext<PlatformErrorContextValue | null>(null);

export function PlatformErrorProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [globalError, setGlobalError] = useState<PlatformErrorState | null>(null);

  useEffect(() => {
    const updateOnline = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        setGlobalError((current) =>
          current?.category === "network" ? null : current
        );
      }
    };

    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  const showGlobalError = useCallback((error: PlatformErrorState) => {
    setGlobalError(error);
  }, []);

  const clearGlobalError = useCallback(() => {
    setGlobalError(null);
  }, []);

  const retryGlobal = useCallback(() => {
    clearGlobalError();
    router.refresh();
  }, [clearGlobalError, router]);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logPlatformError(
        "unhandledrejection",
        createPlatformError("unknown", "UNKNOWN", event.reason)
      );
    };

    const handleWindowError = (event: ErrorEvent) => {
      logPlatformError(
        "window.error",
        createPlatformError("unknown", "UNKNOWN", event.error ?? event.message)
      );
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleWindowError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleWindowError);
    };
  }, []);

  const value = useMemo(
    () => ({
      isOnline,
      globalError,
      showGlobalError,
      clearGlobalError,
      retryGlobal,
    }),
    [isOnline, globalError, showGlobalError, clearGlobalError, retryGlobal]
  );

  return (
    <PlatformErrorContext.Provider value={value}>
      {!isOnline && <ConnectionBanner />}
      {globalError && (
        <div className="fixed inset-x-0 bottom-4 z-[90] mx-auto max-w-lg px-4">
          <ErrorFallback
            category={globalError.category}
            title={globalError.title}
            description={globalError.description}
            onRetry={retryGlobal}
            onRefresh={retryGlobal}
            compact
          />
        </div>
      )}
      <div className={!isOnline ? "pt-12" : undefined}>{children}</div>
    </PlatformErrorContext.Provider>
  );
}

export function usePlatformError(): PlatformErrorContextValue {
  const context = useContext(PlatformErrorContext);
  if (!context) {
    throw new Error("usePlatformError must be used within PlatformErrorProvider");
  }
  return context;
}
