import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { APP_DESCRIPTION, BRAND } from "@/lib/constants";
import { getPwaAppName, pwaIconUrl } from "@/lib/pwa/config";
import { PlatformErrorProvider } from "@/components/errors/platform-error-provider";
import { PlatformErrorBoundary } from "@/components/errors/platform-error-boundary";
import { SiteBrandingProvider } from "@/components/layout/site-branding-provider";
import { getSiteLogoUrl } from "@/lib/landing/site-branding";
import { PortalChromeSync } from "@/components/pwa/portal-chrome-sync";
import { AuthSessionSync } from "@/components/auth/auth-session-sync";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { PwaHeadLinks } from "@/components/pwa/pwa-head-links";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const pwaAppName = getPwaAppName();
const pageTitle = `${pwaAppName} | Platform Administration`;

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
    template: `%s | ${pwaAppName}`,
  },
  description: APP_DESCRIPTION,
  applicationName: pwaAppName,
  manifest: pwaIconUrl("/manifest.json"),
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: pwaIconUrl("/favicon.ico"), sizes: "any" },
      { url: pwaIconUrl("/favicon-16x16.png"), sizes: "16x16", type: "image/png" },
      { url: pwaIconUrl("/favicon-32x32.png"), sizes: "32x32", type: "image/png" },
      { url: pwaIconUrl("/icons/icon-48x48.png"), sizes: "48x48", type: "image/png" },
      { url: pwaIconUrl("/icons/icon-192x192.png"), sizes: "192x192", type: "image/png" },
      { url: pwaIconUrl("/icons/icon-512x512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: pwaIconUrl("/icons/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: pwaIconUrl("/favicon.ico") }],
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PwaProvider />
        <PortalChromeSync />
        <AuthSessionSync />
        <SiteBrandingProvider logoUrl={logoUrl}>
          <PlatformErrorProvider>
            <PlatformErrorBoundary scope="root">{children}</PlatformErrorBoundary>
          </PlatformErrorProvider>
        </SiteBrandingProvider>
      </body>
    </html>
  );
}
