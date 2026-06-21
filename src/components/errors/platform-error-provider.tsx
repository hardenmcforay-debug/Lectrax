"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ConnectionNoticeToast } from "@/components/errors/connection-banner";
import { ErrorFallback } from "@/components/errors/error-fallback";
import type { ErrorCategory } from "@/lib/errors/types";
import { logPlatformError } from "@/lib/errors/logger";
import { createPlatformError } from "@/lib/errors/classify";
import {
  subscribeToConnectionQuality,
  type ConnectionQuality,
} from "@/lib/network/connection-quality";

const POOR_CONNECTION_TOAST_MS = 5_000;
const OFFLINE_TOAST_MS = 6_000;
const SLOW_TOAST_COOLDOWN_MS = 60_000;

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
  const [connectionNoticeVisible, setConnectionNoticeVisible] = useState(false);
  const [globalError, setGlobalError] = useState<PlatformErrorState | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const lastSlowToastAtRef = useRef(0);
  const previousQualityRef = useRef<ConnectionQuality>("online");

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hideConnectionNotice = useCallback(() => {
    clearHideTimer();
    setConnectionNoticeVisible(false);
  }, [clearHideTimer]);

  const showConnectionNotice = useCallback(
    (durationMs: number) => {
      clearHideTimer();
      setConnectionNoticeVisible(true);
      hideTimerRef.current = window.setTimeout(() => {
        setConnectionNoticeVisible(false);
        hideTimerRef.current = null;
      }, durationMs);
    },
    [clearHideTimer]
  );

  useEffect(() => {
    setMounted(true);
    return subscribeToConnectionQuality(setConnectionQuality);
  }, []);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  useEffect(() => {
    const previous = previousQualityRef.current;
    previousQualityRef.current = connectionQuality;

    if (connectionQuality === "online") {
      hideConnectionNotice();
      setGlobalError((current) =>
        current?.category === "network" ? null : current
      );
      return;
    }

    if (!mounted) {
      return;
    }

    if (connectionQuality === "offline") {
      if (previous !== "offline") {
        showConnectionNotice(OFFLINE_TOAST_MS);
      }
      return;
    }

    if (connectionQuality === "slow") {
      const now = Date.now();
      const onCooldown = now - lastSlowToastAtRef.current < SLOW_TOAST_COOLDOWN_MS;
      if (previous === "slow" || onCooldown) {
        return;
      }
      lastSlowToastAtRef.current = now;
      showConnectionNotice(POOR_CONNECTION_TOAST_MS);
    }
  }, [connectionQuality, mounted, hideConnectionNotice, showConnectionNotice]);

  const isOnline = connectionQuality !== "offline";

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

  const showConnectionNoticeToast =
    mounted && connectionQuality !== "online" && connectionNoticeVisible;

  return (
    <PlatformErrorContext.Provider value={value}>
      {showConnectionNoticeToast && (
        <ConnectionNoticeToast quality={connectionQuality} visible={connectionNoticeVisible} />
      )}
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
      {children}
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
