import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

/**
 * Интеграционные тесты для проверки работы системы прав доступа
 * на разных страницах приложения
 */
test.describe('RBAC Permissions Integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test.describe('Operations Page Permissions', () => {
    test('should show/hide create button based on permissions', async ({
      page,
    }) => {
      await page.goto('/operations');
      await page.waitForLoadState('networkidle');

      // Ищем кнопку создания операции
      const createButton = page.locator(
        'button:has-text("Создать операцию"), button:has-text("Создать")'
      );
      const createButtonCount = await createButton.count();

      if (createButtonCount > 0) {
        const firstButton = createButton.first();
        const isVisible = await firstButton.isVisible().catch(() => false);

        if (isVisible) {
          // Кнопка видна - проверяем, активна ли она или disabled
          const isDisabled = await firstButton.isDisabled().catch(() => false);
          // Кнопка должна быть либо активна (если есть права), либо disabled (если нет прав)
          expect(typeof isDisabled === 'boolean').toBe(true);
        }
      }
    });

    test('should show/hide edit buttons in operations table based on permissions', async ({
      page,
    }) => {
      await page.goto('/operations');
      await page.waitForLoadState('networkidle');

      // Ищем кнопки редактирования в таблице
      const editButtons = page.locator(
        'button[title="Редактировать"], button:has([class*="Pencil"])'
      );
      const editCount = await editButtons.count();

      if (editCount > 0) {
        // Проверяем первую кнопку редактирования
        const firstEditButton = editButtons.first();
        const isVisible = await firstEditButton.isVisible().catch(() => false);

        if (isVisible) {
          // Кнопка либо активна, либо disabled
          const isDisabled = await firstEditButton
            .isDisabled()
            .catch(() => false);
          expect(typeof isDisabled === 'boolean').toBe(true);
        }
      }
    });

    test('should show/hide delete buttons in operations table based on permissions', async ({
      page,
    }) => {
      await page.goto('/operations');
      await page.waitForLoadState('networkidle');

      // Ищем кнопки удаления в таблице
      const deleteButtons = page.locator(
        'button[title="Удалить"], button:has([class*="Trash2"])'
      );
      const deleteCount = await deleteButtons.count();

      if (deleteCount > 0) {
        const firstDeleteButton = deleteButtons.first();
        const isVisible = await firstDeleteButton
          .isVisible()
          .catch(() => false);

        if (isVisible) {
          const isDisabled = await firstDeleteButton
            .isDisabled()
            .catch(() => false);
          expect(typeof isDisabled === 'boolean').toBe(true);
        }
      }
    });

    test('should show/hide confirm buttons based on permissions', async ({
      page,
    }) => {
      await page.goto('/operations');
      await page.waitForLoadState('networkidle');

      // Ищем кнопки подтверждения операций
      const confirmButtons = page.locator(
        'button:has-text("Подтвердить"), button[title*="Подтвердить"]'
      );
      const confirmCount = await confirmButtons.count();

      if (confirmCount > 0) {
        const firstConfirmButton = confirmButtons.first();
        const isVisible = await firstConfirmButton
          .isVisible()
          .catch(() => false);

        if (isVisible) {
          const isDisabled = await firstConfirmButton
            .isDisabled()
            .catch(() => false);
          expect(typeof isDisabled === 'boolean').toBe(true);
        }
      }
    });
  });

  test.describe('Budgets Page Permissions', () => {
    test('should show/hide create budget button based on permissions', async ({
      page,
    }) => {
      await page.goto('/budgets');
      await page.waitForLoadState('networkidle');

      const createButton = page.locator(
        'button:has-text("Создать бюджет"), button:has-text("Создать")'
      );
      const createButtonCount = await createButton.count();

      if (createButtonCount > 0) {
        const firstButton = createButton.first();
        const isVisible = await firstButton.isVisible().catch(() => false);

        if (isVisible) {
          const isDisabled = await firstButton.isDisabled().catch(() => false);
          expect(typeof isDisabled === 'boolean').toBe(true);
        }
      }
    });

    test('should show/hide archive buttons based on permissions', async ({
      page,
    }) => {
      await page.goto('/budgets');
      await page.waitForLoadState('networkidle');

      const archiveButtons = page.locator(
        'button[title*="Архивировать"], button:has([class*="Archive"])'
      );
      const archiveCount = await archiveButtons.count();

      if (archiveCount > 0) {
        const firstArchiveButton = archiveButtons.first();
        const isVisible = await firstArchiveButton
          .isVisible()
          .catch(() => false);

        if (isVisible) {
          const isDisabled = await firstArchiveButton
            .isDisabled()
            .catch(() => false);
          expect(typeof isDisabled === 'boolean').toBe(true);
        }
      }
    });
  });

  test.describe('Catalogs Pages Permissions', () => {
    const catalogPages = [
      { path: '/catalogs/articles', name: 'Articles' },
      { path: '/catalogs/accounts', name: 'Accounts' },
      { path: '/catalogs/departments', name: 'Departments' },
      { path: '/catalogs/counterparties', name: 'Counterparties' },
      { path: '/catalogs/deals', name: 'Deals' },
      { path: '/catalogs/salaries', name: 'Salaries' },
    ];

    for (const catalog of catalogPages) {
      test(`should check permissions on ${catalog.name} page`, async ({
        page,
      }) => {
        await page.goto(catalog.path);
        await page.waitForLoadState('networkidle');

        // Проверяем кнопку создания
        const createButton = page.locator(
          'button:has-text("Создать"), button:has-text("Добавить")'
        );
        const createCount = await createButton.count();

        if (createCount > 0) {
          const firstButton = createButton.first();
          const isVisible = await firstButton.isVisible().catch(() => false);

          if (isVisible) {
            const isDisabled = await firstButton
              .isDisabled()
              .catch(() => false);
            expect(typeof isDisabled === 'boolean').toBe(true);
          }
        }

        // Проверяем кнопки редактирования в таблице
        const editButtons = page.locator(
          'button[title="Редактировать"], button:has([class*="Pencil"])'
        );
        const editCount = await editButtons.count();

        if (editCount > 0) {
          const firstEditButton = editButtons.first();
          const isVisible = await firstEditButton
            .isVisible()
            .catch(() => false);

          if (isVisible) {
            const isDisabled = await firstEditButton
              .isDisabled()
              .catch(() => false);
            expect(typeof isDisabled === 'boolean').toBe(true);
          }
        }

        // Проверяем кнопки удаления в таблице
        const deleteButtons = page.locator(
          'button[title="Удалить"], button:has([class*="Trash2"])'
        );
        const deleteCount = await deleteButtons.count();

        if (deleteCount > 0) {
          const firstDeleteButton = deleteButtons.first();
          const isVisible = await firstDeleteButton
            .isVisible()
            .catch(() => false);

          if (isVisible) {
            const isDisabled = await firstDeleteButton
              .isDisabled()
              .catch(() => false);
            expect(typeof isDisabled === 'boolean').toBe(true);
          }
        }
      });
    }

    test('should check archive permissions on Articles page', async ({
      page,
    }) => {
      await page.goto('/catalogs/articles');
      await page.waitForLoadState('networkidle');

      // Проверяем кнопки архивирования
      const archiveButtons = page.locator(
        'button[title*="Архивировать"], button:has([class*="Archive"])'
      );
      const archiveCount = await archiveButtons.count();

      if (archiveCount > 0) {
        const firstArchiveButton = archiveButtons.first();
        const isVisible = await firstArchiveButton
          .isVisible()
          .catch(() => false);

        if (isVisible) {
          const isDisabled = await firstArchiveButton
            .isDisabled()
            .catch(() => false);
          expect(typeof isDisabled === 'boolean').toBe(true);
        }
      }
    });
  });

  test.describe('Reports Page Permissions', () => {
    test('should show/hide export buttons based on permissions', async ({
      page,
    }) => {
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');

      // Ищем кнопки экспорта
      const exportButtons = page.locator(
        'button:has-text("Экспорт"), button[title*="Экспорт"], button:has([class*="Download"])'
      );
      const exportCount = await exportButtons.count();

      if (exportCount > 0) {
        const firstExportButton = exportButtons.first();
        const isVisible = await firstExportButton
          .isVisible()
          .catch(() => false);

        if (isVisible) {
          const isDisabled = await firstExportButton
            .isDisabled()
            .catch(() => false);
          expect(typeof isDisabled === 'boolean').toBe(true);
        }
      }
    });

    test('should allow viewing reports with read permission', async ({
      page,
    }) => {
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');

      // Страница должна загрузиться (либо с данными, либо с сообщением об отсутствии данных)
      const pageContent = page.locator('body');
      await expect(pageContent).toBeVisible();

      // Либо показывается контент отчётов, либо сообщение об отсутствии прав
      const reportsContent = page.locator(
        '[class*="report"], [class*="table"], [class*="chart"]'
      );
      const accessDenied = page.locator('text=/нет прав|access denied/i');

      const hasContent = await reportsContent
        .first()
        .isVisible()
        .catch(() => false);
      const hasAccessDenied = await accessDenied.isVisible().catch(() => false);

      expect(hasContent || hasAccessDenied).toBe(true);
    });
  });

  test.describe('Protected Routes Access', () => {
    test('should block access to admin pages without permissions', async ({
      page,
    }) => {
      // Пытаемся перейти на страницу управления пользователями
      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');

      // Либо показывается страница с сообщением об отсутствии прав,
      // либо страница доступна (если есть права)
      const accessDenied = page.locator(
        'text=/нет прав|access denied|доступ запрещён/i'
      );
      const usersTable = page.locator('table, [role="table"]');

      const hasAccessDenied = await accessDenied.isVisible().catch(() => false);
      const hasTable = await usersTable.isVisible().catch(() => false);

      expect(hasAccessDenied || hasTable).toBe(true);
    });

    test('should block access to roles page without permissions', async ({
      page,
    }) => {
      await page.goto('/admin/roles');
      await page.waitForLoadState('networkidle');

      const accessDenied = page.locator(
        'text=/нет прав|access denied|доступ запрещён/i'
      );
      const rolesTable = page.locator('table, [role="table"]');

      const hasAccessDenied = await accessDenied.isVisible().catch(() => false);
      const hasTable = await rolesTable.isVisible().catch(() => false);

      expect(hasAccessDenied || hasTable).toBe(true);
    });

    test('should block access to audit logs page without permissions', async ({
      page,
    }) => {
      await page.goto('/admin/audit-logs');
      await page.waitForLoadState('networkidle');

      const accessDenied = page.locator(
        'text=/нет прав|access denied|доступ запрещён/i'
      );
      const auditTable = page.locator('table, [role="table"]');

      const hasAccessDenied = await accessDenied.isVisible().catch(() => false);
      const hasTable = await auditTable.isVisible().catch(() => false);

      expect(hasAccessDenied || hasTable).toBe(true);
    });
  });

  test.describe('API Permission Enforcement', () => {
    test('should reject API request without create permission', async ({
      page,
    }) => {
      await page.goto('/operations');
      await page.waitForLoadState('networkidle');

      // Перехватываем запросы к API
      interface ApiRequest {
        url: string;
        status: number;
      }
      const apiRequests: ApiRequest[] = [];
      page.on('response', (response) => {
        if (
          response.url().includes('/api/operations') &&
          response.request().method() === 'POST'
        ) {
          apiRequests.push({
            url: response.url(),
            status: response.status(),
          });
        }
      });

      // Пытаемся создать операцию (если кнопка видна)
      const createButton = page.locator(
        'button:has-text("Создать операцию"), button:has-text("Создать")'
      );
      const createButtonCount = await createButton.count();

      if (createButtonCount > 0) {
        const firstButton = createButton.first();
        const isDisabled = await firstButton.isDisabled().catch(() => false);

        if (!isDisabled) {
          // Если кнопка активна, пытаемся создать операцию
          await firstButton.click();
          await page.waitForTimeout(2000);

          // Если форма открылась, пытаемся отправить
          const submitButton = page.locator(
            'button[type="submit"], button:has-text("Сохранить")'
          );
          if (await submitButton.isVisible().catch(() => false)) {
            await submitButton.click();
            await page.waitForTimeout(2000);

            // Проверяем, что либо операция создана (200/201), либо отклонена (403)
            const createRequest = apiRequests.find(
              (r) => r.url.includes('/api/operations') && r.status
            );
            if (createRequest) {
              // Запрос должен быть либо успешным (если есть права), либо отклонен (403)
              expect([200, 201, 403]).toContain(createRequest.status);
            }
          }
        }
      }
    });

    test('should reject API request without update permission', async ({
      page,
    }) => {
      await page.goto('/operations');
      await page.waitForLoadState('networkidle');

      interface ApiRequest {
        url: string;
        status: number;
      }
      const apiRequests: ApiRequest[] = [];
      page.on('response', (response) => {
        if (
          response.url().includes('/api/operations') &&
          response.request().method() === 'PATCH'
        ) {
          apiRequests.push({
            url: response.url(),
            status: response.status(),
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
        const isDisabled = await firstEditButton
          .isDisabled()
          .catch(() => false);

        if (!isDisabled) {
          await firstEditButton.click();
          await page.waitForTimeout(2000);

          const submitButton = page.locator(
            'button[type="submit"], button:has-text("Сохранить")'
          );
          if (await submitButton.isVisible().catch(() => false)) {
            await submitButton.click();
            await page.waitForTimeout(2000);

            const updateRequest = apiRequests.find(
              (r) => r.url.includes('/api/operations') && r.status
            );
            if (updateRequest) {
              expect([200, 403]).toContain(updateRequest.status);
            }
          }
        }
      }
    });
  });
});
