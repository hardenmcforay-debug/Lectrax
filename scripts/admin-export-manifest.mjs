/**
 * Shared manifest for admin export + parity checks.
 * Keep infrastructure lists here so new shared modules propagate automatically
 * when they live under INFRASTRUCTURE_DIRS or are discovered via @/ imports.
 */

/** App feature trees required by the platform-admin surface. */
export const COPY_DIRS = [
  "src/app/admin",
  "src/app/api/admin",
  "src/app/api/auth",
  "src/app/api/csp-report",
  "src/app/auth",
  "src/app/offline",
  "src/components/admin",
  "src/components/auth",
  "src/components/errors",
  "src/components/layout",
  "src/components/pwa",
  "src/hooks",
  "src/lib/admin",
  "src/lib/api",
  "src/lib/auth",
  "src/lib/charts",
  "src/lib/contact",
  "src/lib/concurrency",
  "src/lib/errors",
  "src/lib/observability",
  "src/lib/hooks",
  "src/lib/env",
  "src/lib/landing",
  "src/lib/low-data",
  "src/lib/network",
  "src/lib/offline",
  "src/lib/partnerships",
  "src/lib/pwa",
  "src/lib/security",
  "src/lib/subscription",
  "src/lib/supabase",
  "src/store",
  "src/types",
  "public/icons",
  "public/landing",
];

/**
 * Shared infrastructure that must stay byte-aligned with production.
 * New folders under these paths are included on the next export automatically
 * (directory copies are recursive).
 */
export const INFRASTRUCTURE_DIRS = [
  "src/lib/observability",
  "src/lib/security",
  "src/lib/errors",
  "src/lib/env",
  "src/lib/supabase",
  "src/lib/concurrency",
  "src/lib/network",
  "src/lib/low-data",
];

/** Root/shared files that are not under COPY_DIRS. */
export const COPY_FILES = [
  "src/lib/constants.ts",
  "src/lib/audit.ts",
  "src/lib/env.ts",
  "src/lib/utils.ts",
  "src/lib/validations.ts",
  "src/lib/subscription.ts",
  "src/lib/pagination.ts",
  "src/lib/ui/hero-lucide-icon.ts",
  "src/lib/attendance/constants.ts",
  "src/lib/attendance/device-identity.ts",
  "src/lib/attendance/device-verification.ts",
  "src/components/lucide-icons.tsx",
  "src/app/globals.css",
  "src/app/admin-portal-animations.css",
  "src/app/mobile-layout.css",
  "src/proxy.ts",
  "src/instrumentation.ts",
  "src/instrumentation-client.ts",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
  "public/favicon.ico",
  "public/robots.txt",
  "postcss.config.mjs",
  "eslint.config.mjs",
];

export const COPY_SHARED_FILES = [
  "src/components/shared/deferred-select.tsx",
  "src/components/shared/stat-card.tsx",
  "src/components/shared/table-pagination.tsx",
];

export const COPY_UI_FILES = [
  "src/components/ui/badge.tsx",
  "src/components/ui/button.tsx",
  "src/components/ui/card.tsx",
  "src/components/ui/dialog.tsx",
  "src/components/ui/input.tsx",
  "src/components/ui/label.tsx",
  "src/components/ui/password-input.tsx",
  "src/components/ui/select.tsx",
  "src/components/ui/table.tsx",
];

export const ADMIN_PRUNE_PATHS = [
  "src/components/errors/data-fetch-error.tsx",
  "src/components/errors/form-error-message.tsx",
  "src/components/errors/offline-cache-writer.tsx",
  "src/lib/subscription/guards.ts",
  "src/app/api/auth/login/route.ts",
  "src/app/api/auth/resolve-login/route.ts",
  "src/app/api/auth/check-signup-identifier/route.ts",
  "src/app/api/auth/finalize-phone-signup/route.ts",
  "src/app/api/auth/activate-phone-account/route.ts",
  "src/app/api/auth/check-phone/route.ts",
  "src/app/api/auth/acknowledge-portal-onboarding/route.ts",
  "src/lib/attendance/qr-rotation.ts",
  "src/lib/attendance/present-records.ts",
  "src/lib/attendance/sessions.ts",
  "src/lib/attendance/close-session.ts",
  "src/lib/attendance/end-on-unload.ts",
  "src/lib/attendance/fetch-all-present-students.ts",
];

export const ADMIN_TEMPLATES = {
  "src/components/auth/auth-form.tsx": "auth-form.tsx",
  "src/components/layout/dashboard-shell.tsx": "dashboard-shell.tsx",
  "src/components/layout/dashboard-sidebar.tsx": "dashboard-sidebar.tsx",
  "src/lib/utils.ts": "utils.ts",
  "src/lib/auth/cached-queries.ts": "cached-queries.ts",
  "src/lib/subscription.ts": "subscription.ts",
};

/**
 * Always pin these production packages into the admin export when present
 * on the main app (framework upgrades propagate via root package.json).
 */
export const REQUIRED_ADMIN_DEPENDENCIES = [
  "@hookform/resolvers",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-label",
  "@radix-ui/react-select",
  "@radix-ui/react-slot",
  "@radix-ui/react-tabs",
  "@radix-ui/react-toast",
  "@sentry/nextjs",
  "@supabase/ssr",
  "@supabase/supabase-js",
  "@upstash/ratelimit",
  "@upstash/redis",
  "class-variance-authority",
  "clsx",
  "date-fns",
  "framer-motion",
  "lucide-react",
  "next",
  "react",
  "react-dom",
  "react-hook-form",
  "react-is",
  "recharts",
  "server-only",
  "tailwind-merge",
  "zod",
  "zustand",
];

export const REQUIRED_ADMIN_DEV_DEPENDENCIES = [
  "@tailwindcss/postcss",
  "@types/node",
  "@types/react",
  "@types/react-dom",
  "@typescript-eslint/parser",
  "eslint",
  "eslint-config-next",
  "tailwindcss",
  "typescript",
];

/** Files/dirs owned by the export (compared during parity checks). */
export const EXPORT_OWNED_ROOT_ENTRIES = [
  "src",
  "public",
  "package.json",
  "next.config.ts",
  "tsconfig.json",
  ".env.example",
  ".gitignore",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "next-env.d.ts",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
];

/** Ignore noise when comparing committed deploy/ vs a fresh export. */
export const PARITY_IGNORE_BASENAMES = new Set([
  "package-lock.json",
  "node_modules",
  ".next",
  ".git",
  ".env",
  ".env.local",
  ".env.production.local",
]);
