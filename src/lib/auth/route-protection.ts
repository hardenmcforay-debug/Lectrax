import type { UserRole } from "@/types/database";

const PROTECTED_PORTAL_PREFIXES = ["/student", "/lecturer", "/admin"] as const;

/** Page routes that require an authenticated session and role-specific access. */
export function isProtectedPortalPath(pathname: string): boolean {
  return PROTECTED_PORTAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Required role for API prefixes enforced at the middleware edge. */
export function getRequiredApiRole(pathname: string): UserRole | null {
  if (pathname.startsWith("/api/student/")) return "student";
  if (pathname.startsWith("/api/lecturer/")) return "lecturer";
  if (pathname.startsWith("/api/admin/")) return "platform_admin";
  if (pathname.startsWith("/api/payments/")) return "lecturer";

  if (
    pathname === "/api/attendance/start" ||
    pathname === "/api/attendance/end" ||
    pathname.startsWith("/api/attendance/manual") ||
    pathname.startsWith("/api/attendance/refresh")
  ) {
    return "lecturer";
  }

  if (
    pathname.startsWith("/api/attendance/scan") ||
    pathname.startsWith("/api/attendance/device/")
  ) {
    return "student";
  }

  return null;
}

/** Required role for portal page prefixes enforced at the middleware edge. */
export function getRequiredPortalRole(pathname: string): UserRole | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "platform_admin";
  if (pathname === "/lecturer" || pathname.startsWith("/lecturer/")) return "lecturer";
  if (pathname === "/student" || pathname.startsWith("/student/")) return "student";
  return null;
}
