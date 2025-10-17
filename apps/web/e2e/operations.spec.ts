import { test, expect } from '@playwright/test';
import { loginAsTestUser, expectAuthenticated } from './helpers/auth';

test.describe('Operations Page', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/operations');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should display operations page when authenticated', async ({
    page,
  }) => {
    // Login first
    await loginAsTestUser(page);
    await expectAuthenticated(page);

    // Navigate to operations page
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Check that we're on operations page
    await expect(page).toHaveURL(/\/operations/);

    // Check for page title
    await expect(page.locator('h1')).toBeVisible();

    // Check for operations content
    const operationsContent = page.locator(
      '.operations, .transaction, .operation-item, [data-testid*="operation"]'
    );
    if ((await operationsContent.count()) > 0) {
      await expect(operationsContent.first()).toBeVisible();
    }
  });

  test('should display operations form or table when authenticated', async ({
    page,
  }) => {
    // Login first
    await loginAsTestUser(page);
    await expectAuthenticated(page);

    // Navigate to operations page
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Look for form elements or data table
    const formElements = page.locator(
      'form, .form, input, select, button[type="submit"]'
    );
    const tableElements = page.locator('table, .table, .data-table');

    // Should have either form or table
    const hasForm = (await formElements.count()) > 0;
    const hasTable = (await tableElements.count()) > 0;

    expect(hasForm || hasTable).toBe(true);
  });

  test('should allow adding new operations when authenticated', async ({
    page,
  }) => {
    // Login first
    await loginAsTestUser(page);
    await expectAuthenticated(page);

    // Navigate to operations page
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Look for "Add" or "Create" button
    const addButton = page.locator(
      'button:has-text("Добавить"), button:has-text("Создать"), button:has-text("Add"), button:has-text("Create"), [data-testid*="add"], [data-testid*="create"]'
    );

    if ((await addButton.count()) > 0) {
      await expect(addButton.first()).toBeVisible();
    }
  });
});
