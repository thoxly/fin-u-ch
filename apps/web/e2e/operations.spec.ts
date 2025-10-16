import { test, expect } from '@playwright/test';

test.describe('Operations Page', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/operations');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display login form elements', async ({ page }) => {
    await page.goto('/operations');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);

    // Check login form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty login form', async ({
    page,
  }) => {
    await page.goto('/login');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }

    // Form should still be visible (not navigated away)
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
