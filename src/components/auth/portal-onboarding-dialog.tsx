"use client";

import { useState } from "react";
import Link from "next/link";
import { appFetch } from "@/lib/api/client-fetch";
import { APP_NAME } from "@/lib/constants";
import { getPortalSettingsPath } from "@/lib/auth/signup-method";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PortalOnboardingDialog({
  role,
  showRecoveryEmailNotice,
}: {
  role: "student" | "lecturer";
  showRecoveryEmailNotice: boolean;
}) {
  const [open, setOpen] = useState(true);

  const settingsPath = getPortalSettingsPath(role);

  function handleAcknowledge() {
    setOpen(false);

    void appFetch("/api/auth/acknowledge-portal-onboarding", {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      // Best-effort; the popup may reappear on a later visit if this fails.
    });
  }

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-md [&>button]:hidden"
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome to {APP_NAME}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4 pt-2 text-left text-sm text-muted-foreground">
              {showRecoveryEmailNotice && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
                  <p className="font-medium text-amber-900">Add a password recovery email</p>
                  <p className="mt-1">
                    You signed up with a phone number. Please go to{" "}
                    <Link href={settingsPath} className="font-semibold text-primary hover:underline">
                      Settings
                    </Link>{" "}
                    and add a password recovery email so you can reset your password if you forget
                    it.
                  </p>
                </div>
              )}

              <p>
                By continuing, you agree to our{" "}
                <Link href="/terms" className="font-medium text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-medium text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-center">
          <Button type="button" className="w-full sm:w-auto" onClick={handleAcknowledge}>
            Okay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
