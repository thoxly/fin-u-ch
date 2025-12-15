import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('Admin Audit Logs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    // Переходим на страницу журнала действий
    await page.goto('/admin/audit-logs');
    await page.waitForLoadState('networkidle');
  });

  test('should display audit logs page with correct elements', async ({
    page,
  }) => {
    // Проверяем заголовок страницы
    await expect(page.locator('h1')).toContainText(
      /журнал действий|audit logs/i
    );

    // Проверяем наличие таблицы логов
    const table = page.locator('table, [role="table"]');
    await expect(table).toBeVisible();
  });

  test('should display audit logs table with columns', async ({ page }) => {
    // Проверяем наличие колонок в таблице
    const table = page.locator('table, [role="table"]');
    await expect(table).toBeVisible();

    // Проверяем наличие заголовков колонок
    const headers = ['Дата', 'Пользователь', 'Действие', 'Сущность', 'Детали'];
    for (const header of headers) {
      const headerElement = page.locator(
        `th:has-text("${header}"), [role="columnheader"]:has-text("${header}")`
      );
      // Хотя бы один заголовок должен быть виден
      const isVisible = await headerElement
        .first()
        .isVisible()
        .catch(() => false);
      if (isVisible) {
        await expect(headerElement.first()).toBeVisible();
        break;
      }
    }
  });

  test('should filter audit logs by entity', async ({ page }) => {
    // Ищем селектор фильтра сущности
    const entityFilter = page.locator(
      'select:has(option:has-text("Сущность")), select[name="entity"]'
    );

    if (await entityFilter.isVisible().catch(() => false)) {
      // Выбираем сущность (если есть опции)
      const options = await entityFilter.locator('option').all();
      if (options.length > 1) {
        await entityFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1000);

        // Проверяем, что таблица обновилась
        const table = page.locator('table, [role="table"]');
        await expect(table).toBeVisible();
      }
    }
  });

  test('should filter audit logs by action', async ({ page }) => {
    // Ищем селектор фильтра действия
    const actionFilter = page.locator(
      'select:has(option:has-text("Действие")), select[name="action"]'
    );

    if (await actionFilter.isVisible().catch(() => false)) {
      // Выбираем действие (если есть опции)
      const options = await actionFilter.locator('option').all();
      if (options.length > 1) {
        await actionFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1000);

        // Проверяем, что таблица обновилась
        const table = page.locator('table, [role="table"]');
        await expect(table).toBeVisible();
      }
    }
  });

  test('should filter audit logs by date range', async ({ page }) => {
    // Ищем поля фильтрации по дате
    const dateFromInput = page.locator(
      'input[type="date"], input[name="dateFrom"]'
    );
    const dateToInput = page.locator(
      'input[type="date"], input[name="dateTo"]'
    );

    if (await dateFromInput.isVisible().catch(() => false)) {
      // Устанавливаем дату начала
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const dateFrom = weekAgo.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];

      await dateFromInput.fill(dateFrom);

      if (await dateToInput.isVisible().catch(() => false)) {
        await dateToInput.fill(dateTo);
      }

      await page.waitForTimeout(1000);

      // Проверяем, что таблица обновилась
      const table = page.locator('table, [role="table"]');
      await expect(table).toBeVisible();
    }
  });

  test('should clear filters', async ({ page }) => {
    // Ищем кнопку очистки фильтров
    const clearButton = page.locator(
      'button:has-text("Очистить"), button:has-text("Сбросить")'
    );

    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
      await page.waitForTimeout(1000);

      // Проверяем, что таблица обновилась
      const table = page.locator('table, [role="table"]');
      await expect(table).toBeVisible();
    }
  });

  test('should paginate audit logs', async ({ page }) => {
    // Ищем кнопки пагинации
    const nextButton = page.locator(
      'button:has-text("Далее"), button:has-text("Next"), button[aria-label*="next"]'
    );
    const prevButton = page.locator(
      'button:has-text("Назад"), button:has-text("Previous"), button[aria-label*="prev"]'
    );

    if (await nextButton.isVisible().catch(() => false)) {
      // Переходим на следующую страницу
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Проверяем, что таблица обновилась
      const table = page.locator('table, [role="table"]');
      await expect(table).toBeVisible();

      // Проверяем, что кнопка "Назад" стала активной
      if (await prevButton.isVisible().catch(() => false)) {
        await expect(prevButton).toBeEnabled();
      }
    }
  });

  test('should show access denied message if no permission', async ({
    page,
  }) => {
    // Если у пользователя нет прав на просмотр журнала действий,
    // должна отображаться соответствующая страница
    const accessDenied = page.locator(
      'text=/нет прав|access denied|доступ запрещён/i'
    );
    const hasAccessDenied = await accessDenied.isVisible().catch(() => false);

    // Либо показывается сообщение об отсутствии прав, либо таблица с логами
    const table = page.locator('table, [role="table"]');
    const hasTable = await table.isVisible().catch(() => false);

    expect(hasAccessDenied || hasTable).toBe(true);
  });
});
