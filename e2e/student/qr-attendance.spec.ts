import { test, expect } from "@playwright/test";
import {
  fillLoginForm,
  gotoLogin,
  hasStudentCredentials,
  submitLogin,
  E2E,
} from "../helpers/auth";

test.describe("QR attendance", () => {
  test("scan route requires auth or shows scan UI shell", async ({ page }) => {
    await page.goto("/student/scan");
    await expect(page).toHaveURL(/\/(login|student\/scan)/);
  });

  test("authenticated student can open scan page when credentials are configured", async ({
    page,
  }) => {
    test.skip(!hasStudentCredentials(), "Set E2E_STUDENT_IDENTIFIER and E2E_STUDENT_PASSWORD");

    await gotoLogin(page);
    await fillLoginForm(page, E2E.studentIdentifier!, E2E.studentPassword!);
    await submitLogin(page);
    await expect(page).toHaveURL(/\/student(\/|$)/, { timeout: 30_000 });

    await page.goto("/student/scan");
    await expect(page).toHaveURL(/\/student\/scan/);
    await expect(
      page.getByText(/scan|camera|qr|attendance/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
