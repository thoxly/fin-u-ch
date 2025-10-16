import { test, expect } from '@playwright/test';

test.describe('CashflowTable E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to reports page
    await page.goto('/reports');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display cashflow table with correct structure', async ({
    page,
  }) => {
    // Check if we're on the cashflow tab (should be default)
    await expect(page.locator('text=ОДДС (факт)')).toBeVisible();

    // Check table headers
    await expect(page.locator('th:has-text("Статья")')).toBeVisible();
    await expect(page.locator('th:has-text("Итого")')).toBeVisible();

    // Check for month headers (should show current and previous months)
    await expect(page.locator('th:has-text("янв")')).toBeVisible();
    await expect(page.locator('th:has-text("февр")')).toBeVisible();
  });

  test('should handle horizontal scroll within table only', async ({
    page,
  }) => {
    // Get the table container
    const tableContainer = page.locator('.overflow-x-auto');
    await expect(tableContainer).toBeVisible();

    // Check that the table container has proper scroll behavior
    const scrollContainer = await tableContainer.evaluate((el) => {
      const computedStyle = window.getComputedStyle(el);
      return {
        overflowX: computedStyle.overflowX,
        overflowY: computedStyle.overflowY,
      };
    });

    expect(scrollContainer.overflowX).toBe('auto');
    expect(scrollContainer.overflowY).toBe('auto');
  });

  test('should have frozen header and first column', async ({ page }) => {
    // Check for sticky header
    const stickyHeader = page.locator('.sticky.top-0');
    await expect(stickyHeader).toBeVisible();

    // Check for sticky first column
    const stickyColumn = page.locator('.sticky.left-0');
    await expect(stickyColumn).toBeVisible();

    // Verify z-index for proper layering
    const headerZIndex = await stickyHeader.evaluate(
      (el) => window.getComputedStyle(el).zIndex
    );
    expect(parseInt(headerZIndex)).toBeGreaterThan(0);
  });

  test('should toggle activity sections on click', async ({ page }) => {
    // Find an activity row and click it
    const activityRow = page
      .locator('tr:has-text("Операционная деятельность")')
      .first();
    await expect(activityRow).toBeVisible();

    // Click to expand
    await activityRow.click();

    // Check if detailed rows appear
    await expect(page.locator('text=Продажи')).toBeVisible();
    await expect(page.locator('text=Зарплата')).toBeVisible();

    // Click again to collapse
    await activityRow.click();

    // Detailed rows should be hidden
    await expect(page.locator('text=Продажи')).not.toBeVisible();
  });

  test('should show plan/fact columns when plan mode is enabled', async ({
    page,
  }) => {
    // Enable plan mode
    const planCheckbox = page.locator('input[type="checkbox"]');
    await planCheckbox.check();

    // Check for plan/fact headers
    await expect(page.locator('th:has-text("План")')).toBeVisible();
    await expect(page.locator('th:has-text("Факт")')).toBeVisible();
  });

  test('should display period information correctly', async ({ page }) => {
    // Check period display in header
    await expect(
      page.locator('text=Отчет о движении денежных средств')
    ).toBeVisible();

    // Check date format
    const periodText = await page
      .locator('text=Отчет о движении денежных средств')
      .textContent();
    expect(periodText).toMatch(/\d{2}\.\d{2}\.\d{4}/); // DD.MM.YYYY format
  });

  test('should show total cashflow and balance rows', async ({ page }) => {
    // Check for total rows
    await expect(page.locator('text=Общий денежный поток')).toBeVisible();
    await expect(page.locator('text=Остаток на конец периода')).toBeVisible();
  });

  test('should handle responsive design', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Table should still be visible and scrollable
    await expect(page.locator('.overflow-x-auto')).toBeVisible();

    // Test on tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Table should still work
    await expect(page.locator('th:has-text("Статья")')).toBeVisible();
  });

  test('should format money values correctly', async ({ page }) => {
    // Check that money values are formatted (assuming Russian formatting)
    const moneyCells = page.locator('td:has-text("₽")');
    const count = await moneyCells.count();
    expect(count).toBeGreaterThan(0);

    // Check for proper number formatting
    const firstMoneyCell = moneyCells.first();
    const text = await firstMoneyCell.textContent();
    expect(text).toMatch(/\d[\s\d]*\s*₽/); // Should contain formatted numbers with ₽
  });

  test('should maintain scroll position when expanding sections', async ({
    page,
  }) => {
    // Scroll to a specific position
    const tableContainer = page.locator('.overflow-x-auto');
    await tableContainer.evaluate((el) => (el.scrollLeft = 200));

    // Click to expand a section
    const activityRow = page
      .locator('tr:has-text("Операционная деятельность")')
      .first();
    await activityRow.click();

    // Scroll position should be maintained
    const scrollLeft = await tableContainer.evaluate((el) => el.scrollLeft);
    expect(scrollLeft).toBe(200);
  });
});
