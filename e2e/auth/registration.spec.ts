import { test, expect } from "@playwright/test";

test.describe("Registration", () => {
  test("renders the signup form for student and lecturer roles", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
    await expect(page.locator("#fullName")).toBeVisible();
    await expect(page.locator("#identifier")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
  });

  test("blocks submit when passwords do not match", async ({ page }) => {
    await page.goto("/signup");
    await page.locator("#fullName").fill("E2E Student");
    await page.locator("#identifier").fill("e2e.student@example.com");
    await page.locator("#password").fill("password12");
    await page.locator("#confirmPassword").fill("password99");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/passwords don't match|do not match/i)).toBeVisible();
  });
});
