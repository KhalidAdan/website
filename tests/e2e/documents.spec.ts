import { expect, test } from "@playwright/test";

test.describe("documents", () => {
  test("shows empty state when no documents", async ({ page }) => {
    await page.goto("/md");
    await expect(page.getByText(/no documents/i)).toBeVisible();
  });

  test("shows create buttons", async ({ page }) => {
    await page.goto("/md");
    await expect(page.getByRole("button", { name: /doc/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /folder/i })).toBeVisible();
  });

  test("shows placeholder when no document selected", async ({ page }) => {
    await page.goto("/md");
    await expect(page.getByText(/select a document/i)).toBeVisible();
  });
});