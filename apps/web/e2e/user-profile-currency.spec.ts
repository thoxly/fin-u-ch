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
    // Опции в select не видны напрямую, проверяем через value или textContent
    const options = currencySelect.locator('option');
    const optionTexts = await options.allTextContents();
    expect(optionTexts.some((text) => text.includes('RUB'))).toBe(true);
    expect(optionTexts.some((text) => text.includes('USD'))).toBe(true);
    expect(optionTexts.some((text) => text.includes('EUR'))).toBe(true);
    expect(optionTexts.some((text) => text.includes('CNY'))).toBe(true);
    expect(optionTexts.some((text) => text.includes('AMD'))).toBe(true);
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
    await page.waitForTimeout(1000); // Даем время для закрытия
    const modalTitle = page
      .locator('[data-testid="offcanvas-title"], h2:has-text("Мой профиль")')
      .first();
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });
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
    await page.waitForTimeout(1000); // Даем время для закрытия
    const modalTitle = page
      .locator('[data-testid="offcanvas-title"], h2:has-text("Мой профиль")')
      .first();
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });

    // Reload page and check that currency is persisted
    await page.reload();
    await page.waitForSelector('body', { timeout: 5000 });

    // Open profile modal again
    await page.getByRole('button', { name: /demo@example.com/i }).click();
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
    await page.waitForTimeout(1000); // Даем время для закрытия
    const modalTitle = page
      .locator('[data-testid="offcanvas-title"], h2:has-text("Мой профиль")')
      .first();
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });

    // Verify changes are saved by opening profile again
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Check that all changes are persisted
    const nameInput = page.getByPlaceholder('Введите имя');
    const surnameInput = page.getByPlaceholder('Введите фамилию');
    const companyInput = page.getByPlaceholder('Введите название компании');
    await expect(nameInput).toHaveValue('John');
    await expect(surnameInput).toHaveValue('Doe');
    await expect(companyInput).toHaveValue('Test Company Ltd');
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
    // Опции в select не видны напрямую, проверяем через value или textContent
    const options = currencySelect.locator('option');
    const optionTexts = await options.allTextContents();
    expect(
      optionTexts.some((text) => text.includes('RUB') && text.includes('₽'))
    ).toBe(true);
    expect(
      optionTexts.some((text) => text.includes('USD') && text.includes('$'))
    ).toBe(true);
    expect(
      optionTexts.some((text) => text.includes('EUR') && text.includes('€'))
    ).toBe(true);
    expect(
      optionTexts.some((text) => text.includes('JPY') && text.includes('¥'))
    ).toBe(true);
    expect(
      optionTexts.some((text) => text.includes('GBP') && text.includes('£'))
    ).toBe(true);
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

    // Wait for modal to close
    await page.waitForTimeout(500);
    const modalTitle = page
      .locator('[data-testid="offcanvas-title"], h2:has-text("Мой профиль")')
      .first();
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });

    // Open profile modal again
    await page.getByRole('button', { name: /demo@example.com/i }).click();
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
    await page.waitForTimeout(1000); // Даем время для закрытия
    const modalTitle = page
      .locator('[data-testid="offcanvas-title"], h2:has-text("Мой профиль")')
      .first();
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });

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
