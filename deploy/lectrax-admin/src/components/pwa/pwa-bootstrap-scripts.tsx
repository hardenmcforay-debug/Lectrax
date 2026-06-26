import Script from "next/script";
import { PWA_INSTALL_BOOTSTRAP_SCRIPT } from "@/lib/pwa/install-prompt-bootstrap";
import { PORTAL_CHROME_BOOTSTRAP_SCRIPT } from "@/lib/pwa/portal-chrome-bootstrap";

/** Early bootstrap scripts — injected via next/script instead of a manual <head> block. */
export function PwaBootstrapScripts() {
  return (
    <>
      <Script id="lectrax-portal-chrome-bootstrap" strategy="beforeInteractive">
        {PORTAL_CHROME_BOOTSTRAP_SCRIPT}
      </Script>
      <Script id="lectrax-pwa-install-bootstrap" strategy="beforeInteractive">
        {PWA_INSTALL_BOOTSTRAP_SCRIPT}
      </Script>
    </>
  );
}
