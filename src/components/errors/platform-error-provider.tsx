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
import {
  subscribeToConnectionQuality,
  type ConnectionQuality,
} from "@/lib/network/connection-quality";

type PlatformErrorState = {
  category: ErrorCategory;
  title?: string;
  description?: string;
};

type PlatformErrorContextValue = {
  isOnline: boolean;
  connectionQuality: ConnectionQuality;
  globalError: PlatformErrorState | null;
  showGlobalError: (error: PlatformErrorState) => void;
  clearGlobalError: () => void;
  retryGlobal: () => void;
};

const PlatformErrorContext = createContext<PlatformErrorContextValue | null>(null);

export function PlatformErrorProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("online");
  const [globalError, setGlobalError] = useState<PlatformErrorState | null>(null);

  useEffect(() => {
    setMounted(true);
    return subscribeToConnectionQuality(setConnectionQuality);
  }, []);

  const isOnline = connectionQuality !== "offline";

  useEffect(() => {
    if (connectionQuality === "online") {
      setGlobalError((current) =>
        current?.category === "network" ? null : current
      );
    }
  }, [connectionQuality]);

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
      connectionQuality,
      globalError,
      showGlobalError,
      clearGlobalError,
      retryGlobal,
    }),
    [isOnline, connectionQuality, globalError, showGlobalError, clearGlobalError, retryGlobal]
  );

  const showConnectionBanner =
    mounted && (connectionQuality === "offline" || connectionQuality === "slow");

  return (
    <PlatformErrorContext.Provider value={value}>
      {showConnectionBanner && <ConnectionBanner quality={connectionQuality} />}
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
      {showConnectionBanner ? <div className="pt-12">{children}</div> : children}
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
