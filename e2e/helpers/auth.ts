import { expect, type Page } from "@playwright/test";

export const E2E = {
  lecturerIdentifier: process.env.E2E_LECTURER_IDENTIFIER,
  lecturerPassword: process.env.E2E_LECTURER_PASSWORD,
  studentIdentifier: process.env.E2E_STUDENT_IDENTIFIER,
  studentPassword: process.env.E2E_STUDENT_PASSWORD,
};

export function hasLecturerCredentials(): boolean {
  return Boolean(E2E.lecturerIdentifier && E2E.lecturerPassword);
}

export function hasStudentCredentials(): boolean {
  return Boolean(E2E.studentIdentifier && E2E.studentPassword);
}

export async function gotoLogin(page: Page) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
}

export async function fillLoginForm(page: Page, identifier: string, password: string) {
  await page.locator("#identifier").fill(identifier);
  await page.locator("#password").fill(password);
}

export async function submitLogin(page: Page) {
  await page.getByRole("button", { name: /^sign in$/i }).click();
}
