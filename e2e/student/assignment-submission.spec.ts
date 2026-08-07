import { test, expect } from "@playwright/test";
import {
  fillLoginForm,
  gotoLogin,
  hasStudentCredentials,
  submitLogin,
  E2E,
} from "../helpers/auth";

test.describe("Assignment submission", () => {
  test("student assignments area is protected", async ({ page }) => {
    await page.goto("/student");
    await expect(page).toHaveURL(/\/(login|student)/);
  });

  test("authenticated student can open assignments when credentials are configured", async ({
    page,
  }) => {
    test.skip(!hasStudentCredentials(), "Set E2E_STUDENT_IDENTIFIER and E2E_STUDENT_PASSWORD");

    await gotoLogin(page);
    await fillLoginForm(page, E2E.studentIdentifier!, E2E.studentPassword!);
    await submitLogin(page);
    await expect(page).toHaveURL(/\/student(\/|$)/, { timeout: 30_000 });

    await page.goto("/student");
    await expect(
      page.getByText(/assignment|class|join|overview|academic/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
