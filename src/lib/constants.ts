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
  "/offline",
];

/** Public form/API endpoints that must work without login */
export const PUBLIC_API_ROUTES = [
  "/api/partnerships/inquiry",
  "/api/contact",
] as const;

export const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];
