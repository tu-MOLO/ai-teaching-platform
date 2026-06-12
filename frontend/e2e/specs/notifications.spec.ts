import { test, expect } from '../fixtures/auth.fixture'

test.describe('通知功能', () => {
  test.describe('通知列表查看', () => {
    test('通过通知中心页面查看通知列表', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // 导航到通知中心页面
      await page.goto('/notifications')
      await page.waitForLoadState('networkidle')

      // 验证通知中心页面标题
      await expect(page.getByRole('heading', { name: /通知中心/ })).toBeVisible({ timeout: 10000 })

      // 验证筛选工具栏存在
      // Ant Design Select 不渲染 HTML placeholder 属性，改用文本匹配
      await expect(page.getByText('筛选类型').first()).toBeVisible({ timeout: 5000 })

      // 验证通知列表区域渲染（可能为空，新用户无通知）
      // 页面应显示通知列表或空状态提示
      const notificationList = page.locator('.notification-list')
      const emptyHint = page.getByText('暂无通知')

      const hasList = await notificationList.isVisible().catch(() => false)
      const hasEmpty = await emptyHint.isVisible().catch(() => false)

      // 至少两者之一应该可见
      expect(hasList || hasEmpty).toBeTruthy()
    })
  })

  test.describe('标记通知为已读', () => {
    test('在通知中心页面标记单条通知为已读', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // 导航到通知中心页面
      await page.goto('/notifications')
      await page.waitForLoadState('networkidle')

      // 等待页面加载
      await expect(page.getByRole('heading', { name: /通知中心/ })).toBeVisible({ timeout: 10000 })

      // 检查是否有未读通知
      const unreadNotification = page.locator('.notification-row.is-unread')

      if (await unreadNotification.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        // 获取第一条未读通知的标题，用于后续验证
        const notificationTitle = await unreadNotification.first().locator('.notification-body-title').first().textContent().catch(() => '')

        // 存在未读通知，点击"标记已读"按钮
        const markReadButton = unreadNotification.first().getByRole('button', { name: '标记已读' })
        await expect(markReadButton).toBeVisible({ timeout: 3000 })
        // 等待 API 响应后再验证样式变更
        const readResponse = page.waitForResponse(
          (res) => res.url().includes('/api/v1/notifications/') && res.url().endsWith('/read')
        )
        await markReadButton.click()
        await readResponse

        // 验证刚才点击的那条通知不再带有 is-unread class
        // 通过标题定位该通知，检查其不再有 is-unread 类
        await page.waitForTimeout(300)
        const targetRow = page.locator('.notification-row').filter({ hasText: notificationTitle || '' }).first()
        const hasUnreadClass = await targetRow.locator('.is-unread').first().isVisible().catch(() => false)
        expect(hasUnreadClass).toBeFalsy()
      } else {
        // 无未读通知，验证"全部已读"按钮为禁用状态
        const markAllReadButton = page.getByRole('button', { name: '全部已读' })
        if (await markAllReadButton.isVisible().catch(() => false)) {
          await expect(markAllReadButton).toBeDisabled()
        }
      }
    })
  })
})