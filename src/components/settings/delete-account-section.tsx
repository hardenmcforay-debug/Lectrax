"use client";

import { useCallback, useRef, useState } from "react";
import { TriangleAlert, Trash2 } from "lucide-react";
import { appFetch } from "@/lib/api/client-fetch";
import { ACCOUNT_DELETE_CONFIRMATION_PHRASE } from "@/lib/account/delete-account-constants";
import { signOutAndClearClientStorage } from "@/lib/auth/client-sign-out";
import { ATTENDANCE_DEVICE_ID_KEY } from "@/lib/attendance/device-identity";
import { REMEMBER_LOGIN_IDENTIFIER_STORAGE_KEY } from "@/lib/security/client-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function clearAllLocalAccountData() {
  try {
    window.localStorage.removeItem(ATTENDANCE_DEVICE_ID_KEY);
    window.localStorage.removeItem(REMEMBER_LOGIN_IDENTIFIER_STORAGE_KEY);
  } catch {
    // ignore storage access errors
  }
}

export function DeleteAccountSection({
  role,
  cardClassName,
}: {
  role: "student" | "lecturer";
  cardClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inFlightRef = useRef(false);

  const confirmationMatches =
    confirmationPhrase.trim().toUpperCase() === ACCOUNT_DELETE_CONFIRMATION_PHRASE;
  const canSubmit = Boolean(password) && confirmationMatches && !deleting;

  const resetForm = useCallback(() => {
    setPassword("");
    setConfirmationPhrase("");
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (deleting) return;
      setOpen(next);
      if (!next) resetForm();
    },
    [deleting, resetForm]
  );

  async function handleDelete() {
    if (!canSubmit || inFlightRef.current) return;

    inFlightRef.current = true;
    setDeleting(true);
    setError(null);

    try {
      const res = await appFetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          password,
          confirmationPhrase: confirmationPhrase.trim(),
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        setError(body.error ?? "Could not delete your account. Please try again.");
        return;
      }

      clearAllLocalAccountData();
      await signOutAndClearClientStorage({
        redirectTo: "/?accountDeleted=1",
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      inFlightRef.current = false;
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className={cn("border-destructive/30", cardClassName)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete account
          </CardTitle>
          <CardDescription>
            Permanently delete your Lectrax account and personal data. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {role === "student"
              ? "Your profile, devices, notifications, and uploaded assignment files will be removed. Class attendance and grades may be retained in anonymized form for institutional records."
              : "Your profile and personal subscription data will be removed. You must delete all class sessions first so enrolled students’ academic records are not destroyed."}
          </p>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
          >
            Delete account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="h-5 w-5" />
              Delete your account?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This permanently deletes your authentication account and signs you out of all
                  sessions. This action cannot be undone.
                </p>
                <div>
                  <p className="font-medium text-foreground">What will be deleted</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Your profile and sign-in credentials</li>
                    <li>Personal preferences and notification records</li>
                    {role === "student" ? (
                      <>
                        <li>Registered attendance devices</li>
                        <li>Your uploaded assignment PDF files</li>
                      </>
                    ) : (
                      <li>Subscription reminders tied to your account</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">What may be retained</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {role === "student" ? (
                      <li>
                        Anonymized attendance, enrollment, and grade records needed for class and
                        university reporting
                      </li>
                    ) : (
                      <li>
                        Payment/audit history with personal identifiers removed where required for
                        compliance
                      </li>
                    )}
                    <li>A secure audit log entry that an account was deleted (no contact details)</li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="delete-account-password">Confirm with your password</Label>
              <Input
                id="delete-account-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={deleting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-account-confirm">
                Type <span className="font-semibold text-foreground">{ACCOUNT_DELETE_CONFIRMATION_PHRASE}</span>{" "}
                to continue
              </Label>
              <Input
                id="delete-account-confirm"
                value={confirmationPhrase}
                onChange={(event) => setConfirmationPhrase(event.target.value)}
                placeholder={ACCOUNT_DELETE_CONFIRMATION_PHRASE}
                disabled={deleting}
                autoCapitalize="characters"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={deleting}
              disabled={!canSubmit}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting..." : "Permanently delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
