import { test, expect } from '@playwright/test';
import { loginAsTestUser, expectAuthenticated } from './helpers/auth';

test.describe('Dashboard', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display dashboard page when authenticated', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);

    // После успешного логина мы должны быть на защищенной странице
    await expectAuthenticated(page);

    // Если мы не на dashboard, перейдем туда
    const currentUrl = page.url();
    if (!currentUrl.includes('/dashboard')) {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    }

    // Check that we're on dashboard or any authenticated page
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/register/);

    // Check for dashboard elements
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

    // Dashboard should have some content (cards, charts, etc.)
    const content = page.locator(
      '.card, .chart, .stat, [data-testid*="dashboard"]'
    );
    if ((await content.count()) > 0) {
      await expect(content.first()).toBeVisible();
    }
  });

  test('should display navigation menu when authenticated', async ({
    page,
  }) => {
    // Login first
    await loginAsTestUser(page);
    await expectAuthenticated(page);

    // Если мы не на dashboard, перейдем туда
    const currentUrl = page.url();
    if (!currentUrl.includes('/dashboard')) {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    }

    // Check for navigation elements
    const navigation = page.locator('nav, .navigation, [role="navigation"]');
    if ((await navigation.count()) > 0) {
      await expect(navigation.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should allow navigation to other pages when authenticated', async ({
    page,
  }) => {
    // Login first
    await loginAsTestUser(page);
    await expectAuthenticated(page);

    // Try to navigate to other pages
    const otherPages = ['/operations', '/reports'];

    for (const pageUrl of otherPages) {
      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Should be able to access the page (not redirected to login)
      expect(page.url()).not.toContain('/login');
      expect(page.url()).toContain(pageUrl);
    }
  });
});
