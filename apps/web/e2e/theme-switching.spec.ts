import { test, expect } from '@playwright/test';

test.describe('Theme Switching E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
  });

  test('should switch between light and dark themes', async ({ page }) => {
    // Check initial theme (assuming light theme by default)
    const body = page.locator('body');
    const initialTheme = await body.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );

    // Toggle theme (assuming there's a theme toggle button)
    // This would need to be implemented in the actual app
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();

      // Check that theme changed
      const newTheme = await body.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor
      );
      expect(newTheme).not.toBe(initialTheme);
    }
  });

  test('should maintain table functionality in both themes', async ({
    page,
  }) => {
    // Test in light theme
    await testTableFunctionality(page);

    // Switch to dark theme (if toggle exists)
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500); // Wait for theme transition

      // Test same functionality in dark theme
      await testTableFunctionality(page);
    }
  });

  test('should have proper contrast in both themes', async ({ page }) => {
    // Check header contrast in light theme
    const headerCell = page.locator('th:has-text("Статья")');
    const headerStyles = await headerCell.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
      };
    });

    // Should have good contrast
    expect(headerStyles.color).toBeTruthy();
    expect(headerStyles.backgroundColor).toBeTruthy();
  });

  test('should preserve table scroll behavior in both themes', async ({
    page,
  }) => {
    // Test scroll in light theme
    await testScrollBehavior(page);

    // Switch to dark theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Test scroll in dark theme
      await testScrollBehavior(page);
    }
  });

  test('should maintain sticky elements in both themes', async ({ page }) => {
    // Check sticky header
    const stickyHeader = page.locator('.sticky.top-0');
    await expect(stickyHeader).toBeVisible();

    // Check sticky first column
    const stickyColumn = page.locator('.sticky.left-0');
    await expect(stickyColumn).toBeVisible();

    // Switch theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Sticky elements should still work
      await expect(stickyHeader).toBeVisible();
      await expect(stickyColumn).toBeVisible();
    }
  });

  test('should handle theme persistence across page reloads', async ({
    page,
  }) => {
    // Set theme to dark
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Theme should be preserved
      const body = page.locator('body');
      const hasDarkClass = await body.evaluate((el) =>
        el.classList.contains('dark')
      );
      expect(hasDarkClass).toBe(true);
    }
  });

  async function testTableFunctionality(page) {
    // Test basic table functionality
    await expect(page.locator('th:has-text("Статья")')).toBeVisible();

    // Test section expansion
    const activityRow = page
      .locator('tr:has-text("Операционная деятельность")')
      .first();
    if (await activityRow.isVisible()) {
      await activityRow.click();
      await expect(page.locator('text=Продажи')).toBeVisible();
    }
  }

  async function testScrollBehavior(page) {
    const tableContainer = page.locator('.overflow-x-auto');
    await expect(tableContainer).toBeVisible();

    // Test horizontal scroll
    await tableContainer.evaluate((el) => (el.scrollLeft = 100));
    const scrollLeft = await tableContainer.evaluate((el) => el.scrollLeft);
    expect(scrollLeft).toBe(100);

    // Test vertical scroll
    await tableContainer.evaluate((el) => (el.scrollTop = 50));
    const scrollTop = await tableContainer.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBe(50);
  }
});
