import { test as base, expect, Page } from '@playwright/test'

export interface TestUser {
  username: string
  email: string
  password: string
}

/**
 * 使用系统预置的 teacher 账号（由 init_data.py 创建）
 * 避免 E2E 测试中注册用户触发后端限流（429）
 */
const DEFAULT_USER: TestUser = {
  username: 'teacher',
  email: 'teacher@example.com',
  password: 'Teacher@Local2026!',
}

/**
 * Helper: log in through API and navigate to dashboard.
 * API-based auth is the recommended Playwright pattern for E2E tests.
 */
export async function loginAs(page: Page, username: string, password: string): Promise<void> {
  // Login via API - cookies are shared with the page context
  const response = await page.request.post('/api/v1/auth/login', {
    data: { username, password, remember_me: true },
  })
  expect(response.status()).toBe(200)

  // Navigate to dashboard - the app's hydrate() will use the refresh_token cookie
  await page.goto('/')
  await page.waitForSelector('.sidebar', { timeout: 10000 })
}

/**
 * Helper: log out through the UI.
 */
export async function logout(page: Page): Promise<void> {
  // Click the user menu dropdown in the header, then click logout
  await page.click('[data-testid="user-menu"]')
  // After dropdown opens, click the logout menu item by its label
  await page.getByRole('menuitem', { name: '退出登录' }).click()
  await page.waitForURL('**/login')
}

export interface AuthFixtures {
  testUser: TestUser
  authenticatedPage: Page
}

export const test = base.extend<AuthFixtures>({
  testUser: async (_fixtures, use) => {
    await use(DEFAULT_USER)
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    // Login via API with the default teacher account
    await loginAs(page, testUser.username, testUser.password)

    // Return the authenticated page
    await use(page)
  },
})

export { expect }
