import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getAttendanceDeviceIdentity } from "@/lib/attendance/device-identity";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatPercent(value: number, decimals = 1) {
  return `${value.toFixed(decimals)}%`;
}

export function generateDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server";
  return getAttendanceDeviceIdentity().deviceFingerprint;
}
