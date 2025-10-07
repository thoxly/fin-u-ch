import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Application should load without errors
    await expect(page).not.toHaveTitle('');
  });

  test('should have no console errors on login page', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Allow for known acceptable errors (if any)
    const criticalErrors = errors.filter(
      (error) => !error.includes('favicon') // Ignore favicon errors
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should navigate between public pages', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // Try to find and click register link
    const registerLink = page.getByRole('link', { name: /register/i }).first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/register/);
    }
  });
});
