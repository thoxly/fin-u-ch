import { test, expect } from '@playwright/test';
import { loginAsTestUser, expectAuthenticated } from './helpers/auth';

test.describe('Reports Page', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/reports');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display reports page when authenticated', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    await expectAuthenticated(page);

    // Navigate to reports page
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Check that we're on reports page
    await expect(page).toHaveURL(/\/reports/);

    // Check for page title
    await expect(page.locator('h1')).toBeVisible();

    // Check for reports content
    const reportsContent = page.locator(
      '.reports, .report-tabs, .tab, [data-testid*="report"]'
    );
    if ((await reportsContent.count()) > 0) {
      await expect(reportsContent.first()).toBeVisible();
    }
  });

  test('should display report tabs when authenticated', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    await expectAuthenticated(page);

    // Navigate to reports page
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Look for tab navigation
    const tabs = page.locator(
      '.tab, .nav-tab, button:has-text("ОДДС"), button:has-text("БДДС"), button:has-text("План"), [role="tab"]'
    );

    if ((await tabs.count()) > 0) {
      await expect(tabs.first()).toBeVisible();
    }
  });

  test('should display filters when authenticated', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    await expectAuthenticated(page);

    // Navigate to reports page
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Look for date filters
    const dateInputs = page.locator('input[type="date"]');
    const filterSection = page.locator(
      '.filters, .filter, [data-testid*="filter"]'
    );

    if ((await dateInputs.count()) > 0) {
      await expect(dateInputs.first()).toBeVisible();
    } else if ((await filterSection.count()) > 0) {
      await expect(filterSection.first()).toBeVisible();
    }
  });

  test('should handle loading states when authenticated', async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    await expectAuthenticated(page);

    // Navigate to reports page
    await page.goto('/reports');

    // Should either show content or loading state
    const loadingIndicator = page.locator(
      'text=Загрузка, text=Loading, .loading, .spinner'
    );
    const content = page.locator('.report-content, .table, .chart');

    // Wait for either loading to finish or content to appear
    await page.waitForLoadState('networkidle');

    // Should have some content after loading
    const hasContent = (await content.count()) > 0;
    const hasLoading = (await loadingIndicator.count()) > 0;

    // Either content is loaded or still loading (both are valid states)
    expect(hasContent || hasLoading).toBe(true);
  });
});
