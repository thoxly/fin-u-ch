import { test, expect } from '@playwright/test';

test.describe('Reports Page', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/reports');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display login page after redirect', async ({ page }) => {
    await page.goto('/reports');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);

    // Check login form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/login');

    // Check that page has a title
    await expect(page).toHaveTitle(/Fin-U-CH/);
  });
});
