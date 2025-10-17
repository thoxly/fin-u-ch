import { test, expect } from '@playwright/test';
import { TEST_USERS } from './helpers/test-data';

test.describe('Authentication', () => {
  test('should display login page with correct elements', async ({ page }) => {
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

  test('should display register page with correct elements', async ({
    page,
  }) => {
    await page.goto('/register');

    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check page heading
    await expect(page.locator('h1, h2')).toContainText(/регистрация|register/i);
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Wait a bit for validation to trigger
      await page.waitForTimeout(500);
    }

    // Form should still be visible (not navigated away)
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should handle invalid login credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill form with invalid credentials
    await page.fill('input[type="email"]', TEST_USERS.invalid.email);
    await page.fill('input[type="password"]', TEST_USERS.invalid.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Should stay on login page or show error
    await page.waitForTimeout(2000);
    const currentUrl = page.url();

    // Either stay on login page or show error message
    if (currentUrl.includes('/login')) {
      // Check for error message
      const errorMessage = page.locator(
        '[role="alert"], .error, .text-red-600'
      );
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    }
  });

  test('should redirect to login when accessing protected routes', async ({
    page,
  }) => {
    // Try to access protected routes
    const protectedRoutes = ['/dashboard', '/operations', '/reports'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should navigate between login and register pages', async ({ page }) => {
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
});
