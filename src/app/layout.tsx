import type { Metadata, Viewport } from "next";
import "./globals.css";
import { APP_DESCRIPTION, APP_NAME, BRAND } from "@/lib/constants";
import { PlatformErrorProvider } from "@/components/errors/platform-error-provider";
import { PlatformErrorBoundary } from "@/components/errors/platform-error-boundary";
import { SiteBrandingProvider } from "@/components/layout/site-branding-provider";
import { getSiteLogoUrl } from "@/lib/landing/site-branding";
import { PortalChromeSync } from "@/components/pwa/portal-chrome-sync";
import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import { PasswordRecoverySessionBootstrap } from "@/components/auth/password-recovery-session-bootstrap";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { PwaBootstrapScripts } from "@/components/pwa/pwa-bootstrap-scripts";
import { PwaHeadLinks } from "@/components/pwa/pwa-head-links";

const pageTitle = `${APP_NAME} | Modern Academic Management Platform`;

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
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.json",
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
    title: APP_NAME,
    statusBarStyle: "default",
  },
  openGraph: {
    title: pageTitle,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: APP_DESCRIPTION,
  },
  other: {
    "apple-mobile-web-app-title": APP_NAME,
    "mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let logoUrl: string | null = null;
  try {
    logoUrl = await getSiteLogoUrl();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[RootLayout] Failed to load site logo:", error);
    }
  }

  return (
    <html lang="en" className="low-data-mode" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <PwaHeadLinks />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <PwaBootstrapScripts />
        <PwaProvider />
        <AuthSessionSync />
        <PasswordRecoverySessionBootstrap />
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
