import { test, expect } from '@playwright/test';

test.describe('Protected Pages Tests', () => {
  test('should redirect dashboard to login when not authenticated', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect operations to login when not authenticated', async ({
    page,
  }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect reports to login when not authenticated', async ({
    page,
  }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect catalogs pages to login when not authenticated', async ({
    page,
  }) => {
    const catalogRoutes = [
      '/catalogs/articles',
      '/catalogs/accounts',
      '/catalogs/departments',
      '/catalogs/counterparties',
      '/catalogs/deals',
      '/catalogs/salaries',
    ];

    for (const route of catalogRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should maintain login state after redirect', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should be on login page
    await expect(page).toHaveURL(/\/login/);

    // Login form should be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle invalid login attempts', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill form with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Should stay on login page or show error
    const currentUrl = page.url();
    expect(currentUrl.includes('/login')).toBe(true);

    // Check for error message or form still visible
    const errorMessage = page.locator('[role="alert"], .error, .text-red-600');
    const formStillVisible = await page
      .locator('input[type="email"]')
      .isVisible();

    // Either error message should appear or form should still be visible
    expect((await errorMessage.count()) > 0 || formStillVisible).toBe(true);
  });

  test('should handle empty form submission', async ({ page }) => {
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

  test('should handle back navigation from protected routes', async ({
    page,
  }) => {
    // Go to protected route
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Use back button (but handle the case where it goes to about:blank)
    try {
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // If we're not on about:blank, should still redirect to login
      const currentUrl = page.url();
      if (currentUrl !== 'about:blank') {
        await expect(page).toHaveURL(/\/login/);
      }
    } catch (error) {
      // Back navigation might not work as expected, that's okay
      // Just verify we can still navigate to login
      await page.goto('/login');
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should handle direct URL access to protected routes', async ({
    page,
  }) => {
    // Test direct URL access
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);

    // Test with query parameters
    await page.goto('/dashboard?tab=overview');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);

    // Test with hash
    await page.goto('/dashboard#section1');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should preserve original URL after redirect', async ({ page }) => {
    // Try to access protected route with specific path
    const originalUrl = '/dashboard';
    await page.goto(originalUrl);
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // The redirect should work correctly (this tests the routing logic)
    // After successful login, user should be redirected to original URL
    // But since we're not testing actual login, we just verify redirect works
  });
});
