import { Page } from '@playwright/test';

/**
 * Простая функция для тестирования без реальной аутентификации
 * Используется для тестов, которые должны работать без базы данных
 */
export async function mockAuthenticatedState(page: Page) {
  // Симулируем авторизованное состояние через localStorage
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'mock_token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 1, email: 'test@example.com' })
    );
  });
}

/**
 * Проверяет, что страница загружается без ошибок
 */
export async function expectPageLoaded(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('body')).toBeVisible();
}

/**
 * Проверяет, что страница не перенаправляет на login
 */
export async function expectNotRedirectedToLogin(page: Page) {
  const currentUrl = page.url();
  expect(currentUrl).not.toContain('/login');
}
