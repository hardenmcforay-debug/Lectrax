"use client";

import { appFetch } from "@/lib/api/client-fetch";

import { useEffect, useRef } from "react";
import { getAttendanceDeviceIdentity } from "@/lib/attendance/device-identity";

export function AttendanceDeviceRegistrar() {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    const identity = getAttendanceDeviceIdentity();
    void appFetch("/api/attendance/device/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(identity),
    }).catch(() => {
      registeredRef.current = false;
    });
  }, []);

  return null;
}
