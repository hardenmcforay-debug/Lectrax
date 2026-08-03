import Script from "next/script";
import { PWA_INSTALL_BOOTSTRAP_SCRIPT } from "@/lib/pwa/install-prompt-bootstrap";
import { PWA_LAUNCH_BOOTSTRAP_SCRIPT } from "@/lib/pwa/launch-bootstrap";
import { PORTAL_CHROME_BOOTSTRAP_SCRIPT } from "@/lib/pwa/portal-chrome-bootstrap";

/** Early bootstrap scripts — injected via next/script instead of a manual <head> block. */
export function PwaBootstrapScripts() {
  return (
    <>
      {/* App Router root-layout equivalent of pages/_document beforeInteractive. */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script id="lectrax-portal-chrome-bootstrap" strategy="beforeInteractive">
        {PORTAL_CHROME_BOOTSTRAP_SCRIPT}
      </Script>
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script id="lectrax-pwa-launch-bootstrap" strategy="beforeInteractive">
        {PWA_LAUNCH_BOOTSTRAP_SCRIPT}
      </Script>
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script id="lectrax-pwa-install-bootstrap" strategy="beforeInteractive">
        {PWA_INSTALL_BOOTSTRAP_SCRIPT}
      </Script>
    </>
  );
}
