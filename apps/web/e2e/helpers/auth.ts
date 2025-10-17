import { Page, expect } from '@playwright/test';

/**
 * Выполняет вход в систему с тестовыми данными
 */
export async function loginAsTestUser(page: Page) {
  await page.goto('/login');

  // Заполняем форму входа с реальными тестовыми данными
  await page.fill('input[type="email"]', 'demo@example.com');
  await page.fill('input[type="password"]', 'demo123');

  // Отправляем форму
  await page.click('button[type="submit"]');

  // Ждем перенаправления на дашборд
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * Проверяет, что пользователь авторизован (находится на защищенной странице)
 */
export async function expectAuthenticated(page: Page) {
  // Проверяем, что мы не на странице входа
  await page.waitForLoadState('networkidle');
  const currentUrl = page.url();
  expect(currentUrl).not.toContain('/login');
  expect(currentUrl).not.toContain('/register');
}

/**
 * Выходит из системы
 */
export async function logout(page: Page) {
  // Ищем кнопку выхода (предполагаем, что она есть в Layout)
  const logoutButton = page.locator('[data-testid="logout-button"]');
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL('/login');
  }
}
