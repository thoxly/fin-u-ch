import { test, expect } from '@playwright/test';
import { loginAsTestUser, expectAuthenticated } from './helpers/auth';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

test.describe('Bank Statement Import', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await expectAuthenticated(page);
  });

  test('should display import button on operations page', async ({ page }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Проверяем наличие кнопки импорта
    const importButton = page.locator(
      'button:has-text("Импорт выписки"), button:has-text("Импорт")'
    );
    await expect(importButton.first()).toBeVisible();
  });

  test('should open import modal when clicking import button', async ({
    page,
  }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Нажимаем кнопку импорта
    const importButton = page
      .locator('button:has-text("Импорт выписки"), button:has-text("Импорт")')
      .first();
    await importButton.click();

    // Проверяем, что модальное окно открылось
    const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
    await expect(modal).toBeVisible();

    // Проверяем наличие вкладок
    const uploadTab = page.locator('button:has-text("Загрузка файла")');
    const historyTab = page.locator('button:has-text("История импортов")');

    await expect(uploadTab).toBeVisible();
    await expect(historyTab).toBeVisible();
  });

  test('should switch to history tab', async ({ page }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Открываем модальное окно
    const importButton = page
      .locator('button:has-text("Импорт выписки"), button:has-text("Импорт")')
      .first();
    await importButton.click();

    // Переключаемся на вкладку истории
    const historyTab = page.locator('button:has-text("История импортов")');
    await historyTab.click();

    // Проверяем, что отображается история импортов
    const historyContent = page.locator(
      'text=История импортов, h2:has-text("История импортов")'
    );
    await expect(historyContent.first()).toBeVisible();
  });

  test('should display file upload area', async ({ page }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Открываем модальное окно
    const importButton = page
      .locator('button:has-text("Импорт выписки"), button:has-text("Импорт")')
      .first();
    await importButton.click();

    // Проверяем наличие зоны загрузки файла
    const uploadArea = page.locator(
      'input[type="file"], [class*="upload"], [class*="drag"], text="Перетащите файл"'
    );
    await expect(uploadArea.first()).toBeVisible();
  });

  test('should handle file upload (if file input is accessible)', async ({
    page,
  }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Открываем модальное окно
    const importButton = page
      .locator('button:has-text("Импорт выписки"), button:has-text("Импорт")')
      .first();
    await importButton.click();

    // Создаем тестовый файл
    const testFileContent = `1CClientBankExchange
ВерсияФормата=1.03
Кодировка=Windows

СекцияДокумент=Платежное поручение
Дата=01.01.2025
Сумма=1000.00
НазначениеПлатежа=Тестовая операция
КонецДокумента`;

    // Пытаемся найти input для загрузки файла
    const fileInput = page.locator('input[type="file"]');

    if ((await fileInput.count()) > 0) {
      // Создаем временный файл и загружаем его
      const testFilePath = join(__dirname, '../test-statement.txt');
      writeFileSync(testFilePath, testFileContent);

      try {
        await fileInput.setInputFiles(testFilePath);

        // Ждем обработки файла (может быть загрузка, парсинг)
        await page.waitForTimeout(2000);

        // Проверяем, что появилась таблица маппинга или сообщение об успехе
        const mappingTable = page.locator(
          'text=Импортированные операции, table, [class*="mapping"], [class*="import"]'
        );
        const successMessage = page.locator(
          'text=успешно, text=загружен, [class*="success"]'
        );

        // Один из них должен быть виден
        const hasTable = (await mappingTable.count()) > 0;
        const hasSuccess = (await successMessage.count()) > 0;

        expect(hasTable || hasSuccess).toBe(true);
      } finally {
        // Очищаем временный файл
        unlinkSync(testFilePath);
      }
    }
  });

  test('should close modal when clicking close button', async ({ page }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Открываем модальное окно
    const importButton = page
      .locator('button:has-text("Импорт выписки"), button:has-text("Импорт")')
      .first();
    await importButton.click();

    // Проверяем, что модальное окно открыто
    const modal = page.locator('[role="dialog"], .modal, [class*="Modal"]');
    await expect(modal).toBeVisible();

    // Ищем кнопку закрытия
    const closeButton = page
      .locator(
        'button[aria-label*="close"], button[aria-label*="Close"], button:has([class*="X"]), [class*="close"]'
      )
      .first();

    if ((await closeButton.count()) > 0) {
      await closeButton.click();

      // Ждем, пока модальное окно закроется
      await page.waitForTimeout(500);

      // Проверяем, что модальное окно больше не видно
      const isModalVisible = await modal.isVisible().catch(() => false);
      expect(isModalVisible).toBe(false);
    }
  });

  test('should display import history when available', async ({ page }) => {
    await page.goto('/operations');
    await page.waitForLoadState('networkidle');

    // Открываем модальное окно
    const importButton = page
      .locator('button:has-text("Импорт выписки"), button:has-text("Импорт")')
      .first();
    await importButton.click();

    // Переключаемся на вкладку истории
    const historyTab = page.locator('button:has-text("История импортов")');
    await historyTab.click();

    // Ждем загрузки истории
    await page.waitForTimeout(1000);

    // Проверяем наличие элементов истории (таблица или пустое состояние)
    const historyTable = page.locator('table, [class*="table"]');
    const emptyState = page.locator(
      'text=Нет импортов, text=пуста, [class*="empty"]'
    );

    const hasTable = (await historyTable.count()) > 0;
    const hasEmptyState = (await emptyState.count()) > 0;

    // Должно быть либо таблица, либо пустое состояние
    expect(hasTable || hasEmptyState).toBe(true);
  });
});
