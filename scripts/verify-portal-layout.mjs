/**
 * Verifies portal shell layout: bottom nav stays in viewport and content scrolls.
 * Run: node scripts/verify-portal-layout.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOBILE_LAYOUT_CSS = readFileSync(
  join(__dirname, "../src/app/mobile-layout.css"),
  "utf8"
);

const PORTAL_SHELL_HTML = (shellHeight) => `
<div class="portal-shell-root flex h-dvh min-h-0 overflow-hidden bg-slate-50" style="width:100%;height:${shellHeight}px;max-height:100dvh">
  <main class="portal-mobile-shell min-h-0 min-w-0 flex-1 overflow-hidden" style="width:100%;height:100%">
    <header class="portal-mobile-header portal-mobile-only" style="height:56px;background:#fff;border-bottom:1px solid #e2e8f0">Header</header>
    <div class="student-portal-content min-h-0 min-w-0">
      ${Array.from({ length: 40 }, (_, i) => `<p style="margin:0 0 1rem">Scroll block ${i + 1}</p>`).join("")}
    </div>
    <nav class="portal-mobile-bottom-nav portal-mobile-only" style="background:#0b3d91;color:#fff">
      <div class="portal-bottom-nav-bar" style="height:var(--portal-bottom-nav-height,4.25rem);display:flex;align-items:center;justify-content:center;padding-bottom:env(safe-area-inset-bottom,0px)">
        Bottom Nav
      </div>
    </nav>
  </main>
</div>
`;

async function runLayoutChecks(page, label) {
  const metrics = await page.evaluate(() => {
    const shell = document.querySelector(".portal-shell-root");
    const nav = document.querySelector(".portal-mobile-bottom-nav");
    const content = document.querySelector(".student-portal-content");
    const header = document.querySelector(".portal-mobile-header");

    if (!shell || !nav || !content || !header) {
      return { error: "Missing portal shell elements" };
    }

    const shellRect = shell.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const headerRect = header.getBoundingClientRect();
    const navStyle = getComputedStyle(nav);
    const contentStyle = getComputedStyle(content);
    const bodyStyle = getComputedStyle(document.body);
    const htmlStyle = getComputedStyle(document.documentElement);

    const navBottomGap = shellRect.bottom - navRect.bottom;
    const contentScrollable = content.scrollHeight > content.clientHeight + 4;

    const beforeScroll = content.scrollTop;
    content.scrollTop = 200;
    const scrolled = content.scrollTop > beforeScroll + 50;

    return {
      viewportHeight: window.innerHeight,
      shellHeight: shellRect.height,
      navDisplay: navStyle.display,
      navPosition: navStyle.position,
      navVisible: navRect.height > 0 && navStyle.display !== "none" && navStyle.visibility !== "hidden",
      navAtBottom: Math.abs(navBottomGap) <= 2,
      navBottomGap,
      navBelowHeader: navRect.top >= headerRect.bottom - 1,
      contentOverflowY: contentStyle.overflowY,
      contentScrollable,
      contentScrolled: scrolled,
      bodyOverflow: bodyStyle.overflow,
      htmlOverflow: htmlStyle.overflow,
      gridShell: getComputedStyle(document.querySelector(".portal-mobile-shell")).display === "grid",
    };
  });

  console.log(`\n[${label}]`, JSON.stringify(metrics, null, 2));

  const failures = [];
  if (metrics.error) failures.push(metrics.error);
  if (!metrics.navVisible) failures.push("bottom nav not visible");
  if (!metrics.navAtBottom) failures.push(`nav not flush with shell bottom (gap ${metrics.navBottomGap}px)`);
  if (metrics.navPosition === "fixed") failures.push("nav should not use position:fixed");
  if (!metrics.contentScrollable) failures.push("content area is not scrollable");
  if (!metrics.contentScrolled) failures.push("content did not scroll");
  if (metrics.bodyOverflow !== "hidden" && metrics.htmlOverflow !== "hidden") {
    failures.push("document scroll not locked");
  }
  if (!metrics.gridShell) failures.push("portal-mobile-shell is not display:grid on mobile");

  return failures;
}

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch {
    return chromium.launch({ channel: "msedge" });
  }
}

async function setupPortalPage(page, label) {
  const isWide = label.includes("wide");
  const viewport = isWide ? { width: 1280, height: 800 } : { width: 390, height: 844 };
  await page.setViewportSize(viewport);
  await page.goto("about:blank");
  await page.addStyleTag({
    content: `
      html, body { margin: 0; padding: 0; }
      .flex { display: flex; }
      .h-dvh { height: 100dvh; }
      .min-h-0 { min-height: 0; }
      .min-w-0 { min-width: 0; }
      .flex-1 { flex: 1 1 0%; }
      .overflow-hidden { overflow: hidden; }
      ${MOBILE_LAYOUT_CSS}
    `,
  });
  await page.evaluate(
    ({ html, shellHeight }) => {
      document.documentElement.dataset.pwaStandalone = "true";
      document.body.innerHTML = html;
    },
    { html: PORTAL_SHELL_HTML(viewport.height), shellHeight: viewport.height }
  );
  await page.waitForTimeout(100);
}

async function main() {
  const browser = await launchBrowser();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await setupPortalPage(mobilePage, "mobile PWA 390px");

  const mobileFailures = await runLayoutChecks(mobilePage, "mobile PWA 390px");

  const wideContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    isMobile: false,
  });
  const widePage = await wideContext.newPage();
  await setupPortalPage(widePage, "wide PWA 1280px");

  const wideFailures = await runLayoutChecks(widePage, "wide PWA 1280px");

  await browser.close();

  const allFailures = [...mobileFailures, ...wideFailures];
  if (allFailures.length > 0) {
    console.error("\nPortal layout verification FAILED:");
    for (const failure of allFailures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log("\nPortal layout verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
