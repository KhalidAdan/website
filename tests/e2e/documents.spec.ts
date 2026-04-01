import { expect, test } from "@playwright/test";

test.describe("documents", () => {
  test("shows placeholder when no document selected", async ({ page }) => {
    await page.goto("/md");
    await expect(page.getByText(/select a document/i)).toBeVisible();
  });

  test("selecting a document renders exactly one milkdown editor", async ({ page }) => {
    await page.goto("/md");

    // Wait for tree to load, then click first document (non-folder)
    const docButton = page.locator('[data-type="item"] button').first();
    await docButton.waitFor({ timeout: 10_000 });
    await docButton.click();

    // Wait for editor to initialize
    await page.locator(".milkdown .ProseMirror").first().waitFor({ timeout: 10_000 });

    // Must be exactly one editor instance - a second would mean the async
    // init raced with StrictMode's mount/unmount/remount cycle
    const editorCount = await page.locator(".milkdown .ProseMirror").count();
    expect(editorCount).toBe(1);
  });
});