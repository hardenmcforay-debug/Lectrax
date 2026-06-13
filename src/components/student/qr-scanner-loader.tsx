"use client";

import dynamic from "next/dynamic";

const QRScanner = dynamic(
  () => import("@/components/student/qr-scanner").then((mod) => mod.QRScanner),
  { ssr: false }
);

export function QRScannerLoader() {
  return <QRScanner />;
}
