import { test, expect } from '@playwright/test';

test.describe('Reports Page', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/reports');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display reports page when authenticated', async ({ page }) => {
    // Note: This test would need proper authentication setup
    test.skip(true, 'Requires authentication setup');

    await page.goto('/reports');

    await expect(page.locator('h1')).toContainText('Reports');
  });
});
