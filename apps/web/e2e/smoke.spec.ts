import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Application should load without errors
    await expect(page).not.toHaveTitle('');

    // Should redirect to login for unauthenticated users
    await expect(page).toHaveURL(/\/login/);
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
      (error) =>
        !error.includes('favicon') && // Ignore favicon errors
        !error.includes('404') && // Ignore 404 errors for missing assets
        !error.includes('Failed to load resource') // Ignore resource loading errors
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should display login form correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // Check that login form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/login');

    // Check that page has a meaningful title
    await expect(page).toHaveTitle(/Fin-U-CH/);
  });

  test('should handle navigation to protected routes', async ({ page }) => {
    // Try to access protected routes - should redirect to login
    const protectedRoutes = ['/dashboard', '/operations', '/reports'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
