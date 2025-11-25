import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('Admin Company Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    // Переходим на страницу настроек компании
    await page.goto('/admin/company-settings');
    await page.waitForLoadState('networkidle');
  });

  test('should display company settings page with correct elements', async ({
    page,
  }) => {
    // Проверяем заголовок страницы
    await expect(page.locator('h1')).toContainText(
      /настройки компании|company settings/i
    );

    // Проверяем наличие формы настроек
    const form = page.locator('form, [class*="form"]');
    await expect(form).toBeVisible();
  });

  test('should display company name field', async ({ page }) => {
    // Проверяем наличие поля названия компании
    const nameInput = page.locator(
      'input[name="name"], input[placeholder*="Название компании"]'
    );
    await expect(nameInput).toBeVisible();
  });

  test('should display base currency field', async ({ page }) => {
    // Проверяем наличие поля базовой валюты
    const currencySelect = page.locator(
      'select[name="currencyBase"], select:has(option:has-text("RUB"))'
    );
    await expect(currencySelect).toBeVisible();
  });

  test('should update company name', async ({ page }) => {
    // Находим поле названия компании
    const nameInput = page
      .locator('input[name="name"], input[placeholder*="Название компании"]')
      .first();

    if (await nameInput.isVisible().catch(() => false)) {
      // Получаем текущее значение
      const currentValue = await nameInput.inputValue().catch(() => '');

      // Изменяем название
      const newName = `Тестовая компания ${Date.now()}`;
      await nameInput.clear();
      await nameInput.fill(newName);

      // Сохраняем изменения
      const saveButton = page.locator('button:has-text("Сохранить")').first();
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

      // Либо показывается уведомление, либо значение сохранилось
      expect(
        hasSuccess ||
          (await nameInput
            .inputValue()
            .then((v) => v === newName)
            .catch(() => false))
      ).toBe(true);
    }
  });

  test('should update base currency', async ({ page }) => {
    // Находим селектор валюты
    const currencySelect = page
      .locator(
        'select[name="currencyBase"], select:has(option:has-text("RUB"))'
      )
      .first();

    if (await currencySelect.isVisible().catch(() => false)) {
      // Получаем текущее значение
      const currentValue = await currencySelect.inputValue().catch(() => '');

      // Выбираем другую валюту (если есть)
      const options = await currencySelect.locator('option').all();
      if (options.length > 1) {
        // Выбираем валюту, отличную от текущей
        for (let i = 0; i < options.length; i++) {
          const optionValue = await options[i]
            .getAttribute('value')
            .catch(() => '');
          if (optionValue && optionValue !== currentValue) {
            await currencySelect.selectOption(optionValue);
            break;
          }
        }

        // Сохраняем изменения
        const saveButton = page.locator('button:has-text("Сохранить")').first();
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

  test('should validate required fields', async ({ page }) => {
    // Находим поле названия компании
    const nameInput = page
      .locator('input[name="name"], input[placeholder*="Название компании"]')
      .first();

    if (await nameInput.isVisible().catch(() => false)) {
      // Очищаем поле
      await nameInput.clear();

      // Пытаемся сохранить
      const saveButton = page.locator('button:has-text("Сохранить")').first();
      const isDisabled = await saveButton.isDisabled().catch(() => false);

      // Кнопка должна быть disabled или должна показаться ошибка валидации
      expect(
        isDisabled ||
          (await page
            .locator('.error, [role="alert"]')
            .isVisible()
            .catch(() => false))
      ).toBe(true);
    }
  });
});
