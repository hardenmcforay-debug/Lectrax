"use client";

import { Download, Share, Smartphone, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPwaAppName } from "@/lib/pwa/config";

type IosInstallInstructionsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IosInstallInstructions({ open, onOpenChange }: IosInstallInstructionsProps) {
  const appName = getPwaAppName();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" aria-hidden />
            Install {appName}
          </DialogTitle>
          <DialogDescription>
            Add this app to your Home Screen using the Share menu.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              1
            </span>
            <span>
              Tap the <strong className="text-foreground">Share</strong> button{" "}
              <Share className="inline h-4 w-4 text-primary" aria-hidden /> in Safari&apos;s toolbar
              (bottom on iPhone, top on iPad).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              2
            </span>
            <span>
              Scroll down and tap <strong className="text-foreground">Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              3
            </span>
            <span>
              Tap <strong className="text-foreground">Add</strong> in the top-right corner to install{" "}
              {appName}.
            </span>
          </li>
        </ol>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-white hover:bg-primary/90"
        >
          <X className="h-4 w-4" aria-hidden />
          Got it
        </button>
      </DialogContent>
    </Dialog>
  );
}

export function IosInstallButtonLabel() {
  const appName = getPwaAppName();

  return (
    <>
      <Download className="h-4 w-4" aria-hidden />
      Install {appName}
    </>
  );
}
