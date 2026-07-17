export const APP_NAME = "Lectrax";
export const APP_TAGLINE = "A Modern Academic Management Platform";
export const APP_DESCRIPTION =
  "Lectrax helps lecturers and students manage attendance, assignments, assessments, and academic performance through a modern academic management platform.";

export const BRAND = {
  name: APP_NAME,
  primary: "#0B3D91",
  accent: "#10B981",
  white: "#FFFFFF",
} as const;

export const ROLE_ROUTES = {
  platform_admin: "/admin",
  lecturer: "/lecturer",
  student: "/student",
} as const;

export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/partnerships",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/auth/callback",
  /** Payment gateway return bounce (may arrive cross-site without cookies). */
  "/payments/return",
  "/offline",
];

/** Public form/API endpoints that must work without login */
export const PUBLIC_API_ROUTES = [
  "/api/partnerships/inquiry",
  "/api/contact",
] as const;

/** Auth API routes callable without a session (login, signup helpers, password reset). */
export const PUBLIC_AUTH_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/check-signup-identifier",
  "/api/auth/finalize-phone-signup",
  "/api/auth/activate-phone-account",
  "/api/auth/check-phone",
  "/api/auth/resolve-login",
] as const;

export function isPublicAuthApiRoute(pathname: string): boolean {
  return PUBLIC_AUTH_API_ROUTES.some((route) => pathname === route);
}

export const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];
