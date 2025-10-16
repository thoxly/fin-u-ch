import { Page } from '@playwright/test';

/**
 * Helper functions for authentication in E2E tests
 */
export class AuthHelper {
  /**
   * Login as a test user
   * Note: This is a placeholder - in real tests you'd need proper test data setup
   */
  static async loginAsTestUser(
    page: Page,
    email = 'test@example.com',
    password = 'password'
  ) {
    await page.goto('/login');

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL('/dashboard', { timeout: 10000 });
  }

  /**
   * Check if user is authenticated by looking for dashboard elements
   */
  static async isAuthenticated(page: Page): Promise<boolean> {
    try {
      await page.goto('/dashboard');
      // If we're redirected to login, we're not authenticated
      return !page.url().includes('/login');
    } catch {
      return false;
    }
  }

  /**
   * Logout user
   */
  static async logout(page: Page) {
    // Look for logout button/link and click it
    const logoutButton = page
      .locator(
        '[data-testid="logout"], button:has-text("Logout"), a:has-text("Logout")'
      )
      .first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForURL('/login');
    }
  }
}
