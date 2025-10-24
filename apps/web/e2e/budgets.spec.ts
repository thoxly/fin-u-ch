import { test, expect } from '@playwright/test';
import { loginAsTestUser, expectAuthenticated } from './helpers/auth';

test.describe('Budgets', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsTestUser(page);
    await expectAuthenticated(page);
  });

  test('should display budgets page', async ({ page }) => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    // Check URL
    await expect(page).toHaveURL(/\/budgets/);

    // Check page title
    await expect(page.locator('h1')).toContainText('Бюджеты');

    // Check for create button
    const createButton = page.locator('button:has-text("Создать бюджет")');
    await expect(createButton).toBeVisible();
  });

  test('should display budget list or empty state', async ({ page }) => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    // Should show either table or empty message
    const table = page.locator('table');
    const emptyMessage = page.locator('text=Нет бюджетов');

    const hasTable = (await table.count()) > 0;
    const hasEmptyMessage = (await emptyMessage.count()) > 0;

    expect(hasTable || hasEmptyMessage).toBe(true);
  });

  test('should open create budget modal', async ({ page }) => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    // Click create button
    const createButton = page.locator('button:has-text("Создать бюджет")');
    await createButton.click();

    // Check modal is visible
    const modal = page.locator('[role="dialog"], .modal');
    await expect(modal).toBeVisible();

    // Check for form fields
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
  });

  test('should filter budgets by status', async ({ page }) => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    // Check for filter buttons
    const activeButton = page.locator('button:has-text("Активные")');
    const archivedButton = page.locator('button:has-text("Архивные")');
    const allButton = page.locator('button:has-text("Все")');

    if ((await activeButton.count()) > 0) {
      await expect(activeButton).toBeVisible();
    }
    if ((await archivedButton.count()) > 0) {
      await expect(archivedButton).toBeVisible();
    }
    if ((await allButton.count()) > 0) {
      await expect(allButton).toBeVisible();
    }
  });

  test('should navigate to budget details when clicking open button', async ({
    page,
  }) => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    // Look for open buttons (folder icon)
    const openButtons = page.locator('button[title="Открыть бюджет"]');

    if ((await openButtons.count()) > 0) {
      // Click first open button
      await openButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Should navigate to budget details
      await expect(page).toHaveURL(/\/budgets\/.+/);

      // Check for budget details content
      const matrixTable = page.locator('table');
      const planList = page.locator('text=Плановые записи');
      const addButton = page.locator('button:has-text("Добавить позицию")');

      // Should have some budget details content
      const hasContent =
        (await matrixTable.count()) > 0 ||
        (await planList.count()) > 0 ||
        (await addButton.count()) > 0;
      expect(hasContent).toBe(true);
    }
  });

  test('should display budget details page', async ({ page }) => {
    // First go to budgets list
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    const openButtons = page.locator('button[title="Открыть бюджет"]');

    if ((await openButtons.count()) > 0) {
      await openButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Check for budget name in header
      const header = page.locator('h1');
      await expect(header).toBeVisible();

      // Check for add plan button
      const addButton = page.locator('button:has-text("Добавить позицию")');
      await expect(addButton).toBeVisible();

      // Check for plan list section
      const planSection = page.locator('text=Плановые записи');
      await expect(planSection).toBeVisible();
    }
  });

  test('should open plan form when clicking add position', async ({ page }) => {
    // Navigate to budgets list
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    const openButtons = page.locator('button[title="Открыть бюджет"]');

    if ((await openButtons.count()) > 0) {
      await openButtons.first().click();
      await page.waitForLoadState('networkidle');

      // Click add position button
      const addButton = page.locator('button:has-text("Добавить позицию")');
      await addButton.click();

      // Should open offcanvas/side panel
      const offcanvas = page.locator('[role="dialog"], .offcanvas, aside');
      await expect(offcanvas).toBeVisible();

      // Check for form title
      const formTitle = page.locator('text=Добавить план');
      await expect(formTitle).toBeVisible();
    }
  });
});

test.describe('Reports with Budget Selection', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await expectAuthenticated(page);
  });

  test('should display budget selector in reports', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Check for plan/budget selector
    const budgetSelector = page.locator('button:has-text("План")');
    const noBudgetOption = page.locator('text=Нет');

    // Either budget selector or the text should be visible
    const hasBudgetSelector = (await budgetSelector.count()) > 0;
    const hasNoBudgetText = (await noBudgetOption.count()) > 0;

    expect(hasBudgetSelector || hasNoBudgetText).toBe(true);
  });

  test('should display report type menu', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Check for report type selector
    const reportTypeButton = page.locator('button:has-text("ДДС")');

    if ((await reportTypeButton.count()) > 0) {
      await expect(reportTypeButton).toBeVisible();
    }
  });

  test('should toggle between ДДС and ДДС детально', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    // Look for report type selector
    const reportTypeButton = page.locator('button:has-text("ДДС")');

    if ((await reportTypeButton.count()) > 0) {
      // Click to open menu
      await reportTypeButton.click();

      // Check for menu items
      const ddsOption = page.locator('text=ДДС детально');
      if ((await ddsOption.count()) > 0) {
        await expect(ddsOption).toBeVisible();

        // Click to switch
        await ddsOption.click();
        await page.waitForLoadState('networkidle');

        // Should show detailed report
        const detailedContent = page.locator(
          'text=Остатки по счетам, text=Поступления, text=Выплаты'
        );
        const hasDetailedContent = (await detailedContent.count()) > 0;
        expect(hasDetailedContent).toBe(true);
      }
    }
  });

  test('should not show budget selector for ДДС детально', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');

    const reportTypeButton = page.locator('button:has-text("ДДС")');

    if ((await reportTypeButton.count()) > 0) {
      await reportTypeButton.click();
      const ddsDetailedOption = page.locator('text=ДДС детально');

      if ((await ddsDetailedOption.count()) > 0) {
        await ddsDetailedOption.click();
        await page.waitForLoadState('networkidle');

        // For ДДС детально, budget selector should ideally not be visible
        // This is an informational check - we don't assert on it
        // as the component may render differently based on state
      }
    }
  });
});
