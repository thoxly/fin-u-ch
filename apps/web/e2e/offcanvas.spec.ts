import { test, expect } from '@playwright/test';

test('can create a new article using OffCanvas form', async ({ page }) => {
  const offcanvasTitle = page.getByTestId('offcanvas-title');
  await expect(offcanvasTitle).toBeVisible();
  await expect(offcanvasTitle).toBeHidden();
  // 1. Перейти на страницу статей
  await page.goto('/articles'); // замени на актуальный путь

  // 2. Нажать "Создать статью"
  await page.getByRole('button', { name: 'Создать статью' }).click();

  // 3. Убедиться, что OffCanvas открыт (проверим по заголовку)
  await expect(page.getByText('Создать статью')).toBeVisible();

  // 4. Заполнить форму
  await page.getByLabel('Название').fill('Тестовая статья');
  await page.getByLabel('Тип').selectOption('income');
  await page.getByLabel('Деятельность').selectOption('operating');
  await page.getByLabel('Активна').setChecked(true);

  // 5. Сохранить
  await page.getByRole('button', { name: 'Создать' }).click();

  // 6. Проверить, что OffCanvas закрыт
  await expect(page.getByText('Создать статью')).toBeHidden();

  // 7. Проверить, что статья появилась в таблице
  await expect(page.getByText('Тестовая статья')).toBeVisible();
  await expect(page.getByText('Доход')).toBeVisible();
});

test('can close OffCanvas by clicking overlay', async ({ page }) => {
  await page.goto('/articles');
  await page.getByRole('button', { name: 'Создать статью' }).click();

  // Клик по оверлею (фону)
  await page
    .locator('div.fixed.inset-0.z-50')
    .click({ position: { x: 10, y: 10 } });

  // Форма должна закрыться
  await expect(page.getByText('Создать статью')).toBeHidden();
});

test('can close OffCanvas with Escape key', async ({ page }) => {
  await page.goto('/articles');
  await page.getByRole('button', { name: 'Создать статью' }).click();

  await page.keyboard.press('Escape');

  await expect(page.getByText('Создать статью')).toBeHidden();
});
