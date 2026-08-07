import { test, expect } from "@playwright/test";

test.describe("Password reset", () => {
  test("renders forgot-password form", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("button", { name: /send reset|reset|email/i })).toBeVisible();
    await expect(page.locator("#identifier, input[type='email'], input[name='identifier']").first()).toBeVisible();
  });

  test("validates invalid email before calling the API", async ({ page }) => {
    await page.goto("/forgot-password");
    const input = page.locator("#identifier, input[name='identifier'], input[type='email']").first();
    await input.fill("not-an-email");
    await page.getByRole("button", { name: /send reset|reset|email/i }).click();
    await expect(page.getByText(/valid|email/i).first()).toBeVisible();
  });
});
