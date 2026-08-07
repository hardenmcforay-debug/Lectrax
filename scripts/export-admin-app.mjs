#!/usr/bin/env node
/**
 * Export a standalone Lectrax platform-admin Next.js app to deploy/lectrax-admin/.
 *
 * Usage:
 *   node scripts/export-admin-app.mjs
 *   LECTRAX_ADMIN_OUT=/tmp/admin-export node scripts/export-admin-app.mjs
 *
 * Shared infrastructure (observability, security, Sentry, Redis rate-limit deps,
 * proxy/instrumentation) is copied from the main app and kept version-aligned
 * with root package.json so framework upgrades propagate automatically.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADMIN_PRUNE_PATHS,
  ADMIN_TEMPLATES,
  COPY_DIRS,
  COPY_FILES,
  COPY_SHARED_FILES,
  COPY_UI_FILES,
  EXPORT_OWNED_ROOT_ENTRIES,
  INFRASTRUCTURE_DIRS,
  REQUIRED_ADMIN_DEPENDENCIES,
  REQUIRED_ADMIN_DEV_DEPENDENCIES,
} from "./admin-export-manifest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FINAL_OUT = process.env.LECTRAX_ADMIN_OUT
  ? join(process.env.LECTRAX_ADMIN_OUT)
  : join(ROOT, "deploy", "lectrax-admin");
/** Stage in a temp folder first so Windows locks under deploy/ don't stall cleans. */
let OUT = FINAL_OUT;

function copyFromRoot(relativePath, destRelative = relativePath) {
  const source = join(ROOT, relativePath);
  const destination = join(OUT, destRelative);
  if (!existsSync(source)) {
    throw new Error(`Missing source path: ${relativePath}`);
  }
  mkdirSync(dirname(destination), { recursive: true });
  console.log(`  copy ${relativePath}`);
  cpSync(source, destination, { recursive: true });
}

function removePathWithRetry(target, attempts = 5) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      if (!existsSync(target)) return;
      rmSync(target, { recursive: true, force: true });
      return;
    } catch (error) {
      if (i === attempts - 1) throw error;
      const waitUntil = Date.now() + 200 * (i + 1);
      while (Date.now() < waitUntil) {
        /* sync backoff for Windows file locks */
      }
    }
  }
}

function walkFiles(dir, predicate, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, predicate, acc);
      continue;
    }
    if (predicate(full, entry.name)) acc.push(full);
  }
  return acc;
}

function resolveLocalModule(baseDir, importPath) {
  const candidates = [
    `${importPath}.ts`,
    `${importPath}.tsx`,
    `${importPath}.js`,
    `${importPath}.mjs`,
    join(importPath, "index.ts"),
    join(importPath, "index.tsx"),
  ];
  for (const candidate of candidates) {
    const full = join(baseDir, candidate);
    if (existsSync(full) && statSync(full).isFile()) return full;
  }
  return null;
}

/**
 * Copy any missing @/ modules referenced by the admin tree from the main app
 * until the import graph closes. This picks up new shared infrastructure files
 * without requiring a manual manifest update for every leaf module.
 */
const AUTO_COPY_DENY_PREFIXES = [
  "app/lecturer/",
  "app/student/",
  "components/lecturer/",
  "components/student/",
  "lib/lecturer/",
  "lib/student/",
  "lib/attendance/qr-",
  "lib/ca/",
];

function copyMissingLocalImports(maxPasses = 12) {
  const outSrc = join(OUT, "src");
  const rootSrc = join(ROOT, "src");
  console.log("  resolving @/ import closure...");

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let copied = 0;
    const files = walkFiles(outSrc, (_full, name) => /\.(ts|tsx|js|mjs)$/.test(name));

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const match of content.matchAll(/from\s+["']@\/([^"']+)["']/g)) {
        const rel = match[1];
        if (resolveLocalModule(outSrc, rel)) continue;

        if (AUTO_COPY_DENY_PREFIXES.some((prefix) => rel.startsWith(prefix))) {
          throw new Error(
            `Admin export pulled disallowed module @/${rel} (from ${relative(OUT, file)})`
          );
        }

        const sourceFile = resolveLocalModule(rootSrc, rel);
        if (!sourceFile) {
          throw new Error(
            `Admin export unresolved @/${rel} (referenced from ${relative(OUT, file)})`
          );
        }

        const destFile = join(outSrc, relative(rootSrc, sourceFile));
        mkdirSync(dirname(destFile), { recursive: true });
        cpSync(sourceFile, destFile);
        copied += 1;
        console.log(`  + @/${rel}`);
      }
    }

    if (copied === 0) {
      console.log(`  import closure stable after ${pass + 1} pass(es)`);
      return;
    }
  }

  throw new Error("Admin export import closure did not stabilize; check circular/missing modules.");
}

function collectExternalPackagesFromTree() {
  const packages = new Set();
  const files = walkFiles(OUT, (_full, name) => /\.(ts|tsx|js|mjs)$/.test(name));

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(/from\s+["']([^./][^"']*)["']/g)) {
      const spec = match[1];
      if (spec.startsWith("@/")) continue;
      if (spec.startsWith("next/") || spec === "next") {
        packages.add("next");
        continue;
      }
      if (spec.startsWith("react/") || spec === "react" || spec === "react-dom") {
        packages.add(spec.startsWith("react-dom") ? "react-dom" : "react");
        continue;
      }
      if (spec.startsWith("@")) {
        const parts = spec.split("/");
        packages.add(parts.slice(0, 2).join("/"));
        continue;
      }
      packages.add(spec.split("/")[0]);
    }
  }

  return packages;
}

function pickDeps(rootSection, keys) {
  const out = {};
  for (const key of keys) {
    if (rootSection[key]) out[key] = rootSection[key];
  }
  return out;
}

function writeAdminPackageJson() {
  const rootPkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const discovered = collectExternalPackagesFromTree();

  const dependencyKeys = new Set(REQUIRED_ADMIN_DEPENDENCIES);
  for (const pkg of discovered) {
    if (rootPkg.dependencies?.[pkg]) dependencyKeys.add(pkg);
  }

  const adminPkg = {
    name: "lectrax-admin",
    version: rootPkg.version,
    private: true,
    scripts: {
      dev: "next dev -p 3001",
      build: "next build",
      start: "next start -p 3001",
      lint: "eslint . --max-warnings 0",
      typecheck: "tsc --noEmit",
    },
    dependencies: pickDeps(rootPkg.dependencies ?? {}, [...dependencyKeys].sort()),
    devDependencies: pickDeps(
      rootPkg.devDependencies ?? {},
      REQUIRED_ADMIN_DEV_DEPENDENCIES
    ),
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
import { withSentryConfig } from "@sentry/nextjs";
import { getAdminSecurityHeaderRoutes } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86_400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  turbopack: {
    resolveAlias: {
      "@hookform/resolvers/zod": "./node_modules/@hookform/resolvers/zod/dist/zod.js",
      "@hookform/resolvers": "./node_modules/@hookform/resolvers/dist/resolvers.js",
    },
  },
  async headers() {
    return getAdminSecurityHeaderRoutes();
  },
};

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: sentryAuthToken,
  silent: !sentryAuthToken,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
  sourcemaps: {
    disable: !sentryAuthToken,
    deleteSourcemapsAfterUpload: true,
  },
});
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
          jsx: "react-jsx",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./src/*"] },
        },
        include: [
          "next-env.d.ts",
          "**/*.ts",
          "**/*.tsx",
          ".next/types/**/*.ts",
          ".next/dev/types/**/*.ts",
        ],
        exclude: ["node_modules"],
      },
      null,
      2
    ) + "\n"
  );

  writeFileSync(
    join(OUT, ".env.example"),
    `# Lectrax platform-admin deployment (set all of these in Vercel → Settings → Environment Variables)
NEXT_PUBLIC_DEPLOYMENT_TARGET=admin
# This deployment's public URL (required in production)
NEXT_PUBLIC_APP_URL=http://localhost:3001
# Main lecturer/student app URL (used to redirect non-admin sign-ins)
NEXT_PUBLIC_MAIN_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Observability (Sentry) — optional until monitoring is enabled
# NEXT_PUBLIC_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
# SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
# SENTRY_AUTH_TOKEN=
# SENTRY_ORG=
# SENTRY_PROJECT=

# Distributed rate limiting (Upstash Redis) — required for multi-instance production enforcement.
# UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
# UPSTASH_REDIS_REST_TOKEN=

# Content-Security-Policy mode (nonce + strict-dynamic; no script 'unsafe-inline')
# report-only (default) | enforce | off
# CSP_MODE=report-only
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

function patchAdminValidations() {
  const validationsPath = join(OUT, "src/lib/validations.ts");
  if (!existsSync(validationsPath)) return;

  let validations = readFileSync(validationsPath, "utf8");
  validations = validations.replace(
    /export const loginSchema = z\.object\(\{\s*identifier: loginIdentifierField,\s*password: passwordField\(6, "Password must be at least 6 characters"\),\s*\}\);/,
    `export const loginSchema = z.object({
  email: emailField,
  password: passwordField(6, "Password must be at least 6 characters"),
});`
  );
  writeFileSync(validationsPath, validations);
}

function pruneAdminOnlyPaths() {
  for (const relativePath of ADMIN_PRUNE_PATHS) {
    const target = join(OUT, relativePath);
    if (existsSync(target)) {
      rmSync(target, { force: true, recursive: true });
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
      .replace(/@import "\.\/student-portal-animations\.css";\r?\n/g, "")
      .replace(/@import "\.\/lecturer-portal-animations\.css";\r?\n/g, "");
    writeFileSync(globalsCssPath, globalsCss);
  }
}

function publishStagedExport(stageDir) {
  mkdirSync(FINAL_OUT, { recursive: true });

  for (const entry of EXPORT_OWNED_ROOT_ENTRIES) {
    const staged = join(stageDir, entry);
    if (!existsSync(staged)) continue;

    const destination = join(FINAL_OUT, entry);
    console.log(`  publish ${entry}`);
    removePathWithRetry(destination);

    mkdirSync(dirname(destination), { recursive: true });
    try {
      renameSync(staged, destination);
    } catch {
      cpSync(staged, destination, { recursive: true });
      removePathWithRetry(staged);
    }
  }
}

function main() {
  const stageDir = mkdtempSync(join(tmpdir(), "lectrax-admin-export-"));
  OUT = stageDir;

  console.log(`Exporting Lectrax platform admin to ${FINAL_OUT}`);
  console.log(`  staging in ${stageDir}`);

  try {
    const dirs = [...new Set([...COPY_DIRS, ...INFRASTRUCTURE_DIRS])];
    for (const dir of dirs) {
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

    console.log("  writing admin configs/shell...");
    writeAdminConfigs();
    writeAdminPwaAssets();
    writeAdminAppShell();
    applyAdminTemplates();
    patchAdminValidations();
    pruneAdminOnlyPaths();
    copyMissingLocalImports();
    console.log("  writing package.json from main versions...");
    writeAdminPackageJson();

    // Next.js 16 uses `src/proxy.ts`. Drop any stale middleware entry.
    const staleMiddleware = join(OUT, "src/middleware.ts");
    if (existsSync(staleMiddleware)) {
      rmSync(staleMiddleware, { force: true });
    }

    publishStagedExport(stageDir);
  } finally {
    removePathWithRetry(stageDir);
  }

  console.log("Done. Next steps:");
  console.log(`  cd ${FINAL_OUT}`);
  console.log("  npm install");
  console.log("  cp .env.example .env.local");
  console.log("  npm run dev");
}

main();
