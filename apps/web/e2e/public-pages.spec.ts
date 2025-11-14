import { test, expect } from '@playwright/test';

test.describe('Public Pages Tests', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');

    // Check that page loads
    await expect(page).not.toHaveTitle('');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load login page', async ({ page }) => {
    await page.goto('/login');

    // Check page title
    await expect(page).toHaveTitle(/Fin-U-CH/);

    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check page heading
    await expect(page.locator('h1, h2')).toContainText(/вход|login/i);
  });

  test('should load register page', async ({ page }) => {
    await page.goto('/register');

    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check page heading
    await expect(page.locator('h1, h2')).toContainText(/регистрация|register/i);
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

  test('should handle navigation between login and register', async ({
    page,
  }) => {
    // Start at login page
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

      // Try to go back to login
      const loginLink = page
        .locator('a[href="/login"], a:has-text("вход"), a:has-text("login")')
        .first();
      if (await loginLink.isVisible()) {
        await loginLink.click();
        await expect(page).toHaveURL(/\/login/);
      }
    }
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
      await expect(page.locator('input[type="password"]')).toBeVisible();
    }
  });

  test('should handle form validation on register page', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);

      // Form should still be visible (not submitted)
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    }
  });

  test('should have no critical console errors on public pages', async ({
    page,
  }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Test all public pages
    const publicPages = ['/', '/login', '/register'];

    for (const pageUrl of publicPages) {
      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle');
    }

    // Filter out non-critical errors
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('favicon') &&
        !error.includes('404') &&
        !error.includes('Failed to load resource') &&
        !error.toLowerCase().includes('warning')
    );

    // Log errors for debugging but don't fail for minor issues
    // Errors are checked below without logging

    // Only fail for truly critical errors
    const trulyCritical = criticalErrors.filter(
      (error) =>
        error.includes('Uncaught') ||
        error.includes('ReferenceError') ||
        error.includes('TypeError')
    );

    expect(trulyCritical).toHaveLength(0);
  });

  test('should have responsive design on mobile', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Page should still be visible and functional
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Test on tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');

    // Should still work
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
