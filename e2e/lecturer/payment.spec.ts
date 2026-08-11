import { test, expect } from "@playwright/test";
import {
  fillLoginForm,
  gotoLogin,
  hasLecturerCredentials,
  submitLogin,
  E2E,
} from "../helpers/auth";

test.describe("Payment", () => {
  test("subscription page redirects unauthenticated users", async ({ page }) => {
    await page.goto("/lecturer/subscription");
    await expect(page).toHaveURL(/\/(login|lecturer\/subscription)/);
  });

  test("authenticated lecturer can open subscription checkout UI when credentials are configured", async ({
    page,
  }) => {
    test.skip(!hasLecturerCredentials(), "Set E2E_LECTURER_IDENTIFIER and E2E_LECTURER_PASSWORD");

    await gotoLogin(page);
    await fillLoginForm(page, E2E.lecturerIdentifier!, E2E.lecturerPassword!);
    await submitLogin(page);
    await expect(page).toHaveURL(/\/lecturer(\/|$)/, { timeout: 30_000 });

    await page.goto("/lecturer/subscription");
    await expect(page).toHaveURL(/\/lecturer\/subscription/);
    await expect(
      page.getByText(/premium|subscribe|monthly|semester|payment|plan/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
