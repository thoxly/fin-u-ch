import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display dashboard page when authenticated', async ({ page }) => {
    // Note: This test would need proper authentication setup
    // For now, we just check the structure
    test.skip(true, 'Requires authentication setup');

    await page.goto('/dashboard');

    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
