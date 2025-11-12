import { test, expect } from '@playwright/test';
import { loginAsTestUser, expectAuthenticated } from './helpers/auth';

test.describe('User Menu', () => {
  test.beforeEach(async ({ page }) => {
    // Login test user
    await loginAsTestUser(page);
    await expectAuthenticated(page);
  });

  test('should display user menu with profile and logout options', async ({
    page,
  }) => {
    // Check that user menu is visible
    await expect(page.getByText('demo@example.com')).toBeVisible();

    // Click on user menu to open dropdown
    await page.getByRole('button', { name: /demo@example.com/i }).click();

    // Check that dropdown menu is visible with both options
    await expect(page.getByText('Мой профиль')).toBeVisible();
    await expect(page.getByText('Выйти')).toBeVisible();
  });

  test('should open profile modal when clicking "Мой профиль"', async ({
    page,
  }) => {
    // Open user menu
    await page.getByRole('button', { name: /demo@example.com/i }).click();

    // Click on profile option
    await page.getByText('Мой профиль').click();

    // Check that profile modal is opened
    await expect(page.getByText('Мой профиль')).toBeVisible();
    // Проверяем email через input с value или placeholder
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveValue(/demo@example\.com/);

    // Check that form fields are present
    await expect(page.getByPlaceholder('Введите имя')).toBeVisible();
    await expect(page.getByPlaceholder('Введите фамилию')).toBeVisible();
    await expect(
      page.getByPlaceholder('Введите название компании')
    ).toBeVisible();
  });

  test('should allow editing profile information', async ({ page }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Edit form fields
    await page.getByPlaceholder('Введите имя').fill('John');
    await page.getByPlaceholder('Введите фамилию').fill('Doe');
    await page
      .getByPlaceholder('Введите название компании')
      .fill('Test Company');

    // Save changes
    await page.getByRole('button', { name: /сохранить/i }).click();

    // Check that modal is closed after saving
    // Ждем закрытия модального окна (проверяем, что заголовок модального окна не виден)
    await page.waitForTimeout(1000); // Даем время для закрытия
    const modalTitle = page
      .locator('[data-testid="offcanvas-title"], h2:has-text("Мой профиль")')
      .first();
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });
  });

  test('should close profile modal when clicking cancel', async ({ page }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Click cancel button
    await page.getByRole('button', { name: /отмена/i }).click();

    // Check that modal is closed
    await page.waitForTimeout(500); // Даем время для закрытия
    const modalTitle = page
      .locator('[data-testid="offcanvas-title"], h2:has-text("Мой профиль")')
      .first();
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });
  });

  test('should close profile modal when clicking X button', async ({
    page,
  }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Click X button (ищем кнопку закрытия по aria-label или data-testid)
    const closeButton = page
      .locator(
        'button[aria-label*="закрыть" i], button[aria-label*="close" i], [data-testid*="close"]'
      )
      .first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Альтернатива: ищем кнопку с крестиком
      await page
        .locator('button:has(svg), button:has-text("×")')
        .first()
        .click();
    }

    // Check that modal is closed
    await page.waitForTimeout(500); // Даем время для закрытия
    const modalTitle = page
      .locator('[data-testid="offcanvas-title"], h2:has-text("Мой профиль")')
      .first();
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });
  });

  test('should logout when clicking "Выйти"', async ({ page }) => {
    // Open user menu
    await page.getByRole('button', { name: /demo@example.com/i }).click();

    // Click logout option
    await page.getByText('Выйти').click();

    // Check that user is redirected to login page
    await page.waitForURL('/login');
    await expect(page.getByText('Вход в систему')).toBeVisible();
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    // Open user menu
    await page.getByRole('button', { name: /demo@example.com/i }).click();

    // Check that dropdown is visible
    await expect(page.getByText('Мой профиль')).toBeVisible();

    // Click outside the dropdown
    await page.click('body', { position: { x: 10, y: 10 } });

    // Check that dropdown is closed
    await expect(page.getByText('Мой профиль')).not.toBeVisible();
  });

  test('should handle form validation', async ({ page }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Clear email field to test validation
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.clear();

    // Try to save with invalid email
    await page.getByRole('button', { name: /сохранить/i }).click();

    // Check that modal is still open (validation failed)
    await expect(page.getByText('Мой профиль')).toBeVisible();
  });

  test('should show loading state when saving profile', async ({ page }) => {
    // Open profile modal
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await page.getByText('Мой профиль').click();

    // Make a change
    await page.getByPlaceholder('Введите имя').fill('Updated Name');

    // Click save and check loading state
    await page.getByRole('button', { name: /сохранить/i }).click();

    // Check that loading state is shown (button text changes)
    await expect(page.getByText('Сохранение...')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that user menu is still visible and functional
    // На мобильных email может быть скрыт, но кнопка меню должна быть видна
    const userMenuButton = page.getByRole('button', {
      name: /demo@example.com/i,
    });
    await expect(userMenuButton).toBeVisible();

    // Test dropdown functionality on mobile
    await page.getByRole('button', { name: /demo@example.com/i }).click();
    await expect(page.getByText('Мой профиль')).toBeVisible();
    await expect(page.getByText('Выйти')).toBeVisible();
  });
});
