"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HostedCheckoutFrameProps = {
  checkoutUrl: string;
  className?: string;
  /** Shown while waiting for Monime confirmation after return. */
  confirming?: boolean;
  onClose: () => void;
};

/**
 * In-app Monime hosted checkout. Keeps payment inside the Lectrax shell
 * (including installed PWA) instead of opening a system browser tab.
 */
export function HostedCheckoutFrame({
  checkoutUrl,
  className,
  confirming = false,
  onClose,
}: HostedCheckoutFrameProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-background", className)}>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Secure checkout</p>
          <p className="truncate text-xs text-muted-foreground">Complete payment with Monime</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden text-muted-foreground sm:inline-flex"
            onClick={() => {
              window.location.assign(checkoutUrl);
            }}
          >
            Open full page
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-slate-50">
        <iframe
          title="Monime checkout"
          src={checkoutUrl}
          className="absolute inset-0 h-full w-full border-0 bg-white"
          allow="payment *; publickey-credentials-get *"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        {confirming ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/90 px-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium text-foreground">Confirming your payment…</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
