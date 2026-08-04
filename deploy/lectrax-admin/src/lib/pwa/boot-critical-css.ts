/**
 * Inline in <head> so installed PWAs never paint the marketing site before JS runs.
 * Keep selectors in sync with LandingPage (`data-landing-root`) and launch-bootstrap.
 */
export const PWA_BOOT_CRITICAL_CSS = `
@media (display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui) {
  html {
    background: #ffffff !important;
  }
  [data-landing-root] {
    display: none !important;
  }
  html.pwa-booting,
  html.pwa-booting body {
    background: #ffffff !important;
    overflow: hidden !important;
  }
  #lectrax-pwa-boot-splash {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
    background: #ffffff;
    color: #0b3d91;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    text-align: center;
  }
  #lectrax-pwa-boot-splash .lectrax-boot-mark {
    width: 5.5rem;
    height: 5.5rem;
    border-radius: 1.35rem;
    background: #0b3d91 url("/icons/icon-512x512.png") center / contain no-repeat;
    box-shadow: 0 8px 24px rgba(11, 61, 145, 0.18);
  }
  #lectrax-pwa-boot-splash .lectrax-boot-title {
    margin: 1.25rem 0 0;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  #lectrax-pwa-boot-splash .lectrax-boot-sub {
    margin: 0.5rem 0 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: #0b3d91;
  }
}
html[data-pwa-standalone="true"] [data-landing-root] {
  display: none !important;
}
`.replace(/\s+/g, " ").trim();
