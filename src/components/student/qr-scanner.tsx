"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
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

  const isDuplicate = status.variant === "duplicate";

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
          {isDuplicate && !status.recordedAt && (
            <p className="text-xs text-green-700">
              No duplicate attendance was created.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function QRScanner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ScanStatus>(READY_STATUS);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const scannerRef = useRef<InstanceType<
    Awaited<typeof import("html5-qrcode")>["Html5Qrcode"]
  > | null>(null);
  const processedRef = useRef(false);

  const submitToken = useCallback(async (token: string, options?: { afterTransfer?: boolean }) => {
    if (!options?.afterTransfer && processedRef.current) return;
    if (!options?.afterTransfer) {
      processedRef.current = true;
    }
    setSubmitting(true);
    setStatus({ title: "Verifying attendance...", variant: "loading" });

    try {
      const identity = getAttendanceDeviceIdentity();
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: extractToken(token),
          ...identity,
          latitude: null,
          longitude: null,
        }),
      });
      const data = (await res.json()) as ScanResponse;

      if (res.ok) {
        setStatus({
          title: data.message ?? ATTENDANCE_RECORDED_TITLE,
          description: data.description ?? ATTENDANCE_RECORDED_MESSAGE,
          recordedAt: data.recordedAt ?? null,
          variant: "success",
        });
        setPendingToken(null);
        setShowVerificationDialog(false);
        setShowTransferConfirm(false);
      } else if (res.status === 409 || data.code === "ATTENDANCE_ALREADY_RECORDED") {
        setStatus({
          title: data.error ?? ATTENDANCE_ALREADY_RECORDED_TITLE,
          description: data.message ?? ATTENDANCE_ALREADY_RECORDED_MESSAGE,
          recordedAt: data.recordedAt ?? null,
          variant: "duplicate",
        });
      } else if (data.code === "QR_EXPIRED") {
        setStatus({
          title: data.error ?? EXPIRED_QR_TITLE,
          description: data.message ?? EXPIRED_QR_MESSAGE,
          variant: "error",
        });
        processedRef.current = false;
      } else if (data.code === DEVICE_VERIFICATION_CODES.VERIFICATION_REQUIRED) {
        setPendingToken(extractToken(token));
        setShowVerificationDialog(true);
        setStatus({
          title: "Attendance device verification required",
          variant: "idle",
        });
        processedRef.current = false;
      } else if (data.code === DEVICE_VERIFICATION_CODES.ACCESS_REVOKED) {
        setStatus({
          title: DEVICE_MESSAGES.accessRevoked.title,
          description: data.detail ?? data.message ?? DEVICE_MESSAGES.accessRevoked.detail,
          variant: "error",
        });
        processedRef.current = false;
      } else {
        setStatus({
          title: data.error ?? data.message ?? "Scan failed",
          description:
            data.message && data.error && data.message !== data.error ? data.message : undefined,
          variant: "error",
        });
        processedRef.current = false;
      }
    } catch {
      setStatus({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "error",
      });
      processedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  async function handleTransferDevice() {
    setTransferring(true);
    try {
      const identity = getAttendanceDeviceIdentity();
      const res = await fetch("/api/attendance/device/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(identity),
      });
      const data = (await res.json()) as ScanResponse;

      if (!res.ok) {
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
        processedRef.current = false;
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
    if (token) void submitToken(token);
  }, [searchParams, submitToken]);

  async function startScanner() {
    setScanning(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decoded) => {
        scanner.stop().catch(() => {});
        setScanning(false);
        void submitToken(decoded);
      },
      () => {}
    );
  }

  async function stopScanner() {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      setScanning(false);
    }
  }

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
            <Button variant="outline" onClick={() => void stopScanner()}>
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
                processedRef.current = false;
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
