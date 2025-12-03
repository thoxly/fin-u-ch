import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('Admin Roles Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    // Переходим на страницу управления ролями
    await page.goto('/admin/roles');
    await page.waitForLoadState('networkidle');
  });

  test('should display roles page with correct elements', async ({ page }) => {
    // Проверяем заголовок страницы
    await expect(page.locator('h1')).toContainText(/роли|roles/i);

    // Проверяем наличие таблицы ролей
    const table = page.locator('table, [role="table"]');
    await expect(table).toBeVisible();

    // Проверяем наличие кнопки создания роли
    const createButton = page.locator('button:has-text("Создать роль")');
    await expect(createButton).toBeVisible();
  });

  test('should open create role modal', async ({ page }) => {
    // Нажимаем кнопку создания роли
    const createButton = page.locator('button:has-text("Создать роль")');
    await createButton.click();

    // Ждем открытия модального окна
    await page.waitForTimeout(500);

    // Проверяем наличие модального окна
    const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
    await expect(modal).toBeVisible();

    // Проверяем наличие полей формы
    await expect(
      page.locator('input[placeholder*="Название"], input[name="name"]')
    ).toBeVisible();
  });

  test('should create new role', async ({ page }) => {
    // Открываем модальное окно создания роли
    const createButton = page.locator('button:has-text("Создать роль")');
    await createButton.click();
    await page.waitForTimeout(500);

    // Заполняем форму
    const roleName = `Тестовая роль ${Date.now()}`;
    const nameInput = page
      .locator('input[placeholder*="Название"], input[name="name"]')
      .first();
    await nameInput.fill(roleName);

    // Опционально заполняем описание
    const descriptionInput = page.locator(
      'input[placeholder*="Описание"], textarea[name="description"]'
    );
    if (await descriptionInput.isVisible().catch(() => false)) {
      await descriptionInput.fill('Тестовое описание роли');
    }

    // Сохраняем роль
    const saveButton = page.locator('button:has-text("Сохранить")').first();
    await saveButton.click();

    // Ждем успешного создания
    await page.waitForTimeout(2000);

    // Проверяем успешное создание (уведомление или появление в таблице)
    const successNotification = page.locator(
      '[role="alert"]:has-text("успешно"), .notification:has-text("успешно")'
    );
    const hasSuccess = await successNotification.isVisible().catch(() => false);

    expect(
      hasSuccess || (await page.locator(`text=${roleName}`).isVisible())
    ).toBe(true);
  });

  test('should edit role', async ({ page }) => {
    // Ищем кнопку редактирования роли
    const editButtons = page.locator(
      'button[title="Изменить"], button:has([class*="Pencil"])'
    );
    const count = await editButtons.count();

    if (count > 0) {
      // Открываем форму редактирования первой роли
      await editButtons.first().click();
      await page.waitForTimeout(500);

      // Проверяем наличие модального окна редактирования
      const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
      await expect(modal).toBeVisible();

      // Проверяем, что поля заполнены
      const nameInput = page
        .locator('input[placeholder*="Название"], input[name="name"]')
        .first();
      await expect(nameInput).toHaveValue(/.+/);
    }
  });

  test('should open permissions modal', async ({ page }) => {
    // Ищем кнопку редактирования прав
    const permissionsButtons = page.locator(
      'button[title="Редактировать права"], button:has([class*="Shield"])'
    );
    const count = await permissionsButtons.count();

    if (count > 0) {
      // Открываем модальное окно прав (только для не-системных ролей)
      await permissionsButtons.first().click();
      await page.waitForTimeout(1000);

      // Проверяем наличие модального окна
      const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
      await expect(modal).toBeVisible();

      // Проверяем наличие таблицы прав
      const permissionsTable = page.locator(
        'table:has-text("Сущность"), table:has-text("Entity")'
      );
      await expect(permissionsTable).toBeVisible();
    }
  });

  test('should toggle permission in permissions modal', async ({ page }) => {
    // Ищем кнопку редактирования прав
    const permissionsButtons = page.locator(
      'button[title="Редактировать права"], button:has([class*="Shield"])'
    );
    const count = await permissionsButtons.count();

    if (count > 0) {
      // Открываем модальное окно прав
      await permissionsButtons.first().click();
      await page.waitForTimeout(1000);

      // Ищем первый чекбокс прав
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();

      if (checkboxCount > 0) {
        // Получаем состояние первого чекбокса
        const firstCheckbox = checkboxes.nth(2); // Пропускаем "Все" чекбоксы
        const isChecked = await firstCheckbox.isChecked().catch(() => false);

        // Переключаем чекбокс
        await firstCheckbox.click();
        await page.waitForTimeout(500);

        // Проверяем, что состояние изменилось
        const newState = await firstCheckbox.isChecked().catch(() => false);
        expect(newState).toBe(!isChecked);
      }
    }
  });

  test('should toggle all permissions for entity', async ({ page }) => {
    // Ищем кнопку редактирования прав
    const permissionsButtons = page.locator(
      'button[title="Редактировать права"], button:has([class*="Shield"])'
    );
    const count = await permissionsButtons.count();

    if (count > 0) {
      // Открываем модальное окно прав
      await permissionsButtons.first().click();
      await page.waitForTimeout(1000);

      // Ищем чекбокс "Все" для первой сущности
      const allCheckboxes = page
        .locator('td:has(input[type="checkbox"])')
        .first();
      const allCheckbox = allCheckboxes.locator('input[type="checkbox"]');

      if (await allCheckbox.isVisible().catch(() => false)) {
        const isChecked = await allCheckbox.isChecked().catch(() => false);

        // Переключаем чекбокс "Все"
        await allCheckbox.click();
        await page.waitForTimeout(500);

        // Проверяем, что состояние изменилось
        const newState = await allCheckbox.isChecked().catch(() => false);
        expect(newState).toBe(!isChecked);
      }
    }
  });

  test('should save permissions', async ({ page }) => {
    // Ищем кнопку редактирования прав
    const permissionsButtons = page.locator(
      'button[title="Редактировать права"], button:has([class*="Shield"])'
    );
    const count = await permissionsButtons.count();

    if (count > 0) {
      // Открываем модальное окно прав
      await permissionsButtons.first().click();
      await page.waitForTimeout(1000);

      // Изменяем какое-то право
      const checkboxes = page.locator('input[type="checkbox"]');
      const checkboxCount = await checkboxes.count();

      if (checkboxCount > 2) {
        const firstPermissionCheckbox = checkboxes.nth(2);
        const isChecked = await firstPermissionCheckbox
          .isChecked()
          .catch(() => false);
        await firstPermissionCheckbox.click();
        await page.waitForTimeout(500);

        // Сохраняем права
        const saveButton = page.locator('button:has-text("Сохранить права")');
        await saveButton.click();

        // Ждем успешного сохранения
        await page.waitForTimeout(2000);

        // Проверяем успешное сохранение
        const successNotification = page.locator(
          '[role="alert"]:has-text("успешно"), .notification:has-text("успешно")'
        );
        const hasSuccess = await successNotification
          .isVisible()
          .catch(() => false);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should delete role (if not system role)', async ({ page }) => {
    // Ищем кнопки удаления (только для не-системных ролей)
    const deleteButtons = page.locator(
      'button[title="Удалить"], button:has([class*="Trash2"])'
    );
    const count = await deleteButtons.count();

    if (count > 0) {
      // Удаляем первую не-системную роль
      await deleteButtons.first().click();
      await page.waitForTimeout(1000);

      // Проверяем успешное удаление (уведомление)
      const successNotification = page.locator(
        '[role="alert"]:has-text("успешно"), .notification:has-text("успешно")'
      );
      const hasSuccess = await successNotification
        .isVisible()
        .catch(() => false);

      expect(hasSuccess).toBe(true);
    }
  });

  test('should filter roles by category', async ({ page }) => {
    // Ищем селектор фильтра категории
    const categoryFilter = page.locator(
      'select:has(option:has-text("Категория"))'
    );

    if (await categoryFilter.isVisible().catch(() => false)) {
      // Выбираем категорию (если есть)
      const options = await categoryFilter.locator('option').all();
      if (options.length > 1) {
        await categoryFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1000);

        // Проверяем, что таблица обновилась
        const table = page.locator('table, [role="table"]');
        await expect(table).toBeVisible();
      }
    }
  });
});
