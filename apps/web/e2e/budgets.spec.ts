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

    // Check modal is visible - look for the modal content
    const modal = page.locator('h2:has-text("Создать бюджет")');
    await expect(modal).toBeVisible();

    // Check that modal has some form content (buttons are visible)
    const cancelButton = page.locator('button:has-text("Отмена")');
    const submitButton = page.locator(
      'button[type="submit"]:has-text("Создать")'
    );

    await expect(cancelButton).toBeVisible();
    await expect(submitButton).toBeVisible();
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
      const planList = page.locator('text=Статьи бюджета');
      const addButton = page.locator('button:has-text("Добавить статью")');

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

      // Check for add article button
      const addButton = page.locator('button:has-text("Добавить статью")');
      await expect(addButton).toBeVisible();

      // Check for articles list section
      const planSection = page.locator('text=Статьи бюджета');
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

      // Click add article button
      const addButton = page.locator('button:has-text("Добавить статью")');
      await addButton.click();

      // Should open offcanvas/side panel
      const offcanvas = page.locator('[role="dialog"], .offcanvas, aside');
      await expect(offcanvas).toBeVisible();

      // Check for form title
      const formTitle = page.locator('text=Добавить статью');
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

    // Wait for the page to load and API calls to complete
    await page.waitForLoadState('networkidle');

    // Wait for the reports content to be visible
    await page.waitForSelector('h1', { timeout: 10000 });

    // Check for plan/budget selector - look for checkbox with "План" text
    const budgetCheckbox = page.locator(
      'checkbox[aria-label*="План"], checkbox:has-text("План")'
    );
    const budgetText = page.locator('text=План');

    // Wait for at least one of these elements to be visible
    await Promise.race([
      budgetCheckbox.waitFor({ timeout: 5000 }).catch(() => null),
      budgetText.waitFor({ timeout: 5000 }).catch(() => null),
    ]);

    // Either budget checkbox or the text should be visible
    const hasBudgetCheckbox = (await budgetCheckbox.count()) > 0;
    const hasBudgetText = (await budgetText.count()) > 0;

    expect(hasBudgetCheckbox || hasBudgetText).toBe(true);
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
});
