"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleCheckBig, Loader2, CloudUpload, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useHydrated } from "@/lib/hooks/use-hydrated";

export type AssignmentUploadOverlayPhase = "uploading" | "success" | "failed";

const DEFAULT_UPLOAD_FAILURE_MESSAGE =
  "We couldn't upload your assignment.\n\nPlease check your internet connection and try again.";

export function AssignmentUploadOverlay({
  open,
  phase,
  progress,
  errorMessage,
  canRetry = true,
  onRetry,
  onDismiss,
}: {
  open: boolean;
  phase: AssignmentUploadOverlayPhase;
  progress: number | null;
  errorMessage?: string | null;
  canRetry?: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const hydrated = useHydrated();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!hydrated) return null;

  const showProgress = phase === "uploading" && progress !== null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-live="polite"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60"
            aria-hidden
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
          />

          <motion.div
            className="relative z-[201] w-full max-w-md rounded-xl border border-border/60 bg-background p-6 shadow-2xl"
            initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {phase === "uploading" ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CloudUpload className="h-6 w-6" aria-hidden />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground">
                    Uploading Assignment...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please wait while your assignment is being securely uploaded.
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    Do not close the app or leave this page.
                  </p>
                </div>

                {showProgress ? (
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Uploading...</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {progress}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                ) : (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
                  </div>
                )}
              </div>
            ) : null}

            {phase === "success" ? (
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <CircleCheckBig className="h-6 w-6" aria-hidden />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground">
                    Assignment Submitted Successfully
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your assignment has been uploaded successfully.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The submission has been recorded.
                  </p>
                </div>
              </div>
            ) : null}

            {phase === "failed" ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <CircleX className="h-6 w-6" aria-hidden />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground">Upload Failed</p>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {errorMessage?.trim() || DEFAULT_UPLOAD_FAILURE_MESSAGE}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {canRetry ? (
                    <Button type="button" variant="accent" size="sm" onClick={onRetry}>
                      Retry
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
                    Close
                  </Button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
