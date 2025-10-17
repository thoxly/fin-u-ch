import { test, expect } from '@playwright/test';

test.describe('Demo User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display demo credentials on public page', async ({ page }) => {
    // Check if demo credentials are displayed on the landing page
    const demoSection = page.locator('[data-testid="demo-credentials"]');
    await expect(demoSection).toBeVisible();

    // Verify demo credentials are shown
    await expect(demoSection.locator('text=demo@example.com')).toBeVisible();
    await expect(demoSection.locator('text=demo123')).toBeVisible();
    await expect(demoSection.locator('text=Демо Компания ООО')).toBeVisible();
  });

  test('should allow login with demo credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in demo credentials
    await page.fill('[data-testid="email-input"]', 'demo@example.com');
    await page.fill('[data-testid="password-input"]', 'demo123');

    // Click login button
    await page.click('[data-testid="login-button"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');

    // Should show demo company name
    await expect(page.locator('text=Демо Компания ООО')).toBeVisible();
  });

  test('should display demo data in dashboard', async ({ page }) => {
    // Login with demo credentials
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'demo@example.com');
    await page.fill('[data-testid="password-input"]', 'demo123');
    await page.click('[data-testid="login-button"]');

    // Wait for dashboard to load
    await expect(page).toHaveURL('/dashboard');

    // Check that demo data is displayed
    await expect(
      page.locator('[data-testid="operations-count"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="accounts-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="articles-count"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="counterparties-count"]')
    ).toBeVisible();

    // Verify counts are greater than 0
    const operationsCount = await page.textContent(
      '[data-testid="operations-count"]'
    );
    const accountsCount = await page.textContent(
      '[data-testid="accounts-count"]'
    );
    const articlesCount = await page.textContent(
      '[data-testid="articles-count"]'
    );
    const counterpartiesCount = await page.textContent(
      '[data-testid="counterparties-count"]'
    );

    expect(parseInt(operationsCount || '0')).toBeGreaterThan(0);
    expect(parseInt(accountsCount || '0')).toBeGreaterThan(0);
    expect(parseInt(articlesCount || '0')).toBeGreaterThan(0);
    expect(parseInt(counterpartiesCount || '0')).toBeGreaterThan(0);
  });

  test('should show demo operations in operations page', async ({ page }) => {
    // Login with demo credentials
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'demo@example.com');
    await page.fill('[data-testid="password-input"]', 'demo123');
    await page.click('[data-testid="login-button"]');

    // Navigate to operations page
    await page.goto('/operations');

    // Check that demo operations are displayed
    await expect(
      page.locator('[data-testid="operations-table"]')
    ).toBeVisible();

    // Should have at least one operation
    const operationRows = page.locator('[data-testid="operation-row"]');
    await expect(operationRows).toHaveCount({ min: 1 });
  });

  test('should show demo plans in planning page', async ({ page }) => {
    // Login with demo credentials
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'demo@example.com');
    await page.fill('[data-testid="password-input"]', 'demo123');
    await page.click('[data-testid="login-button"]');

    // Navigate to planning page
    await page.goto('/planning');

    // Check that demo plans are displayed
    await expect(page.locator('[data-testid="plans-table"]')).toBeVisible();

    // Should have at least one plan
    const planRows = page.locator('[data-testid="plan-row"]');
    await expect(planRows).toHaveCount({ min: 1 });
  });

  test('should show demo accounts in accounts page', async ({ page }) => {
    // Login with demo credentials
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'demo@example.com');
    await page.fill('[data-testid="password-input"]', 'demo123');
    await page.click('[data-testid="login-button"]');

    // Navigate to accounts page
    await page.goto('/accounts');

    // Check that demo accounts are displayed
    await expect(page.locator('[data-testid="accounts-table"]')).toBeVisible();

    // Should have at least one account
    const accountRows = page.locator('[data-testid="account-row"]');
    await expect(accountRows).toHaveCount({ min: 1 });
  });

  test('should show demo articles in articles page', async ({ page }) => {
    // Login with demo credentials
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'demo@example.com');
    await page.fill('[data-testid="password-input"]', 'demo123');
    await page.click('[data-testid="login-button"]');

    // Navigate to articles page
    await page.goto('/articles');

    // Check that demo articles are displayed
    await expect(page.locator('[data-testid="articles-table"]')).toBeVisible();

    // Should have at least one article
    const articleRows = page.locator('[data-testid="article-row"]');
    await expect(articleRows).toHaveCount({ min: 1 });
  });

  test('should show demo counterparties in counterparties page', async ({
    page,
  }) => {
    // Login with demo credentials
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'demo@example.com');
    await page.fill('[data-testid="password-input"]', 'demo123');
    await page.click('[data-testid="login-button"]');

    // Navigate to counterparties page
    await page.goto('/counterparties');

    // Check that demo counterparties are displayed
    await expect(
      page.locator('[data-testid="counterparties-table"]')
    ).toBeVisible();

    // Should have at least one counterparty
    const counterpartyRows = page.locator('[data-testid="counterparty-row"]');
    await expect(counterpartyRows).toHaveCount({ min: 1 });
  });

  test('should display demo credentials in footer', async ({ page }) => {
    // Check if demo credentials are displayed in footer
    const footer = page.locator('[data-testid="footer"]');
    await expect(footer).toBeVisible();

    const demoCredentials = footer.locator('[data-testid="demo-credentials"]');
    await expect(demoCredentials).toBeVisible();

    // Verify demo credentials are shown
    await expect(
      demoCredentials.locator('text=demo@example.com')
    ).toBeVisible();
    await expect(demoCredentials.locator('text=demo123')).toBeVisible();
  });

  test('should show demo data in reports', async ({ page }) => {
    // Login with demo credentials
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'demo@example.com');
    await page.fill('[data-testid="password-input"]', 'demo123');
    await page.click('[data-testid="login-button"]');

    // Navigate to reports page
    await page.goto('/reports');

    // Check that demo reports are displayed
    await expect(page.locator('[data-testid="reports-section"]')).toBeVisible();

    // Should have cashflow report
    await expect(page.locator('[data-testid="cashflow-report"]')).toBeVisible();

    // Should have BDDS report
    await expect(page.locator('[data-testid="bdds-report"]')).toBeVisible();
  });
});
