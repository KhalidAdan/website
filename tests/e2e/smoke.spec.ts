import { expect, test } from "@playwright/test";

test.describe("smoke tests", () => {
  test("home page renders", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("khld.dev");
    await expect(page.locator("text=open editor")).toBeVisible();
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Log in to continue")).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test("signup page renders", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("text=Create your account")).toBeVisible();
    await expect(page.getByPlaceholder(/name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });
});