import { Page, expect } from '@playwright/test';

/**
 * Выполняет вход в систему с тестовыми данными
 */
export async function loginAsTestUser(page: Page) {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  await page.waitForSelector('input[type="password"]', { timeout: 5000 });
  await page.waitForSelector('button[type="submit"]', { timeout: 5000 });

  // Заполняем форму входа с реальными тестовыми данными
  await page.fill('input[type="email"]', 'demo@example.com');
  await page.fill('input[type="password"]', 'demo123');

  // Ждем ответа от API при отправке формы
  const responsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes('/auth/login') &&
        response.request().method() === 'POST',
      { timeout: 10000 }
    )
    .catch(() => null);

  // Отправляем форму
  await page.click('button[type="submit"]');

  // Ждем ответа от API
  const response = await responsePromise;

  // Проверяем статус ответа
  if (response) {
    const status = response.status();
    if (status >= 400) {
      // Если ошибка, проверяем наличие сообщения об ошибке на странице
      await page.waitForTimeout(1000); // Даем время для отображения ошибки
      // Ищем только ошибки (красные), не уведомления об успехе
      const errorMessage = page.locator('.text-red-800, .text-red-300').first();
      const hasError = await errorMessage.isVisible().catch(() => false);
      if (hasError) {
        const errorText = await errorMessage.textContent().catch(() => '');
        throw new Error(
          `Login failed with status ${status}. Error: ${errorText || 'Unknown error'}`
        );
      }
    } else if (status === 200 || status === 201) {
      // Успешный логин - ждем навигации
      // Ждем, пока уйдем со страницы логина (редирект может быть на любую страницу)
      try {
        await page.waitForURL((url) => !url.pathname.includes('/login'), {
          timeout: 15000,
        });
        // Ждем появления элементов навигации или контента страницы
        await page.waitForSelector('body', { timeout: 5000 });
        // Даем время для завершения навигации React Router
        await page.waitForTimeout(500);
        return; // Успешный логин
      } catch (error) {
        // Если не произошла навигация, проверяем, не остались ли мы на странице логина
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
          // Проверяем наличие ошибки (только красные, не уведомления об успехе)
          await page.waitForTimeout(1000);
          const errorMessage = page
            .locator('.text-red-800, .text-red-300')
            .first();
          const errorText = await errorMessage.textContent().catch(() => '');
          throw new Error(
            `Login succeeded but navigation failed. Still on login page. Error: ${errorText || 'Unknown error'}. Make sure demo user exists: run "pnpm --filter api tsx scripts/setup-demo-user.ts"`
          );
        }
        throw error;
      }
    }
  }

  // Если ответа нет или статус не определен, ждем навигации или ошибки
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 15000,
    });
    // Ждем появления элементов навигации или контента страницы
    await page.waitForSelector('body', { timeout: 5000 });
    await page.waitForTimeout(500);
  } catch (error) {
    // Проверяем, не остались ли мы на странице логина из-за ошибки
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // Проверяем наличие ошибки (только красные, не уведомления об успехе)
      await page.waitForTimeout(1000);
      const errorMessage = page.locator('.text-red-800, .text-red-300').first();
      const errorText = await errorMessage.textContent().catch(() => '');
      throw new Error(
        `Login failed. Still on login page. Error: ${errorText || 'Unknown error'}. Make sure demo user exists: run "pnpm --filter api tsx scripts/setup-demo-user.ts"`
      );
    }
    throw error;
  }
}

/**
 * Проверяет, что пользователь авторизован (находится на защищенной странице)
 */
export async function expectAuthenticated(page: Page) {
  // Проверяем, что мы не на странице входа
  // Ждем появления элементов навигации или контента
  await page.waitForSelector('body', { timeout: 5000 });
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
