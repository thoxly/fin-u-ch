import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';
// import { TEST_USERS } from './helpers/test-data';

test.describe('User Profile Currency Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test user
    await loginAsTestUser(page);
    await page.waitForURL('/dashboard');
  });

  test('should display currency selection dropdown in profile form', async ({
    page,
  }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Check that currency selection field is present
    await expect(page.getByText('Базовая валюта')).toBeVisible();

    // Check that currency dropdown is present
    const currencySelect = page.locator('select').last();
    await expect(currencySelect).toBeVisible();
  });

  test('should show all available currencies in dropdown', async ({ page }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Click on currency dropdown
    const currencySelect = page.locator('select').last();
    await currencySelect.click();

    // Check that major currencies are available
    await expect(page.getByText('RUB - Российский рубль (₽)')).toBeVisible();
    await expect(page.getByText('USD - Доллар США ($)')).toBeVisible();
    await expect(page.getByText('EUR - Евро (€)')).toBeVisible();
    await expect(page.getByText('CNY - Китайский юань (¥)')).toBeVisible();
    await expect(page.getByText('AMD - Армянский драм (֏)')).toBeVisible();
  });

  test('should allow selecting different currency', async ({ page }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Select USD currency
    const currencySelect = page.locator('select').last();
    await currencySelect.selectOption('USD');

    // Verify selection
    await expect(currencySelect).toHaveValue('USD');

    // Save changes
    await page.getByRole('button', { name: /сохранить/i }).click();

    // Wait for modal to close
    await expect(page.getByText('Мой профиль').first()).not.toBeVisible();
  });

  test('should save currency selection and persist on reload', async ({
    page,
  }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Select EUR currency
    const currencySelect = page.locator('select').last();
    await currencySelect.selectOption('EUR');

    // Save changes
    await page.getByRole('button', { name: /сохранить/i }).click();

    // Wait for modal to close
    await expect(page.getByText('Мой профиль').first()).not.toBeVisible();

    // Reload page and check that currency is persisted
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open profile modal again
    await page.getByRole('button', { name: /test@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Check that EUR is still selected
    const currencySelectAfterReload = page.locator('select').last();
    await expect(currencySelectAfterReload).toHaveValue('EUR');
  });

  test('should update both user info and company currency', async ({
    page,
  }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Update user information
    await page.getByPlaceholder('Введите имя').fill('John');
    await page.getByPlaceholder('Введите фамилию').fill('Doe');
    await page
      .getByPlaceholder('Введите название компании')
      .fill('Test Company Ltd');

    // Select currency
    const currencySelect = page.locator('select').last();
    await currencySelect.selectOption('USD');

    // Save changes
    await page.getByRole('button', { name: /сохранить/i }).click();

    // Wait for modal to close
    await expect(page.getByText('Мой профиль').first()).not.toBeVisible();

    // Verify changes are saved by opening profile again
    await page.getByRole('button', { name: /test@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Check that all changes are persisted
    await expect(page.getByDisplayValue('John')).toBeVisible();
    await expect(page.getByDisplayValue('Doe')).toBeVisible();
    await expect(page.getByDisplayValue('Test Company Ltd')).toBeVisible();
    await expect(currencySelect).toHaveValue('USD');
  });

  test('should handle currency selection with keyboard navigation', async ({
    page,
  }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Focus on currency select
    const currencySelect = page.locator('select').last();
    await currencySelect.focus();

    // Use keyboard to navigate and select
    await currencySelect.press('ArrowDown');
    await currencySelect.press('ArrowDown');
    await currencySelect.press('Enter');

    // Verify selection (should be second option)
    await expect(currencySelect).toHaveValue('AED');
  });

  test('should show proper currency symbols in dropdown options', async ({
    page,
  }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Click on currency dropdown
    const currencySelect = page.locator('select').last();
    await currencySelect.click();

    // Check that currency symbols are displayed correctly
    await expect(page.getByText('RUB - Российский рубль (₽)')).toBeVisible();
    await expect(page.getByText('USD - Доллар США ($)')).toBeVisible();
    await expect(page.getByText('EUR - Евро (€)')).toBeVisible();
    await expect(page.getByText('JPY - Японская иена (¥)')).toBeVisible();
    await expect(page.getByText('GBP - Британский фунт (£)')).toBeVisible();
  });

  test('should maintain currency selection when canceling changes', async ({
    page,
  }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Get initial currency value
    const currencySelect = page.locator('select').last();
    const initialValue = await currencySelect.inputValue();

    // Change currency
    await currencySelect.selectOption('EUR');

    // Cancel changes
    await page.getByRole('button', { name: /отмена/i }).click();

    // Open profile modal again
    await page.getByRole('button', { name: /test@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Check that currency is back to initial value
    const currencySelectAfterCancel = page.locator('select').last();
    await expect(currencySelectAfterCancel).toHaveValue(initialValue);
  });

  test('should handle form submission with currency change', async ({
    page,
  }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Make changes to all fields including currency
    await page.getByPlaceholder('Введите имя').fill('Updated Name');
    await page.getByPlaceholder('Введите фамилию').fill('Updated Surname');
    await page
      .getByPlaceholder('Введите название компании')
      .fill('Updated Company');

    // Select different currency
    const currencySelect = page.locator('select').last();
    await currencySelect.selectOption('CNY');

    // Submit form
    await page.getByRole('button', { name: /сохранить/i }).click();

    // Wait for success (modal should close)
    await expect(page.getByText('Мой профиль').first()).not.toBeVisible();

    // Verify no errors occurred
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('should be accessible with screen reader', async ({ page }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Check that currency field has proper label
    const currencyLabel = page.getByText('Базовая валюта');
    await expect(currencyLabel).toBeVisible();

    // Check that select has proper role
    const currencySelect = page.locator('select').last();
    await expect(currencySelect).toHaveAttribute('role', 'combobox');
  });
});
