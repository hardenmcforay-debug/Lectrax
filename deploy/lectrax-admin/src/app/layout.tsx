import type { Metadata, Viewport } from "next";
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
    default: `Admin | ${APP_NAME}`,
    template: `%s | Admin | ${APP_NAME}`,
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SiteBrandingProvider logoUrl={logoUrl}>
          <PlatformErrorProvider>
            <PlatformErrorBoundary scope="root">{children}</PlatformErrorBoundary>
          </PlatformErrorProvider>
        </SiteBrandingProvider>
      </body>
    </html>
  );
}
