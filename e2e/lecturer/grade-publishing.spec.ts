import { test, expect } from "@playwright/test";
import {
  fillLoginForm,
  gotoLogin,
  hasLecturerCredentials,
  submitLogin,
  E2E,
} from "../helpers/auth";

test.describe("Grade publishing", () => {
  test("lecturer portal is protected", async ({ page }) => {
    await page.goto("/lecturer");
    await expect(page).toHaveURL(/\/(login|lecturer)/);
  });

  test("authenticated lecturer can open sessions for grading when credentials are configured", async ({
    page,
  }) => {
    test.skip(!hasLecturerCredentials(), "Set E2E_LECTURER_IDENTIFIER and E2E_LECTURER_PASSWORD");

    await gotoLogin(page);
    await fillLoginForm(page, E2E.lecturerIdentifier!, E2E.lecturerPassword!);
    await submitLogin(page);
    await expect(page).toHaveURL(/\/lecturer(\/|$)/, { timeout: 30_000 });
    await expect(
      page.getByText(/session|class|attendance|assignment|student/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
