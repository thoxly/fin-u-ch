import { test, expect } from '@playwright/test';

test.describe('OffCanvas Component', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/operations');

    // Should redirect to login since we're not authenticated
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display login page elements', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
