#!/usr/bin/env node
/**
 * Export a standalone Lectrax platform-admin Next.js app to deploy/lectrax-admin/.
 *
 * Usage:
 *   node scripts/export-admin-app.mjs
 *
 * Push to a separate repository:
 *   cd deploy/lectrax-admin
 *   git init
 *   git remote add origin <your-admin-repo-url>
 *   git add .
 *   git commit -m "Export Lectrax platform admin"
 *   git push -u origin main
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "deploy", "lectrax-admin");

const COPY_DIRS = [
  "src/app/admin",
  "src/app/api/admin",
  "src/app/api/auth",
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
  "src/lib/contact",
  "src/lib/errors",
  "src/lib/hooks",
  "src/lib/landing",
  "src/lib/low-data",
  "src/lib/partnerships",
  "src/lib/pwa",
  "src/lib/security",
  "src/lib/subscription",
  "src/lib/supabase",
  "src/types",
  "public/icons",
];

const COPY_SHARED_FILES = [
  "src/components/shared/stat-card.tsx",
  "src/components/shared/table-pagination.tsx",
];

const COPY_UI_FILES = [
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

const ADMIN_PRUNE_PATHS = [
  "src/components/errors/data-fetch-error.tsx",
  "src/components/errors/form-error-message.tsx",
  "src/components/errors/offline-cache-writer.tsx",
  "src/lib/subscription/guards.ts",
];

const ADMIN_TEMPLATES = {
  "src/components/auth/auth-form.tsx": "auth-form.tsx",
  "src/components/layout/dashboard-shell.tsx": "dashboard-shell.tsx",
  "src/components/layout/dashboard-sidebar.tsx": "dashboard-sidebar.tsx",
  "src/lib/utils.ts": "utils.ts",
  "src/lib/auth/cached-queries.ts": "cached-queries.ts",
  "src/lib/subscription.ts": "subscription.ts",
};

const COPY_FILES = [
  "src/lib/constants.ts",
  "src/lib/audit.ts",
  "src/lib/env.ts",
  "src/lib/utils.ts",
  "src/lib/validations.ts",
  "src/lib/subscription.ts",
  "src/app/globals.css",
  "src/app/admin-portal-animations.css",
  "src/app/mobile-layout.css",
  "src/middleware.ts",
  "src/instrumentation.ts",
  "public/favicon.ico",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "next-env.d.ts",
];

function copyFromRoot(relativePath, destRelative = relativePath) {
  const source = join(ROOT, relativePath);
  const destination = join(OUT, destRelative);
  if (!existsSync(source)) {
    throw new Error(`Missing source path: ${relativePath}`);
  }
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

function writeAdminPackageJson() {
  const rootPkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const adminPkg = {
    name: "lectrax-admin",
    version: rootPkg.version,
    private: true,
    scripts: {
      dev: "next dev --turbopack -p 3001",
      build: "next build",
      start: "next start -p 3001",
      lint: "next lint",
      typecheck: "tsc --noEmit",
      "validate:https": "node ../../scripts/check-https.mjs",
      "validate:https:production": "node ../../scripts/check-https.mjs --production",
      prebuild: "node ../../scripts/check-https.mjs --production",
      postbuild: "node ../../scripts/check-https.mjs --production --scan-build",
    },
    dependencies: {
      "@hookform/resolvers": rootPkg.dependencies["@hookform/resolvers"],
      "@radix-ui/react-dialog": rootPkg.dependencies["@radix-ui/react-dialog"],
      "@radix-ui/react-dropdown-menu": rootPkg.dependencies["@radix-ui/react-dropdown-menu"],
      "@radix-ui/react-label": rootPkg.dependencies["@radix-ui/react-label"],
      "@radix-ui/react-select": rootPkg.dependencies["@radix-ui/react-select"],
      "@radix-ui/react-slot": rootPkg.dependencies["@radix-ui/react-slot"],
      "@radix-ui/react-tabs": rootPkg.dependencies["@radix-ui/react-tabs"],
      "@radix-ui/react-toast": rootPkg.dependencies["@radix-ui/react-toast"],
      "@supabase/ssr": rootPkg.dependencies["@supabase/ssr"],
      "@supabase/supabase-js": rootPkg.dependencies["@supabase/supabase-js"],
      "class-variance-authority": rootPkg.dependencies["class-variance-authority"],
      "clsx": rootPkg.dependencies["clsx"],
      "date-fns": rootPkg.dependencies["date-fns"],
      "framer-motion": rootPkg.dependencies["framer-motion"],
      "lucide-react": rootPkg.dependencies["lucide-react"],
      next: rootPkg.dependencies.next,
      react: rootPkg.dependencies.react,
      "react-dom": rootPkg.dependencies["react-dom"],
      "react-hook-form": rootPkg.dependencies["react-hook-form"],
      recharts: rootPkg.dependencies.recharts,
      "tailwind-merge": rootPkg.dependencies["tailwind-merge"],
      zod: rootPkg.dependencies.zod,
    },
    devDependencies: {
      "@eslint/eslintrc": rootPkg.devDependencies["@eslint/eslintrc"],
      "@tailwindcss/postcss": rootPkg.devDependencies["@tailwindcss/postcss"],
      "@types/node": rootPkg.devDependencies["@types/node"],
      "@types/react": rootPkg.devDependencies["@types/react"],
      "@types/react-dom": rootPkg.devDependencies["@types/react-dom"],
      eslint: rootPkg.devDependencies.eslint,
      "eslint-config-next": rootPkg.devDependencies["eslint-config-next"],
      tailwindcss: rootPkg.devDependencies.tailwindcss,
      typescript: rootPkg.devDependencies.typescript,
    },
    overrides: rootPkg.overrides,
  };
  writeFileSync(join(OUT, "package.json"), `${JSON.stringify(adminPkg, null, 2)}\n`);
}

function writeAdminPwaAssets() {
  copyFromRoot("public/manifest.admin.json", "public/manifest.json");
  copyFromRoot("public/sw-admin.js", "public/sw.js");
}

function writeAdminConfigs() {
  writeFileSync(
    join(OUT, "next.config.ts"),
    `import type { NextConfig } from "next";
import { getAdminSecurityHeaderRoutes } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    return getAdminSecurityHeaderRoutes();
  },
};

export default nextConfig;
`
  );

  writeFileSync(
    join(OUT, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./src/*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2
    ) + "\n"
  );

  writeFileSync(
    join(OUT, ".env.example"),
    `# Lectrax platform-admin deployment
NEXT_PUBLIC_DEPLOYMENT_TARGET=admin
# Development: http://localhost:3001 | Production: https://admin.lectrax.app (HTTPS required)
NEXT_PUBLIC_APP_URL=http://localhost:3001
# Development: http://localhost:3000 | Production: https://lectrax.app (HTTPS required)
NEXT_PUBLIC_MAIN_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
`
  );

  writeFileSync(
    join(OUT, ".gitignore"),
    `node_modules
.next
.env
.env.local
.env.production.local
`
  );
}

function writeAdminAppShell() {
  mkdirSync(join(OUT, "src/app/(auth)/login"), { recursive: true });

  writeFileSync(
    join(OUT, "src/app/layout.tsx"),
    `import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { APP_DESCRIPTION, BRAND } from "@/lib/constants";
import { getPwaAppName } from "@/lib/pwa/config";
import { PlatformErrorProvider } from "@/components/errors/platform-error-provider";
import { PlatformErrorBoundary } from "@/components/errors/platform-error-boundary";
import { SiteBrandingProvider } from "@/components/layout/site-branding-provider";
import { getSiteLogoUrl } from "@/lib/landing/site-branding";
import { PortalChromeSync } from "@/components/pwa/portal-chrome-sync";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { PwaHeadLinks } from "@/components/pwa/pwa-head-links";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const pwaAppName = getPwaAppName();
const pageTitle = \`\${pwaAppName} | Platform Administration\`;

export const viewport: Viewport = {
  themeColor: BRAND.primary,
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: pageTitle,
    template: \`%s | \${pwaAppName}\`,
  },
  description: APP_DESCRIPTION,
  applicationName: pwaAppName,
  manifest: "/manifest.json",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: pwaAppName,
    statusBarStyle: "default",
  },
  other: {
    "apple-mobile-web-app-title": pwaAppName,
    "mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let logoUrl: string | null = null;
  try {
    logoUrl = await getSiteLogoUrl();
  } catch {
    logoUrl = null;
  }

  return (
    <html lang="en" className="low-data-mode" suppressHydrationWarning>
      <head>
        <PwaHeadLinks />
      </head>
      <body className={\`\${geistSans.variable} \${geistMono.variable} antialiased\`}>
        <PwaProvider />
        <PortalChromeSync />
        <SiteBrandingProvider logoUrl={logoUrl}>
          <PlatformErrorProvider>
            <PlatformErrorBoundary scope="root">{children}</PlatformErrorBoundary>
          </PlatformErrorProvider>
        </SiteBrandingProvider>
      </body>
    </html>
  );
}
`
  );

  writeFileSync(
    join(OUT, "src/app/page.tsx"),
    `import { redirect } from "next/navigation";
import { getAuthenticatedHomeRedirect } from "@/lib/auth/resolve-authenticated-home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dashboardPath = await getAuthenticatedHomeRedirect();
  redirect(dashboardPath ?? "/login");
}
`
  );

  writeFileSync(
    join(OUT, "src/app/(auth)/layout.tsx"),
    `import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="auth-route-root min-h-dvh bg-white">{children}</div>;
}
`
  );

  writeFileSync(
    join(OUT, "src/app/(auth)/login/page.tsx"),
    `import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-form";
import { InstallAppButton } from "@/components/pwa/install-app-button";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">Platform Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to manage Lectrax.</p>
        </div>
        <Suspense>
          <LoginForm adminOnly />
        </Suspense>
        <div className="mt-6 flex justify-center">
          <InstallAppButton />
        </div>
      </div>
    </div>
  );
}
`
  );
}

function pruneAdminOnlyPaths() {
  for (const relativePath of ADMIN_PRUNE_PATHS) {
    const target = join(OUT, relativePath);
    if (existsSync(target)) {
      rmSync(target, { force: true });
    }
  }
}

function applyAdminTemplates() {
  const templatesDir = join(__dirname, "admin-deploy-templates");

  for (const [destRelative, templateName] of Object.entries(ADMIN_TEMPLATES)) {
    const templatePath = join(templatesDir, templateName);
    const destination = join(OUT, destRelative);

    if (!existsSync(templatePath)) {
      throw new Error(`Missing admin template: ${templateName}`);
    }

    mkdirSync(dirname(destination), { recursive: true });
    cpSync(templatePath, destination);
  }

  const globalsCssPath = join(OUT, "src/app/globals.css");
  if (existsSync(globalsCssPath)) {
    let globalsCss = readFileSync(globalsCssPath, "utf8");
    globalsCss = globalsCss
      .replace('@import "./student-portal-animations.css";\n', "")
      .replace('@import "./lecturer-portal-animations.css";\n', "");
    writeFileSync(globalsCssPath, globalsCss);
  }
}

function main() {
  console.log("Exporting Lectrax platform admin to deploy/lectrax-admin ...");

  if (existsSync(OUT)) {
    for (const entry of ["src", "public", "package.json", "next.config.ts", "tsconfig.json", ".env.example", ".gitignore"]) {
      const target = join(OUT, entry);
      if (existsSync(target)) {
        rmSync(target, { recursive: true, force: true });
      }
    }
  } else {
    mkdirSync(OUT, { recursive: true });
  }

  for (const dir of COPY_DIRS) {
    copyFromRoot(dir);
  }

  for (const file of COPY_FILES) {
    copyFromRoot(file);
  }

  for (const file of COPY_SHARED_FILES) {
    copyFromRoot(file);
  }

  for (const file of COPY_UI_FILES) {
    copyFromRoot(file);
  }

  writeAdminPackageJson();
  writeAdminConfigs();
  writeAdminPwaAssets();
  writeAdminAppShell();
  applyAdminTemplates();
  pruneAdminOnlyPaths();

  console.log("Done. Next steps:");
  console.log("  cd deploy/lectrax-admin");
  console.log("  npm install");
  console.log("  cp .env.example .env.local");
  console.log("  npm run dev");
}

main();
