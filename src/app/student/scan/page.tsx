import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { QRScannerLoader } from "@/components/student/qr-scanner-loader";

export default function ScanPage() {
  return (
    <DashboardShell role="student" title="Scan QR">
      <Suspense>
        <QRScannerLoader />
      </Suspense>
    </DashboardShell>
  );
}
