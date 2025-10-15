import { test, expect } from '@playwright/test';

test('can create a new article using OffCanvas form', async ({ page }) => {
  await page.goto('/articles');

  await page.getByRole('button', { name: 'Создать статью' }).click();

  await expect(page.getByText('Создать статью')).toBeVisible();

  await page.getByLabel('Название').fill('Тестовая статья');
  await page.getByLabel('Тип').selectOption('income');
  await page.getByLabel('Деятельность').selectOption('operating');
  await page.getByLabel('Активна').setChecked(true);

  await page.getByRole('button', { name: 'Создать' }).click();

  await expect(page.getByText('Создать статью')).toBeHidden();

  await expect(page.getByText('Тестовая статья')).toBeVisible();
  await expect(page.getByText('Доход')).toBeVisible();
  const offcanvasTitle = page.getByTestId('offcanvas-title');
  await expect(offcanvasTitle).toBeVisible();
  await expect(offcanvasTitle).toBeHidden();
});

test('can close OffCanvas by clicking overlay', async ({ page }) => {
  await page.goto('/articles');
  await page.getByRole('button', { name: 'Создать статью' }).click();

  await page
    .locator('div.fixed.inset-0.z-50')
    .click({ position: { x: 10, y: 10 } });

  await expect(page.getByText('Создать статью')).toBeHidden();
});

test('can close OffCanvas with Escape key', async ({ page }) => {
  await page.goto('/articles');
  await page.getByRole('button', { name: 'Создать статью' }).click();

  await page.keyboard.press('Escape');

  await expect(page.getByText('Создать статью')).toBeHidden();
});
