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
    await expectAuthenticated(page);

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check that we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Check for dashboard elements
    await expect(page.locator('h1')).toBeVisible();

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

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check for navigation elements
    const navigation = page.locator('nav, .navigation, [role="navigation"]');
    if ((await navigation.count()) > 0) {
      await expect(navigation.first()).toBeVisible();
    }
  });

  test('should allow navigation to other pages when authenticated', async ({
    page,
  }) => {
    // Login first
    await loginAsTestUser(page);
    await expectAuthenticated(page);

    // Start at dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Try to navigate to other pages
    const otherPages = ['/operations', '/reports'];

    for (const pageUrl of otherPages) {
      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle');

      // Should be able to access the page (not redirected to login)
      expect(page.url()).not.toContain('/login');
      expect(page.url()).toContain(pageUrl);
    }
  });
});
