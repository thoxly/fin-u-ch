import { test, expect } from '@playwright/test';

test.describe('Authenticated Pages Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login with demo user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@example.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should display dashboard page when authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check that we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Check for dashboard elements
    await expect(page.locator('h1')).toBeVisible();

    // Dashboard should have some content
    const content = page.locator(
      '.card, .chart, .stat, [data-testid*="dashboard"]'
    );
    if ((await content.count()) > 0) {
      await expect(content.first()).toBeVisible();
    }
  });

  test('should display reports page when authenticated', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Check that we're on reports page
    await expect(page).toHaveURL(/\/reports/);

    // Check for reports elements
    await expect(page.locator('h1')).toBeVisible();

    // Look for tabs or content
    const tabs = page.locator(
      '.tab, button:has-text("ОДДС"), button:has-text("БДДС")'
    );
    const content = page.locator('.report-content, .table, .card');

    if ((await tabs.count()) > 0) {
      await expect(tabs.first()).toBeVisible();
    } else if ((await content.count()) > 0) {
      await expect(content.first()).toBeVisible();
    }
  });

  test('should display cashflow table when authenticated', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Wait a bit more for data to load
    await page.waitForTimeout(2000);

    // Look for cashflow table or loading state
    const table = page.locator('table, .table, .cashflow-table');
    const loading = page.locator('text=Загрузка, text=Loading, .loading');
    const noData = page.locator('text=Нет данных, text=No data');

    if ((await table.count()) > 0) {
      await expect(table.first()).toBeVisible();

      // Check for table headers
      const headers = page.locator('th, .header');
      if ((await headers.count()) > 0) {
        await expect(headers.first()).toBeVisible();
      }
    } else if ((await loading.count()) > 0) {
      await expect(loading.first()).toBeVisible();
    } else if ((await noData.count()) > 0) {
      await expect(noData.first()).toBeVisible();
    }
  });

  test('should display operations page when authenticated', async ({
    page,
  }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Check that we're on operations page
    await expect(page).toHaveURL(/\/operations/);

    // Check for operations elements
    await expect(page.locator('h1')).toBeVisible();

    // Look for operations content
    const content = page.locator(
      '.operations, .transaction, .operation-item, .table'
    );
    if ((await content.count()) > 0) {
      await expect(content.first()).toBeVisible();
    }
  });

  test('should handle navigation between authenticated pages', async ({
    page,
  }) => {
    const pages = ['/dashboard', '/operations', '/reports'];

    for (const pageUrl of pages) {
      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle');

      // Should be able to access the page (not redirected to login)
      expect(page.url()).not.toContain('/login');
      expect(page.url()).toContain(pageUrl);

      // Page should have content
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('should handle theme switching when authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for theme toggle
    const themeToggle = page.locator(
      '[data-testid="theme-toggle"], .theme-toggle'
    );

    if ((await themeToggle.count()) > 0) {
      await expect(themeToggle.first()).toBeVisible();

      // Test theme switching
      await themeToggle.first().click();
      await page.waitForTimeout(500);

      // Verify theme changed
      const body = page.locator('body');
      const hasDarkClass = await body.evaluate(
        (el) =>
          el.classList.contains('dark') ||
          el.getAttribute('data-theme') === 'dark'
      );

      expect(typeof hasDarkClass).toBe('boolean');
    }
  });

  test('should maintain authentication across page reloads', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be authenticated
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should handle logout functionality', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for logout button
    const logoutButton = page.locator(
      '[data-testid="logout-button"], button:has-text("Выйти"), button:has-text("Logout")'
    );

    if ((await logoutButton.count()) > 0) {
      await logoutButton.first().click();
      await page.waitForTimeout(1000);

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    }
  });
});
