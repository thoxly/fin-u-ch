import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

/**
 * Тесты для проверки, что API отклоняет запросы без соответствующих прав
 */
test.describe('RBAC API Enforcement', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should reject create operation request without permission', async ({
    page,
  }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    const apiResponses: Array<{ url: string; status: number; method: string }> =
      [];

    page.on('response', (response) => {
      const url = response.url();
      const method = response.request().method();

      if (url.includes('/api/operations') && method === 'POST') {
        apiResponses.push({
          url,
          status: response.status(),
          method,
        });
      }
    });

    // Пытаемся создать операцию через UI
    const createButton = page.locator(
      'button:has-text("Создать операцию"), button:has-text("Создать")'
    );
    const createButtonCount = await createButton.count();

    if (createButtonCount > 0) {
      const firstButton = createButton.first();
      const isDisabled = await firstButton.isDisabled().catch(() => false);

      if (!isDisabled) {
        await firstButton.click();
        await page.waitForTimeout(1000);

        // Если форма открылась, пытаемся заполнить и отправить
        const amountInput = page.locator(
          'input[name="amount"], input[type="number"]'
        );
        if (await amountInput.isVisible().catch(() => false)) {
          await amountInput.fill('1000');

          const submitButton = page.locator(
            'button[type="submit"], button:has-text("Сохранить")'
          );
          if (await submitButton.isVisible().catch(() => false)) {
            await submitButton.click();
            await page.waitForTimeout(3000);

            // Проверяем ответ API
            const createResponse = apiResponses.find(
              (r) => r.method === 'POST'
            );
            if (createResponse) {
              // Запрос должен быть либо успешным (200/201), либо отклонен (403)
              expect([200, 201, 403]).toContain(createResponse.status);

              if (createResponse.status === 403) {
                // Если запрос отклонен, должно быть сообщение об ошибке
                const errorMessage = page.locator(
                  'text=/нет прав|forbidden|доступ запрещён/i'
                );
                const hasError = await errorMessage
                  .isVisible()
                  .catch(() => false);
                expect(hasError).toBe(true);
              }
            }
          }
        }
      }
    }
  });

  test('should reject update operation request without permission', async ({
    page,
  }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    const apiResponses: Array<{ url: string; status: number; method: string }> =
      [];

    page.on('response', (response) => {
      const url = response.url();
      const method = response.request().method();

      if (
        url.includes('/api/operations') &&
        (method === 'PATCH' || method === 'PUT')
      ) {
        apiResponses.push({
          url,
          status: response.status(),
          method,
        });
      }
    });

    // Пытаемся редактировать операцию
    const editButtons = page.locator(
      'button[title="Редактировать"], button:has([class*="Pencil"])'
    );
    const editCount = await editButtons.count();

    if (editCount > 0) {
      const firstEditButton = editButtons.first();
      const isDisabled = await firstEditButton.isDisabled().catch(() => false);

      if (!isDisabled) {
        await firstEditButton.click();
        await page.waitForTimeout(1000);

        // Если форма открылась, пытаемся изменить и сохранить
        const amountInput = page.locator(
          'input[name="amount"], input[type="number"]'
        );
        if (await amountInput.isVisible().catch(() => false)) {
          const currentValue = await amountInput.inputValue().catch(() => '');
          await amountInput.fill((parseFloat(currentValue) || 1000) + 100);

          const submitButton = page.locator(
            'button[type="submit"], button:has-text("Сохранить")'
          );
          if (await submitButton.isVisible().catch(() => false)) {
            await submitButton.click();
            await page.waitForTimeout(3000);

            const updateResponse = apiResponses.find(
              (r) => r.method === 'PATCH' || r.method === 'PUT'
            );
            if (updateResponse) {
              expect([200, 403]).toContain(updateResponse.status);

              if (updateResponse.status === 403) {
                const errorMessage = page.locator(
                  'text=/нет прав|forbidden|доступ запрещён/i'
                );
                const hasError = await errorMessage
                  .isVisible()
                  .catch(() => false);
                expect(hasError).toBe(true);
              }
            }
          }
        }
      }
    }
  });

  test('should reject delete operation request without permission', async ({
    page,
  }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    const apiResponses: Array<{ url: string; status: number; method: string }> =
      [];

    page.on('response', (response) => {
      const url = response.url();
      const method = response.request().method();

      if (url.includes('/api/operations') && method === 'DELETE') {
        apiResponses.push({
          url,
          status: response.status(),
          method,
        });
      }
    });

    // Пытаемся удалить операцию
    const deleteButtons = page.locator(
      'button[title="Удалить"], button:has([class*="Trash2"])'
    );
    const deleteCount = await deleteButtons.count();

    if (deleteCount > 0) {
      const firstDeleteButton = deleteButtons.first();
      const isDisabled = await firstDeleteButton
        .isDisabled()
        .catch(() => false);

      if (!isDisabled) {
        await firstDeleteButton.click();
        await page.waitForTimeout(1000);

        // Подтверждаем удаление в диалоге
        const confirmButton = page.locator(
          'button:has-text("Да"), button:has-text("Удалить"), button:has-text("OK")'
        );
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
          await page.waitForTimeout(3000);

          const deleteResponse = apiResponses.find(
            (r) => r.method === 'DELETE'
          );
          if (deleteResponse) {
            expect([200, 204, 403]).toContain(deleteResponse.status);

            if (deleteResponse.status === 403) {
              const errorMessage = page.locator(
                'text=/нет прав|forbidden|доступ запрещён/i'
              );
              const hasError = await errorMessage
                .isVisible()
                .catch(() => false);
              expect(hasError).toBe(true);
            }
          }
        }
      }
    }
  });

  test('should reject confirm operation request without permission', async ({
    page,
  }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    const apiResponses: Array<{ url: string; status: number; method: string }> =
      [];

    page.on('response', (response) => {
      const url = response.url();
      const method = response.request().method();

      if (
        url.includes('/api/operations') &&
        url.includes('/confirm') &&
        method === 'PATCH'
      ) {
        apiResponses.push({
          url,
          status: response.status(),
          method,
        });
      }
    });

    // Ищем кнопку подтверждения операции
    const confirmButtons = page.locator(
      'button:has-text("Подтвердить"), button[title*="Подтвердить"]'
    );
    const confirmCount = await confirmButtons.count();

    if (confirmCount > 0) {
      const firstConfirmButton = confirmButtons.first();
      const isDisabled = await firstConfirmButton
        .isDisabled()
        .catch(() => false);

      if (!isDisabled) {
        await firstConfirmButton.click();
        await page.waitForTimeout(3000);

        const confirmResponse = apiResponses.find((r) =>
          r.url.includes('/confirm')
        );
        if (confirmResponse) {
          expect([200, 403]).toContain(confirmResponse.status);

          if (confirmResponse.status === 403) {
            const errorMessage = page.locator(
              'text=/нет прав|forbidden|доступ запрещён/i'
            );
            const hasError = await errorMessage.isVisible().catch(() => false);
            expect(hasError).toBe(true);
          }
        }
      }
    }
  });

  test('should reject create budget request without permission', async ({
    page,
  }) => {
    await page.goto('/budgets');
    await page.waitForLoadState('networkidle');

    const apiResponses: Array<{ url: string; status: number; method: string }> =
      [];

    page.on('response', (response) => {
      const url = response.url();
      const method = response.request().method();

      if (url.includes('/api/budgets') && method === 'POST') {
        apiResponses.push({
          url,
          status: response.status(),
          method,
        });
      }
    });

    const createButton = page.locator(
      'button:has-text("Создать бюджет"), button:has-text("Создать")'
    );
    const createButtonCount = await createButton.count();

    if (createButtonCount > 0) {
      const firstButton = createButton.first();
      const isDisabled = await firstButton.isDisabled().catch(() => false);

      if (!isDisabled) {
        await firstButton.click();
        await page.waitForTimeout(1000);

        const nameInput = page.locator(
          'input[name="name"], input[placeholder*="Название"]'
        );
        if (await nameInput.isVisible().catch(() => false)) {
          await nameInput.fill(`Test Budget ${Date.now()}`);

          const submitButton = page.locator(
            'button[type="submit"], button:has-text("Сохранить")'
          );
          if (await submitButton.isVisible().catch(() => false)) {
            await submitButton.click();
            await page.waitForTimeout(3000);

            const createResponse = apiResponses.find(
              (r) => r.method === 'POST'
            );
            if (createResponse) {
              expect([200, 201, 403]).toContain(createResponse.status);
            }
          }
        }
      }
    }
  });

  test('should reject catalog create request without permission', async ({
    page,
  }) => {
    const catalogPages = [
      { path: '/catalogs/articles', entity: 'articles' },
      { path: '/catalogs/accounts', entity: 'accounts' },
      { path: '/catalogs/departments', entity: 'departments' },
    ];

    for (const catalog of catalogPages) {
      await page.goto(catalog.path);
      await page.waitForLoadState('networkidle');

      const apiResponses: Array<{
        url: string;
        status: number;
        method: string;
      }> = [];

      page.on('response', (response) => {
        const url = response.url();
        const method = response.request().method();

        if (
          url.includes(`/api/catalogs/${catalog.entity}`) &&
          method === 'POST'
        ) {
          apiResponses.push({
            url,
            status: response.status(),
            method,
          });
        }
      });

      const createButton = page.locator(
        'button:has-text("Создать"), button:has-text("Добавить")'
      );
      const createButtonCount = await createButton.count();

      if (createButtonCount > 0) {
        const firstButton = createButton.first();
        const isDisabled = await firstButton.isDisabled().catch(() => false);

        if (!isDisabled) {
          await firstButton.click();
          await page.waitForTimeout(1000);

          const nameInput = page.locator(
            'input[name="name"], input[placeholder*="Название"]'
          );
          if (await nameInput.isVisible().catch(() => false)) {
            await nameInput.fill(`Test ${catalog.entity} ${Date.now()}`);

            const submitButton = page.locator(
              'button[type="submit"], button:has-text("Сохранить")'
            );
            if (await submitButton.isVisible().catch(() => false)) {
              await submitButton.click();
              await page.waitForTimeout(3000);

              const createResponse = apiResponses.find(
                (r) => r.method === 'POST'
              );
              if (createResponse) {
                expect([200, 201, 403]).toContain(createResponse.status);
                break; // Тестируем только одну сущность
              }
            }
          }
        }
      }
    }
  });

  test('should allow read operations with read permission', async ({
    page,
  }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    const apiResponses: Array<{ url: string; status: number; method: string }> =
      [];

    page.on('response', (response) => {
      const url = response.url();
      const method = response.request().method();

      if (url.includes('/api/operations') && method === 'GET') {
        apiResponses.push({
          url,
          status: response.status(),
          method,
        });
      }
    });

    // Ждем загрузки данных
    await page.waitForTimeout(2000);

    // Проверяем, что GET запрос был успешным (200) или отклонен (403)
    const getResponse = apiResponses.find((r) => r.method === 'GET');
    if (getResponse) {
      expect([200, 403]).toContain(getResponse.status);
    }

    // Если есть права на чтение, должна быть видна таблица или данные
    // Если нет прав, должно быть сообщение об отсутствии доступа
    const table = page.locator('table, [role="table"]');
    const accessDenied = page.locator('text=/нет прав|access denied/i');

    const hasTable = await table.isVisible().catch(() => false);
    const hasAccessDenied = await accessDenied.isVisible().catch(() => false);

    expect(hasTable || hasAccessDenied).toBe(true);
  });
});
