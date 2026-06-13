"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { EXPIRED_QR_MESSAGE } from "@/lib/attendance/constants";
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
  detail?: string;
  code?: string;
};

export function QRScanner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>("Ready to scan");
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

  function extractToken(urlOrToken: string): string {
    try {
      const url = new URL(urlOrToken);
      return url.searchParams.get("token") ?? urlOrToken;
    } catch {
      return urlOrToken;
    }
  }

  async function submitToken(token: string, options?: { afterTransfer?: boolean }) {
    if (!options?.afterTransfer && processedRef.current) return;
    if (!options?.afterTransfer) {
      processedRef.current = true;
    }
    setSubmitting(true);
    setStatus("Verifying attendance...");

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
        setStatus("Attendance Recorded Successfully");
        setPendingToken(null);
        setShowVerificationDialog(false);
        setShowTransferConfirm(false);
      } else if (res.status === 409) {
        setStatus("Attendance Already Recorded");
      } else if (data.code === DEVICE_VERIFICATION_CODES.VERIFICATION_REQUIRED) {
        setPendingToken(extractToken(token));
        setShowVerificationDialog(true);
        setStatus("Attendance device verification required");
        processedRef.current = false;
      } else if (data.code === DEVICE_VERIFICATION_CODES.ACCESS_REVOKED) {
        setStatus(data.detail ?? data.message ?? DEVICE_MESSAGES.accessRevoked.detail);
        processedRef.current = false;
      } else {
        setStatus(data.error ?? data.message ?? "Scan failed");
        processedRef.current = false;
      }
    } catch {
      setStatus("Network error. Please try again.");
      processedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

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
        setStatus(data.error ?? "Device transfer failed");
        return;
      }

      setShowTransferConfirm(false);
      setShowVerificationDialog(false);
      setStatus(DEVICE_MESSAGES.transferSuccess);

      if (pendingToken) {
        processedRef.current = false;
        await submitToken(pendingToken, { afterTransfer: true });
      }
    } catch {
      setStatus("Network error during device transfer. Please try again.");
    } finally {
      setTransferring(false);
    }
  }

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) void submitToken(token);
  }, [searchParams]);

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

  const isSuccess = status === "Attendance Recorded Successfully";
  const isDuplicate = status === "Attendance Already Recorded";
  const isExpired = status === EXPIRED_QR_MESSAGE;
  const isRevoked = status === DEVICE_MESSAGES.accessRevoked.detail;
  const isTransferSuccess = status === DEVICE_MESSAGES.transferSuccess;

  return (
    <>
      <Card className={studentDashboardCardClass}>
        <CardHeader>
          <CardTitle>Scan Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            <p
              className={`text-sm ${
                isSuccess || isTransferSuccess
                  ? "font-medium text-green-700"
                  : isDuplicate
                    ? "font-medium text-amber-700"
                    : isExpired || isRevoked
                      ? "font-medium text-destructive"
                      : "text-muted-foreground"
              }`}
            >
              {status}
            </p>
          </div>
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
                setStatus("Ready to scan");
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
