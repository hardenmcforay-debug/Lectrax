import { test, expect } from "@playwright/test";
import {
  fillLoginForm,
  gotoLogin,
  hasLecturerCredentials,
  submitLogin,
  E2E,
} from "../helpers/auth";

test.describe("Logout", () => {
  test("login page exposes navigation back to landing", async ({ page }) => {
    await gotoLogin(page);
    await expect(page.getByRole("link", { name: /sign up|create account|home|lectrax/i }).first()).toBeVisible();
  });

  test("authenticated logout returns to login when credentials are configured", async ({
    page,
  }) => {
    test.skip(!hasLecturerCredentials(), "Set E2E_LECTURER_IDENTIFIER and E2E_LECTURER_PASSWORD");

    await gotoLogin(page);
    await fillLoginForm(page, E2E.lecturerIdentifier!, E2E.lecturerPassword!);
    await submitLogin(page);
    await expect(page).toHaveURL(/\/lecturer(\/|$)/, { timeout: 30_000 });

    const logout = page.getByRole("button", { name: /log out/i }).first();
    await expect(logout).toBeVisible();
    await logout.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  });
});
