import { test, expect } from "@playwright/test";
import {
  fillLoginForm,
  gotoLogin,
  hasLecturerCredentials,
  submitLogin,
  E2E,
} from "../helpers/auth";

test.describe("Login", () => {
  test("renders the login form", async ({ page }) => {
    await gotoLogin(page);
    await expect(page.locator("#identifier")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /forgot password/i })).toBeVisible();
  });

  test("shows validation errors for empty submit", async ({ page }) => {
    await gotoLogin(page);
    await submitLogin(page);
    await expect(page.getByText(/required|valid|password/i).first()).toBeVisible();
  });

  test("authenticated lecturer reaches portal when credentials are configured", async ({
    page,
  }) => {
    test.skip(!hasLecturerCredentials(), "Set E2E_LECTURER_IDENTIFIER and E2E_LECTURER_PASSWORD");

    await gotoLogin(page);
    await fillLoginForm(page, E2E.lecturerIdentifier!, E2E.lecturerPassword!);
    await submitLogin(page);
    await expect(page).toHaveURL(/\/lecturer(\/|$)/, { timeout: 30_000 });
  });
});
