import { expect, test } from "@playwright/test";

test("home page renders the bootstrap welcome", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Personal Tracker" })).toBeVisible();
  await expect(page.getByText("v1 bootstrap OK")).toBeVisible();
});
