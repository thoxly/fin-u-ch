import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('Admin Users Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    // Переходим на страницу управления пользователями
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
  });

  test('should display users page with correct elements', async ({ page }) => {
    // Проверяем заголовок страницы
    await expect(page.locator('h1')).toContainText(/пользователи|users/i);

    // Проверяем наличие таблицы пользователей
    const table = page.locator('table, [role="table"]');
    await expect(table).toBeVisible();

    // Проверяем наличие кнопки приглашения пользователя
    const inviteButton = page.locator(
      'button:has-text("Пригласить"), button:has-text("Пригласить пользователя")'
    );
    await expect(inviteButton).toBeVisible();
  });

  test('should open invite user modal', async ({ page }) => {
    // Нажимаем кнопку приглашения
    const inviteButton = page
      .locator(
        'button:has-text("Пригласить"), button:has-text("Пригласить пользователя")'
      )
      .first();
    await inviteButton.click();

    // Ждем открытия модального окна
    await page.waitForTimeout(500);

    // Проверяем наличие модального окна
    const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
    await expect(modal).toBeVisible();

    // Проверяем наличие полей формы
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('select[multiple]')).toBeVisible();
  });

  test('should invite user with email', async ({ page }) => {
    // Открываем модальное окно приглашения
    const inviteButton = page
      .locator(
        'button:has-text("Пригласить"), button:has-text("Пригласить пользователя")'
      )
      .first();
    await inviteButton.click();
    await page.waitForTimeout(500);

    // Заполняем email
    const emailInput = page.locator('input[type="email"]').first();
    const testEmail = `test-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    // Отправляем форму
    const submitButton = page
      .locator(
        'button:has-text("Отправить приглашение"), button:has-text("Пригласить")'
      )
      .first();
    await submitButton.click();

    // Ждем появления модального окна с временным паролем или успешного сообщения
    await page.waitForTimeout(2000);

    // Проверяем, что либо появилось модальное окно с паролем, либо успешное уведомление
    const passwordModal = page.locator(
      'text=/временный пароль|temporary password/i'
    );
    const successNotification = page.locator(
      '[role="alert"]:has-text("успешно"), .notification:has-text("успешно")'
    );

    const hasPasswordModal = await passwordModal.isVisible().catch(() => false);
    const hasSuccessNotification = await successNotification
      .isVisible()
      .catch(() => false);

    expect(hasPasswordModal || hasSuccessNotification).toBe(true);
  });

  test('should invite user with roles', async ({ page }) => {
    // Открываем модальное окно приглашения
    const inviteButton = page
      .locator(
        'button:has-text("Пригласить"), button:has-text("Приглашить пользователя")'
      )
      .first();
    await inviteButton.click();
    await page.waitForTimeout(500);

    // Заполняем email
    const emailInput = page.locator('input[type="email"]').first();
    const testEmail = `test-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    // Выбираем роли (если есть доступные роли)
    const rolesSelect = page.locator('select[multiple]');
    if (await rolesSelect.isVisible()) {
      const options = await rolesSelect.locator('option').all();
      if (options.length > 0) {
        // Выбираем первую доступную роль
        await rolesSelect.selectOption({ index: 0 });
      }
    }

    // Отправляем форму
    const submitButton = page
      .locator(
        'button:has-text("Отправить приглашение"), button:has-text("Пригласить")'
      )
      .first();
    await submitButton.click();

    // Ждем результата
    await page.waitForTimeout(2000);

    // Проверяем успешное приглашение
    const passwordModal = page.locator(
      'text=/временный пароль|temporary password/i'
    );
    const successNotification = page.locator(
      '[role="alert"]:has-text("успешно"), .notification:has-text("успешно")'
    );

    const hasPasswordModal = await passwordModal.isVisible().catch(() => false);
    const hasSuccessNotification = await successNotification
      .isVisible()
      .catch(() => false);

    expect(hasPasswordModal || hasSuccessNotification).toBe(true);
  });

  test('should display temporary password modal after invitation', async ({
    page,
  }) => {
    // Открываем модальное окно приглашения
    const inviteButton = page
      .locator(
        'button:has-text("Пригласить"), button:has-text("Пригласить пользователя")'
      )
      .first();
    await inviteButton.click();
    await page.waitForTimeout(500);

    // Заполняем email
    const emailInput = page.locator('input[type="email"]').first();
    const testEmail = `test-${Date.now()}@example.com`;
    await emailInput.fill(testEmail);

    // Отправляем форму
    const submitButton = page
      .locator(
        'button:has-text("Отправить приглашение"), button:has-text("Пригласить")'
      )
      .first();
    await submitButton.click();

    // Ждем появления модального окна с паролем
    await page.waitForTimeout(2000);

    // Проверяем наличие модального окна с паролем
    const passwordModal = page.locator(
      'text=/временный пароль|temporary password/i'
    );
    if (await passwordModal.isVisible().catch(() => false)) {
      // Проверяем наличие кнопки копирования
      const copyButton = page.locator(
        'button:has-text("Копировать"), button:has-text("Скопировать")'
      );
      await expect(copyButton).toBeVisible();
    }
  });

  test('should edit user', async ({ page }) => {
    // Ищем кнопку редактирования пользователя
    const editButtons = page.locator(
      'button[title="Редактировать"], button:has([class*="Pencil"])'
    );
    const count = await editButtons.count();

    if (count > 0) {
      // Открываем форму редактирования первого пользователя
      await editButtons.first().click();
      await page.waitForTimeout(500);

      // Проверяем наличие модального окна редактирования
      const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
      await expect(modal).toBeVisible();

      // Проверяем наличие полей формы
      await expect(
        page.locator('input[name="firstName"], input[placeholder*="Имя"]')
      ).toBeVisible();
      await expect(
        page.locator('input[name="lastName"], input[placeholder*="Фамилия"]')
      ).toBeVisible();
    }
  });

  test('should manage user roles', async ({ page }) => {
    // Ищем кнопку управления ролями
    const rolesButtons = page.locator(
      'button[title="Управление ролями"], button:has([class*="Shield"])'
    );
    const count = await rolesButtons.count();

    if (count > 0) {
      // Открываем модальное окно управления ролями
      await rolesButtons.first().click();
      await page.waitForTimeout(500);

      // Проверяем наличие модального окна
      const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
      await expect(modal).toBeVisible();

      // Проверяем наличие секций с ролями
      await expect(
        page.locator('text=/назначенные роли|assigned roles/i')
      ).toBeVisible();
      await expect(
        page.locator('text=/доступные роли|available roles/i')
      ).toBeVisible();
    }
  });

  test('should assign role to user', async ({ page }) => {
    // Ищем кнопку управления ролями
    const rolesButtons = page.locator(
      'button[title="Управление ролями"], button:has([class*="Shield"])'
    );
    const count = await rolesButtons.count();

    if (count > 0) {
      // Открываем модальное окно управления ролями
      await rolesButtons.first().click();
      await page.waitForTimeout(1000);

      // Ищем кнопку "Назначить" для доступных ролей
      const assignButtons = page.locator('button:has-text("Назначить")');
      const assignCount = await assignButtons.count();

      if (assignCount > 0) {
        // Назначаем первую доступную роль
        await assignButtons.first().click();
        await page.waitForTimeout(1000);

        // Проверяем успешное назначение (уведомление или обновление списка)
        const successNotification = page.locator(
          '[role="alert"]:has-text("успешно"), .notification:has-text("успешно")'
        );
        const hasSuccess = await successNotification
          .isVisible()
          .catch(() => false);

        // Роль должна появиться в списке назначенных или показаться уведомление
        expect(
          hasSuccess ||
            (await page.locator('text=/назначенные роли/i').isVisible())
        ).toBe(true);
      }
    }
  });

  test('should delete user (if has permission)', async ({ page }) => {
    // Ищем кнопки удаления (только для не-супер-администраторов)
    const deleteButtons = page.locator(
      'button[title="Удалить"], button:has([class*="Trash2"])'
    );
    const count = await deleteButtons.count();

    if (count > 0) {
      // Удаляем первого пользователя (не супер-администратора)
      await deleteButtons.first().click();
      await page.waitForTimeout(1000);

      // Проверяем успешное удаление (уведомление)
      const successNotification = page.locator(
        '[role="alert"]:has-text("успешно"), .notification:has-text("успешно")'
      );
      const hasSuccess = await successNotification
        .isVisible()
        .catch(() => false);

      // Пользователь должен быть удален или показаться уведомление
      expect(hasSuccess).toBe(true);
    }
  });

  test('should filter users by status', async ({ page }) => {
    // Ищем селектор фильтра статуса
    const statusFilter = page.locator(
      'select:has(option:has-text("Активные")), select:has(option:has-text("Неактивные"))'
    );

    if (await statusFilter.isVisible().catch(() => false)) {
      // Выбираем фильтр "Активные"
      await statusFilter.selectOption({ label: /активные|active/i });
      await page.waitForTimeout(1000);

      // Проверяем, что таблица обновилась
      const table = page.locator('table, [role="table"]');
      await expect(table).toBeVisible();
    }
  });

  test('should search users', async ({ page }) => {
    // Ищем поле поиска
    const searchInput = page.locator(
      'input[placeholder*="Поиск"], input[type="search"]'
    );

    if (await searchInput.isVisible().catch(() => false)) {
      // Вводим поисковый запрос
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Проверяем, что таблица обновилась
      const table = page.locator('table, [role="table"]');
      await expect(table).toBeVisible();
    }
  });
});
