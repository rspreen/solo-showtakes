/**
 * Browser test: the home page loads and shows the site name.
 * Exists mainly to prove the end-to-end test setup works (ticket 1).
 */
import { expect, test } from "@playwright/test";

test("home page shows the site name", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Showtakes");
  await expect(page.getByRole("heading", { name: "Showtakes" })).toBeVisible();
});
