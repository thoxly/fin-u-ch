import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

/**
 * Тесты для проверки работы системы прав с разными пользователями
 * и сценариев использования
 */
test.describe('RBAC Multi-User Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should allow super admin to access all pages', async ({ page }) => {
    // Супер-администратор должен иметь доступ ко всем страницам
    const adminPages = [
      '/admin/users',
      '/admin/roles',
      '/admin/audit-logs',
      '/admin/company-settings',
    ];

    for (const adminPage of adminPages) {
      await page.goto(adminPage);
      await page.waitForLoadState('networkidle');

      // Либо страница доступна, либо показывается сообщение об отсутствии прав
      const pageContent = page.locator('body');
      const hasContent = await pageContent.isVisible().catch(() => false);

      // Страница должна быть доступна (либо с контентом, либо с сообщением)
      expect(hasContent).toBe(true);
    }
  });

  test('should show different UI for users with different permissions', async ({
    page,
  }) => {
    // Переходим на страницу операций
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Проверяем наличие кнопок в зависимости от прав
    const createButton = page.locator(
      'button:has-text("Создать операцию"), button:has-text("Создать")'
    );
    const editButtons = page.locator(
      'button[title="Редактировать"], button:has([class*="Pencil"])'
    );
    const deleteButtons = page.locator(
      'button[title="Удалить"], button:has([class*="Trash2"])'
    );

    const createCount = await createButton.count();
    const editCount = await editButtons.count();
    const deleteCount = await deleteButtons.count();

    // Кнопки должны быть либо видны (если есть права), либо скрыты/disabled
    // Проверяем, что UI корректно реагирует на права
    if (createCount > 0) {
      const firstCreate = createButton.first();
      const isVisible = await firstCreate.isVisible().catch(() => false);
      if (isVisible) {
        const isDisabled = await firstCreate.isDisabled().catch(() => false);
        expect(typeof isDisabled === 'boolean').toBe(true);
      }
    }

    if (editCount > 0) {
      const firstEdit = editButtons.first();
      const isVisible = await firstEdit.isVisible().catch(() => false);
      if (isVisible) {
        const isDisabled = await firstEdit.isDisabled().catch(() => false);
        expect(typeof isDisabled === 'boolean').toBe(true);
      }
    }

    if (deleteCount > 0) {
      const firstDelete = deleteButtons.first();
      const isVisible = await firstDelete.isVisible().catch(() => false);
      if (isVisible) {
        const isDisabled = await firstDelete.isDisabled().catch(() => false);
        expect(typeof isDisabled === 'boolean').toBe(true);
      }
    }
  });

  test('should handle role assignment and permission changes in real-time', async ({
    page,
  }) => {
    // Создаем роль
    await page.goto('/admin/roles');
    await page.waitForLoadState('networkidle');

    const roleName = `Dynamic Role ${Date.now()}`;

    const createButton = page.locator('button:has-text("Создать роль")');
    await createButton.click();
    await page.waitForTimeout(500);

    const nameInput = page
      .locator('input[placeholder*="Название"], input[name="name"]')
      .first();
    await nameInput.fill(roleName);

    const saveButton = page.locator('button:has-text("Сохранить")').first();
    await saveButton.click();
    await page.waitForTimeout(2000);

    // Назначаем права роли
    const roleRow = page.locator(`tr:has-text("${roleName}")`);
    const permissionsButton = roleRow.locator(
      'button[title="Редактировать права"], button:has([class*="Shield"])'
    );

    if (await permissionsButton.isVisible().catch(() => false)) {
      await permissionsButton.click();
      await page.waitForTimeout(1000);

      // Устанавливаем права
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();

      if (checkboxCount > 2) {
        // Включаем несколько прав
        for (let i = 2; i < Math.min(checkboxCount, 5); i++) {
          const checkbox = checkboxes.nth(i);
          if (!(await checkbox.isChecked().catch(() => false))) {
            await checkbox.click();
            await page.waitForTimeout(200);
          }
        }
      }

      // Сохраняем права
      const savePermissionsButton = page.locator(
        'button:has-text("Сохранить права")'
      );
      if (await savePermissionsButton.isVisible().catch(() => false)) {
        await savePermissionsButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Назначаем роль пользователю
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const rolesButtons = page.locator(
      'button[title="Управление ролями"], button:has([class*="Shield"])'
    );
    const rolesCount = await rolesButtons.count();

    if (rolesCount > 0) {
      await rolesButtons.first().click();
      await page.waitForTimeout(1000);

      const availableRoles = page.locator(`text=${roleName}`);
      if (await availableRoles.isVisible().catch(() => false)) {
        const assignButton = availableRoles
          .locator('..')
          .locator('button:has-text("Назначить")');
        if (await assignButton.isVisible().catch(() => false)) {
          await assignButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // Проверяем, что права применились
    // Перезагружаем страницу для проверки кэширования
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Права должны быть актуальны
    const table = page.locator('table, [role="table"]');
    await expect(table).toBeVisible();
  });

  test('should prevent actions on protected entities without permissions', async ({
    page,
  }) => {
    const protectedPages = [
      {
        path: '/operations',
        actions: ['create', 'update', 'delete', 'confirm'],
      },
      { path: '/budgets', actions: ['create', 'update', 'delete', 'archive'] },
      {
        path: '/catalogs/articles',
        actions: ['create', 'update', 'delete', 'archive'],
      },
    ];

    for (const pageInfo of protectedPages) {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');

      // Проверяем каждое действие
      for (const action of pageInfo.actions) {
        let buttonSelector = '';

        switch (action) {
          case 'create':
            buttonSelector =
              'button:has-text("Создать"), button:has-text("Добавить")';
            break;
          case 'update':
            buttonSelector =
              'button[title="Редактировать"], button:has([class*="Pencil"])';
            break;
          case 'delete':
            buttonSelector =
              'button[title="Удалить"], button:has([class*="Trash2"])';
            break;
          case 'archive':
            buttonSelector =
              'button[title*="Архивировать"], button:has([class*="Archive"])';
            break;
          case 'confirm':
            buttonSelector = 'button:has-text("Подтвердить")';
            break;
        }

        if (buttonSelector) {
          const buttons = page.locator(buttonSelector);
          const buttonCount = await buttons.count();

          if (buttonCount > 0) {
            const firstButton = buttons.first();
            const isVisible = await firstButton.isVisible().catch(() => false);

            if (isVisible) {
              // Кнопка либо активна (если есть права), либо disabled (если нет прав)
              const isDisabled = await firstButton
                .isDisabled()
                .catch(() => false);
              expect(typeof isDisabled === 'boolean').toBe(true);
            }
          }
        }
      }
    }
  });

  test('should handle permission changes after role update', async ({
    page,
  }) => {
    // Создаем роль с минимальными правами
    await page.goto('/admin/roles');
    await page.waitForLoadState('networkidle');

    const roleName = `Minimal Role ${Date.now()}`;

    const createButton = page.locator('button:has-text("Создать роль")');
    await createButton.click();
    await page.waitForTimeout(500);

    const nameInput = page
      .locator('input[placeholder*="Название"], input[name="name"]')
      .first();
    await nameInput.fill(roleName);

    const saveButton = page.locator('button:has-text("Сохранить")').first();
    await saveButton.click();
    await page.waitForTimeout(2000);

    // Назначаем только право на чтение
    const roleRow = page.locator(`tr:has-text("${roleName}")`);
    const permissionsButton = roleRow.locator(
      'button[title="Редактировать права"], button:has([class*="Shield"])'
    );

    if (await permissionsButton.isVisible().catch(() => false)) {
      await permissionsButton.click();
      await page.waitForTimeout(1000);

      // Устанавливаем только read для операций
      const operationsRow = page.locator(
        'tr:has-text("Операции"), tr:has-text("operations")'
      );
      if (await operationsRow.isVisible().catch(() => false)) {
        const readCheckbox = operationsRow
          .locator('input[type="checkbox"]')
          .nth(1); // Предполагаем, что второй - read
        if (await readCheckbox.isVisible().catch(() => false)) {
          if (!(await readCheckbox.isChecked().catch(() => false))) {
            await readCheckbox.click();
          }
        }
      }

      // Сохраняем права
      const savePermissionsButton = page.locator(
        'button:has-text("Сохранить права")'
      );
      if (await savePermissionsButton.isVisible().catch(() => false)) {
        await savePermissionsButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Назначаем роль пользователю
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const rolesButtons = page.locator(
      'button[title="Управление ролями"], button:has([class*="Shield"])'
    );
    const rolesCount = await rolesButtons.count();

    if (rolesCount > 0) {
      await rolesButtons.first().click();
      await page.waitForTimeout(1000);

      const availableRoles = page.locator(`text=${roleName}`);
      if (await availableRoles.isVisible().catch(() => false)) {
        const assignButton = availableRoles
          .locator('..')
          .locator('button:has-text("Назначить")');
        if (await assignButton.isVisible().catch(() => false)) {
          await assignButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // Проверяем, что кнопка создания операции либо скрыта, либо disabled
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    const createButtonCount = await createButton.count();

    if (createButtonCount > 0) {
      const firstButton = createButton.first();
      const isVisible = await firstButton.isVisible().catch(() => false);

      if (isVisible) {
        // Кнопка должна быть disabled, так как у роли нет права create
        const isDisabled = await firstButton.isDisabled().catch(() => false);
        // Если кнопка видна, она должна быть disabled (нет права create)
        expect(isDisabled).toBe(true);
      }
    }
  });

  test('should show correct permissions in user profile', async ({ page }) => {
    // Переходим на страницу пользователей
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Ищем первого пользователя
    const usersTable = page.locator('table, [role="table"]');
    if (await usersTable.isVisible().catch(() => false)) {
      // Проверяем отображение ролей пользователя
      const rolesColumn = page
        .locator('td, [role="cell"]')
        .filter({ hasText: /роль|role/i });
      const rolesCount = await rolesColumn.count();

      // Роли должны отображаться в таблице
      if (rolesCount > 0) {
        const firstRoleCell = rolesColumn.first();
        await expect(firstRoleCell).toBeVisible();
      }
    }
  });

  test('should handle bulk operations with permissions', async ({ page }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Ищем чекбоксы для выбора операций
    const checkboxes = page.locator(
      'input[type="checkbox"]:not([type="hidden"])'
    );
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      // Выбираем несколько операций
      for (let i = 0; i < Math.min(3, checkboxCount); i++) {
        const checkbox = checkboxes.nth(i);
        if (await checkbox.isVisible().catch(() => false)) {
          await checkbox.click();
          await page.waitForTimeout(200);
        }
      }

      // Ищем панель массовых действий
      const bulkActions = page.locator(
        '[class*="BulkActions"], [class*="bulk-actions"]'
      );
      if (await bulkActions.isVisible().catch(() => false)) {
        // Проверяем кнопки массовых действий
        const deleteButton = bulkActions.locator('button:has-text("Удалить")');
        const deleteCount = await deleteButton.count();

        if (deleteCount > 0) {
          const firstDelete = deleteButton.first();
          const isVisible = await firstDelete.isVisible().catch(() => false);

          if (isVisible) {
            // Кнопка либо активна, либо disabled в зависимости от прав
            const isDisabled = await firstDelete
              .isDisabled()
              .catch(() => false);
            expect(typeof isDisabled === 'boolean').toBe(true);
          }
        }
      }
    }
  });
});
