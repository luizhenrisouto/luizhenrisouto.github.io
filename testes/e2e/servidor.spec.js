import { test, expect } from "@playwright/test";

test("serve a página inicial", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Luiz Henri Souto/);
});
