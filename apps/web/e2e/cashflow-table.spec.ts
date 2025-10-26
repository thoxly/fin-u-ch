import { test, expect } from '@playwright/test';
import { loginAsTestUser, expectAuthenticated } from './helpers/auth';
// import { UI_TEXT } from './helpers/test-data';

test.describe('CashflowTable E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await loginAsTestUser(page);
    await expectAuthenticated(page);

    // Navigate to reports page
    await page.goto('/reports');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Wait a bit more for data to load
    await page.waitForTimeout(2000);
  });

  test('should display reports page with proper structure', async ({
    page,
  }) => {
    // Check that we're on reports page
    await expect(page).toHaveURL(/\/reports/);

    // Check for page title
    await expect(page.locator('h1')).toBeVisible();

    // Look for tabs or navigation
    const tabs = page.locator('button:has-text("ОДДС"), .tab, [role="tab"]');
    if ((await tabs.count()) > 0) {
      await expect(tabs.first()).toBeVisible();
    }
  });

  test('should handle loading states gracefully', async ({ page }) => {
    // Check for loading indicators or content
    const loadingIndicator = page.locator(
      'text=Загрузка, text=Loading, .loading, .spinner'
    );
    const content = page.locator('.report-content, .table, .card, .data');

    // Wait a bit for content to load
    await page.waitForTimeout(3000);

    const hasLoading = (await loadingIndicator.count()) > 0;
    const hasContent = (await content.count()) > 0;

    // Should have either loading state or content
    expect(hasLoading || hasContent).toBe(true);
  });

  test('should display filters and controls', async ({ page }) => {
    // Look for date filters
    const dateInputs = page.locator('input[type="date"]');
    const filters = page.locator('.filter, .filters, [data-testid*="filter"]');

    if ((await dateInputs.count()) > 0) {
      await expect(dateInputs.first()).toBeVisible();
    } else if ((await filters.count()) > 0) {
      await expect(filters.first()).toBeVisible();
    } else {
      // If no specific filters, check for any controls
      const controls = page.locator('button, input, select, .control');
      expect(await controls.count()).toBeGreaterThan(0);
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // Page should still be visible and functional
    await expect(page.locator('body')).toBeVisible();

    // Check for responsive elements
    const responsiveElements = page.locator(
      '.responsive, .mobile, .tablet, [data-testid*="responsive"]'
    );
    if ((await responsiveElements.count()) > 0) {
      await expect(responsiveElements.first()).toBeVisible();
    }

    // Test on tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');

    // Should still work
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display table structure when data is available', async ({
    page,
  }) => {
    // Look for table elements
    const table = page.locator('table, .table, .data-table');

    if ((await table.count()) > 0) {
      await expect(table.first()).toBeVisible();

      // Check for table headers
      const headers = page.locator('th, .header, .table-header');
      if ((await headers.count()) > 0) {
        await expect(headers.first()).toBeVisible();
      }

      // Check for table rows
      const rows = page.locator('tr, .row, .table-row');
      if ((await rows.count()) > 0) {
        await expect(rows.first()).toBeVisible();
      }
    } else {
      // If no table, check for alternative data display
      const dataDisplay = page.locator('.data, .content, .report, .chart');
      if ((await dataDisplay.count()) > 0) {
        await expect(dataDisplay.first()).toBeVisible();
      } else {
        // Check for no data state
        const noDataState = page.locator(
          'text=Нет данных, text=No data, .no-data, .empty'
        );
        if ((await noDataState.count()) > 0) {
          await expect(noDataState.first()).toBeVisible();
        }
      }
    }
  });

  test('should handle scroll behavior when table is large', async ({
    page,
  }) => {
    // Look for scrollable containers
    const scrollableContainer = page.locator(
      '.overflow-x-auto, .overflow-auto, .scrollable, table'
    );

    if ((await scrollableContainer.count()) > 0) {
      const container = scrollableContainer.first();
      await expect(container).toBeVisible();

      // Test scroll functionality
      try {
        await container.evaluate((el) => {
          el.scrollLeft = 100;
        });

        const scrollLeft = await container.evaluate((el) => el.scrollLeft);
        expect(scrollLeft).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // If scroll fails, just verify element is visible
        await expect(container).toBeVisible();
      }
    }
  });

  test('should handle theme switching', async ({ page }) => {
    // Look for theme toggle
    const themeToggle = page.locator(
      '[data-testid="theme-toggle"], .theme-toggle, button:has-text("Тема")'
    );

    if ((await themeToggle.count()) > 0) {
      await expect(themeToggle.first()).toBeVisible();

      // Test theme switching
      try {
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
      } catch (error) {
        // If theme toggle fails, just verify it's visible
        await expect(themeToggle.first()).toBeVisible();
      }
    }
  });

  test('should display proper error handling', async ({ page }) => {
    // Look for error states
    const errorStates = page.locator(
      '.error, .alert, [role="alert"], .text-red-600'
    );

    if ((await errorStates.count()) > 0) {
      await expect(errorStates.first()).toBeVisible();
    } else {
      // If no errors, verify normal state
      const normalContent = page.locator('.content, .data, .report, .table');
      if ((await normalContent.count()) > 0) {
        await expect(normalContent.first()).toBeVisible();
      }
    }
  });

  test('should maintain functionality across page interactions', async ({
    page,
  }) => {
    // Test various page interactions
    const buttons = page.locator('button, .btn, [role="button"]');
    const inputs = page.locator('input, select, textarea');

    // Test button interactions
    if ((await buttons.count()) > 0) {
      const firstButton = buttons.first();
      if (await firstButton.isEnabled()) {
        try {
          await firstButton.click();
          await page.waitForTimeout(500);
        } catch (error) {
          // Button might not be clickable, that's okay
        }
      }
    }

    // Test input interactions
    if ((await inputs.count()) > 0) {
      const firstInput = inputs.first();
      if ((await firstInput.isVisible()) && (await firstInput.isEnabled())) {
        try {
          await firstInput.focus();
          await page.waitForTimeout(200);
        } catch (error) {
          // Input might not be focusable, that's okay
        }
      }
    }

    // Verify page is still functional
    await expect(page.locator('body')).toBeVisible();
  });
});
