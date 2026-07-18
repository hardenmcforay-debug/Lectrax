"use client";

import { appFetch } from "@/lib/api/client-fetch";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  ATTENDANCE_ALREADY_RECORDED_MESSAGE,
  ATTENDANCE_ALREADY_RECORDED_TITLE,
  ATTENDANCE_RECORDED_MESSAGE,
  ATTENDANCE_RECORDED_TITLE,
  EXPIRED_QR_MESSAGE,
  EXPIRED_QR_TITLE,
  formatAttendanceDate,
  formatAttendanceTime,
} from "@/lib/attendance/constants";
import { getAttendanceDeviceIdentity } from "@/lib/attendance/device-identity";
import {
  DEVICE_MESSAGES,
  DEVICE_VERIFICATION_CODES,
} from "@/lib/attendance/device-verification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { studentDashboardCardClass } from "@/components/student/student-dashboard-styles";
import { stripSensitiveUrlParams } from "@/lib/security/client-storage";

type ScanResponse = {
  error?: string;
  message?: string;
  description?: string;
  detail?: string;
  code?: string;
  recordedAt?: string | null;
  alreadyRecorded?: boolean;
};

type ScanStatus = {
  title: string;
  description?: string;
  recordedAt?: string | null;
  variant: "idle" | "loading" | "success" | "duplicate" | "error";
};

const READY_STATUS: ScanStatus = {
  title: "Ready to scan",
  variant: "idle",
};

function extractToken(urlOrToken: string): string {
  try {
    const url = new URL(urlOrToken);
    return url.searchParams.get("token") ?? urlOrToken;
  } catch {
    return urlOrToken;
  }
}

function ScanResultNotice({ status }: { status: ScanStatus }) {
  if (status.variant === "idle" || status.variant === "loading") {
    return (
      <div className="flex items-start gap-2">
        {status.variant === "loading" && (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
        )}
        <p className="text-sm text-muted-foreground">{status.title}</p>
      </div>
    );
  }

  if (status.variant === "error") {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-destructive">{status.title}</p>
        {status.description && (
          <p className="text-sm text-destructive">{status.description}</p>
        )}
      </div>
    );
  }

  if (status.variant === "duplicate") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <div className="space-y-2">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-800">{status.title}</p>
              {status.description && (
                <p className="text-sm text-red-700">{status.description}</p>
              )}
            </div>
            {status.recordedAt && (
              <div className="space-y-0.5 border-t border-red-200 pt-2 text-sm text-red-700">
                <p>
                  <span className="font-medium text-red-800">Attendance Recorded At:</span>{" "}
                  {formatAttendanceTime(status.recordedAt)}
                </p>
                <p>
                  <span className="font-medium text-red-800">Date:</span>{" "}
                  {formatAttendanceDate(status.recordedAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden />
        <div className="space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-green-800">{status.title}</p>
            {status.description && (
              <p className="text-sm text-green-700">{status.description}</p>
            )}
          </div>
          {status.recordedAt && (
            <div className="space-y-0.5 border-t border-green-200 pt-2 text-sm text-green-700">
              <p>
                <span className="font-medium text-green-800">Attendance Recorded At:</span>{" "}
                {formatAttendanceTime(status.recordedAt)}
              </p>
              <p>
                <span className="font-medium text-green-800">Date:</span>{" "}
                {formatAttendanceDate(status.recordedAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type Html5QrcodeInstance = InstanceType<
  Awaited<typeof import("html5-qrcode")>["Html5Qrcode"]
>;

export function QRScanner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ScanStatus>(READY_STATUS);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const startingScannerRef = useRef(false);
  const scanGenerationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightTokenRef = useRef<string | null>(null);
  /** After a successful mark, block further camera submits until the user opens the scanner again. */
  const attendanceLockedRef = useRef(false);
  const urlTokenHandledRef = useRef<string | null>(null);

  const stopScannerInstance = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      setScanning(false);
      return;
    }

    try {
      const state = scanner.getState?.();
      // 2 = SCANNING in html5-qrcode Html5QrcodeScannerState
      if (state === 2 || state === undefined) {
        await scanner.stop().catch(() => {});
      }
      // clear() is synchronous in html5-qrcode
      scanner.clear();
    } catch {
      // Best-effort cleanup
    } finally {
      scannerRef.current = null;
      setScanning(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (startingScannerRef.current) return;
    startingScannerRef.current = true;

    try {
      await stopScannerInstance();

      // New scan attempt — clear sticky expired/error UI and unlock retries.
      attendanceLockedRef.current = false;
      inFlightTokenRef.current = null;
      setStatus(READY_STATUS);

      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      setScanning(true);

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          void (async () => {
            await stopScannerInstance();
            // submitToken is defined below; call through ref to avoid circular deps.
            await submitTokenRef.current?.(decoded);
          })();
        },
        () => {}
      );
    } catch {
      setScanning(false);
      setStatus({
        title: "Could not open camera",
        description: "Check camera permission and try again.",
        variant: "error",
      });
    } finally {
      startingScannerRef.current = false;
    }
  }, [stopScannerInstance]);

  const submitTokenRef = useRef<
    ((token: string, options?: { afterTransfer?: boolean }) => Promise<void>) | null
  >(null);

  const submitToken = useCallback(
    async (token: string, options?: { afterTransfer?: boolean }) => {
      const normalized = extractToken(token);
      if (!normalized) return;

      if (!options?.afterTransfer && attendanceLockedRef.current) {
        return;
      }

      // Ignore duplicate submits of the same token while a request is in flight.
      if (
        !options?.afterTransfer &&
        inFlightTokenRef.current === normalized &&
        abortRef.current
      ) {
        return;
      }

      // A newer / different QR always wins — cancel the previous request so an
      // expired response cannot overwrite a later valid scan.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const generation = ++scanGenerationRef.current;
      inFlightTokenRef.current = normalized;

      setSubmitting(true);
      setStatus({ title: "Verifying attendance...", variant: "loading" });

      try {
        const identity = getAttendanceDeviceIdentity();
        const res = await appFetch("/api/attendance/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: normalized,
            ...identity,
            latitude: null,
            longitude: null,
          }),
          signal: controller.signal,
        });

        if (generation !== scanGenerationRef.current) return;

        const data = (await res.json()) as ScanResponse;
        if (generation !== scanGenerationRef.current) return;

        if (res.ok) {
          attendanceLockedRef.current = true;
          setStatus({
            title: data.message ?? ATTENDANCE_RECORDED_TITLE,
            description: data.description ?? ATTENDANCE_RECORDED_MESSAGE,
            recordedAt: data.recordedAt ?? null,
            variant: "success",
          });
          setPendingToken(null);
          setShowVerificationDialog(false);
          setShowTransferConfirm(false);
          return;
        }

        if (res.status === 409 || data.code === "ATTENDANCE_ALREADY_RECORDED") {
          attendanceLockedRef.current = true;
          setStatus({
            title: data.error ?? ATTENDANCE_ALREADY_RECORDED_TITLE,
            description: data.message ?? ATTENDANCE_ALREADY_RECORDED_MESSAGE,
            recordedAt: data.recordedAt ?? null,
            variant: "duplicate",
          });
          return;
        }

        if (data.code === "QR_EXPIRED") {
          setStatus({
            title: data.error ?? EXPIRED_QR_TITLE,
            description:
              (data.message ?? EXPIRED_QR_MESSAGE) +
              " Open the scanner again to scan the latest QR code.",
            variant: "error",
          });
          return;
        }

        if (data.code === DEVICE_VERIFICATION_CODES.DEVICE_BOUND_TO_OTHER_ACCOUNT) {
          setStatus({
            title: DEVICE_MESSAGES.deviceBoundToOtherAccount.title,
            description:
              data.detail ?? data.message ?? DEVICE_MESSAGES.deviceBoundToOtherAccount.detail,
            variant: "error",
          });
          setPendingToken(null);
          setShowVerificationDialog(false);
          setShowTransferConfirm(false);
          return;
        }

        if (data.code === DEVICE_VERIFICATION_CODES.VERIFICATION_REQUIRED) {
          setPendingToken(normalized);
          setShowVerificationDialog(true);
          setStatus({
            title: "Attendance device verification required",
            variant: "idle",
          });
          return;
        }

        if (data.code === DEVICE_VERIFICATION_CODES.ACCESS_REVOKED) {
          setStatus({
            title: DEVICE_MESSAGES.accessRevoked.title,
            description: data.detail ?? data.message ?? DEVICE_MESSAGES.accessRevoked.detail,
            variant: "error",
          });
          return;
        }

        setStatus({
          title: data.error ?? data.message ?? "Scan failed",
          description:
            data.message && data.error && data.message !== data.error ? data.message : undefined,
          variant: "error",
        });
      } catch (error) {
        if (generation !== scanGenerationRef.current) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus({
          title: "Network error",
          description: "Please check your connection and try again.",
          variant: "error",
        });
      } finally {
        if (generation === scanGenerationRef.current) {
          inFlightTokenRef.current = null;
          setSubmitting(false);
        }
      }
    },
    []
  );

  submitTokenRef.current = submitToken;

  async function handleTransferDevice() {
    setTransferring(true);
    try {
      const identity = getAttendanceDeviceIdentity();
      const res = await appFetch("/api/attendance/device/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(identity),
      });
      const data = (await res.json()) as ScanResponse;

      if (!res.ok) {
        if (data.code === DEVICE_VERIFICATION_CODES.DEVICE_BOUND_TO_OTHER_ACCOUNT) {
          setStatus({
            title: DEVICE_MESSAGES.deviceBoundToOtherAccount.title,
            description:
              data.detail ?? data.message ?? DEVICE_MESSAGES.deviceBoundToOtherAccount.detail,
            variant: "error",
          });
          setPendingToken(null);
          return;
        }

        setStatus({
          title: data.error ?? "Device transfer failed",
          variant: "error",
        });
        return;
      }

      setShowTransferConfirm(false);
      setShowVerificationDialog(false);
      setStatus({
        title: DEVICE_MESSAGES.transferSuccess,
        variant: "success",
      });

      if (pendingToken) {
        attendanceLockedRef.current = false;
        await submitToken(pendingToken, { afterTransfer: true });
      }
    } catch {
      setStatus({
        title: "Network error",
        description: "Device transfer failed. Please try again.",
        variant: "error",
      });
    } finally {
      setTransferring(false);
    }
  }

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;
    if (urlTokenHandledRef.current === token) return;
    urlTokenHandledRef.current = token;
    void submitToken(token);
    stripSensitiveUrlParams();
  }, [searchParams, submitToken]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      void stopScannerInstance();
    };
  }, [stopScannerInstance]);

  return (
    <>
      <Card className={studentDashboardCardClass}>
        <CardHeader>
          <CardTitle>Scan Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScanResultNotice status={status} />
          <div id="qr-reader" className="w-full max-w-sm overflow-hidden rounded-lg" />
          {!scanning ? (
            <Button variant="accent" onClick={() => void startScanner()} disabled={submitting}>
              Open Camera Scanner
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void stopScannerInstance()}>
              Stop Scanner
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{DEVICE_MESSAGES.verificationRequired.title}</DialogTitle>
            <DialogDescription>{DEVICE_MESSAGES.verificationRequired.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVerificationDialog(false);
                setPendingToken(null);
                attendanceLockedRef.current = false;
                setStatus(READY_STATUS);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                setShowVerificationDialog(false);
                setShowTransferConfirm(true);
              }}
            >
              Transfer Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransferConfirm} onOpenChange={setShowTransferConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Attendance Device</DialogTitle>
            <DialogDescription>{DEVICE_MESSAGES.transferWarning}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTransferConfirm(false);
                setShowVerificationDialog(true);
              }}
              disabled={transferring}
            >
              Cancel
            </Button>
            <Button variant="accent" onClick={() => void handleTransferDevice()} disabled={transferring}>
              {transferring ? "Transferring..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
