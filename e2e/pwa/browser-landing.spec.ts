import { test, expect } from "@playwright/test";

/**
 * Installing the Lectrax PWA must not force normal browser visits to `/`
 * into the application experience.
 */
test.describe("Browser vs installed PWA landing", () => {
  test("normal browser visit to `/` shows the public landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("[data-landing-root]")).toBeVisible();
    await expect(page).not.toHaveURL(/\/(login|student|lecturer|admin)(\/|$)/);
  });

  test("prior PWA install localStorage flag must not redirect `/` into the app", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("lectrax-pwa-installed", "1");
      } catch {
        // ignore
      }
    });

    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("[data-landing-root]")).toBeVisible({ timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/(login|student|lecturer|admin)(\/|$)/);
  });

  test("standalone display-mode launch of `/` enters the app (login), not the marketing site", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = ((query: string) => {
        if (
          query.includes("display-mode: standalone") ||
          query.includes("display-mode: fullscreen") ||
          query.includes("display-mode: minimal-ui")
        ) {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() {
              return false;
            },
          } as MediaQueryList;
        }
        return original(query);
      }) as typeof window.matchMedia;
    });

    await page.goto("/");
    await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 20_000 });
    await expect(page.locator("[data-landing-root]")).toHaveCount(0);
  });
});
