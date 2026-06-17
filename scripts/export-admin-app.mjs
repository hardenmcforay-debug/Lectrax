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
  "src/components/admin",
  "src/components/auth",
  "src/components/errors",
  "src/components/layout",
  "src/components/shared",
  "src/components/ui",
  "src/lib/admin",
  "src/lib/auth",
  "src/lib/contact",
  "src/lib/errors",
  "src/lib/hooks",
  "src/lib/landing",
  "src/lib/low-data",
  "src/lib/partnerships",
  "src/lib/pwa",
  "src/lib/subscription",
  "src/lib/supabase",
  "src/types",
  "public/icons",
];

const COPY_FILES = [
  "src/lib/constants.ts",
  "src/lib/env.ts",
  "src/lib/utils.ts",
  "src/lib/validations.ts",
  "src/app/globals.css",
  "src/app/admin-portal-animations.css",
  "src/app/mobile-layout.css",
  "src/middleware.ts",
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

function writeAdminConfigs() {
  writeFileSync(
    join(OUT, "next.config.ts"),
    `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
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
NEXT_PUBLIC_APP_URL=http://localhost:3001
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
import { APP_DESCRIPTION, APP_NAME, BRAND } from "@/lib/constants";
import { PlatformErrorProvider } from "@/components/errors/platform-error-provider";
import { PlatformErrorBoundary } from "@/components/errors/platform-error-boundary";
import { SiteBrandingProvider } from "@/components/layout/site-branding-provider";
import { getSiteLogoUrl } from "@/lib/landing/site-branding";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: BRAND.primary,
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: \`Admin | \${APP_NAME}\`,
    template: \`%s | Admin | \${APP_NAME}\`,
  },
  description: APP_DESCRIPTION,
  robots: { index: false, follow: false },
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
      <body className={\`\${geistSans.variable} \${geistMono.variable} antialiased\`}>
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
      </div>
    </div>
  );
}
`
  );
}

function patchAuthFormForAdminOnly() {
  const authFormPath = join(OUT, "src/components/auth/auth-form.tsx");
  if (!existsSync(authFormPath)) return;

  let content = readFileSync(authFormPath, "utf8");
  if (!content.includes("adminOnly")) {
    content = content.replace(
      "export function LoginForm() {",
      "export function LoginForm({ adminOnly = false }: { adminOnly?: boolean } = {}) {"
    );
    content = content.replace(
      `      if (!role) {
        await supabase.auth.signOut();
        setError(
          networkFailure
            ? getAuthNetworkMessage("session")
            : toAuthMessage(
                "Sign In Failed",
                "Could not verify your account. Please try again or contact support.",
                true
              )
        );
        return;
      }

      redirectAfterAuth(role, searchParams.get("redirect"));`,
      `      if (!role) {
        await supabase.auth.signOut();
        setError(
          networkFailure
            ? getAuthNetworkMessage("session")
            : toAuthMessage(
                "Sign In Failed",
                "Could not verify your account. Please try again or contact support.",
                true
              )
        );
        return;
      }

      if (adminOnly && role !== "platform_admin") {
        await supabase.auth.signOut();
        setError(
          toAuthMessage(
            "Access Denied",
            "This sign-in page is for platform administrators only. Lecturers and students should use the main Lectrax app.",
            false
          )
        );
        return;
      }

      redirectAfterAuth(role, searchParams.get("redirect"));`
    );
    writeFileSync(authFormPath, content);
  }
}

function main() {
  console.log("Exporting Lectrax platform admin to deploy/lectrax-admin ...");

  if (existsSync(OUT)) {
    rmSync(OUT, { recursive: true, force: true });
  }
  mkdirSync(OUT, { recursive: true });

  for (const dir of COPY_DIRS) {
    copyFromRoot(dir);
  }

  for (const file of COPY_FILES) {
    copyFromRoot(file);
  }

  writeAdminPackageJson();
  writeAdminConfigs();
  writeAdminAppShell();
  patchAuthFormForAdminOnly();

  console.log("Done. Next steps:");
  console.log("  cd deploy/lectrax-admin");
  console.log("  npm install");
  console.log("  cp .env.example .env.local");
  console.log("  npm run dev");
}

main();
