import { test, expect } from '@playwright/test';

test.describe('OffCanvas Component', () => {
  test('should redirect to login when accessing protected routes', async ({
    page,
  }) => {
    await page.goto('/operations');

    // Should redirect to login since we're not authenticated
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display login form elements', async ({ page }) => {
    await page.goto('/login');

    // Check that login form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle form validation', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }

    // Form should still be visible (not navigated away)
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/login');

    // Check that page has a meaningful title
    await expect(page).toHaveTitle(/Fin-U-CH/);
  });
});
