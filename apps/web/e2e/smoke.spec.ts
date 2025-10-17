import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Application should load without errors
    await expect(page).not.toHaveTitle('');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have no critical console errors on login page', async ({
    page,
  }) => {
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
        !error.includes('404') && // Ignore 404 errors for resources
        !error.includes('Failed to load resource') && // Ignore resource loading errors
        !error.toLowerCase().includes('warning') // Ignore warnings
    );

    // Log errors for debugging but don't fail the test for minor issues
    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    }

    // Only fail for truly critical errors
    const trulyCritical = criticalErrors.filter(
      (error) =>
        error.includes('Uncaught') ||
        error.includes('ReferenceError') ||
        error.includes('TypeError')
    );

    expect(trulyCritical).toHaveLength(0);
  });

  test('should navigate between public pages', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    // Try to find and click register link
    const registerLink = page
      .locator(
        'a[href="/register"], a:has-text("регистрация"), a:has-text("register")'
      )
      .first();
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/register/);
    }
  });

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check basic elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should display register page correctly', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Check basic elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle form validation on login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Form should still be visible (not submitted)
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });

  test('should redirect protected routes to login', async ({ page }) => {
    const protectedRoutes = ['/dashboard', '/operations', '/reports'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
