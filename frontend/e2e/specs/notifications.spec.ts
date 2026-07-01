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

  test.describe('按类型筛选通知', () => {
    test('通过类型下拉框筛选通知并恢复', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // 1. 导航到通知中心页面
      await page.goto('/notifications')
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: /通知中心/ })).toBeVisible({ timeout: 10000 })

      // 2. 验证筛选类型下拉框存在
      await expect(page.getByText('筛选类型').first()).toBeVisible({ timeout: 5000 })

      // 3. 点击类型筛选下拉框打开下拉菜单
      const typeSelect = page.locator('.ant-select').filter({
        has: page.locator('.ant-select-selection-placeholder:has-text("筛选类型")')
      }).first()
      await typeSelect.locator('.ant-select-selector').click()

      // 等待下拉菜单出现
      const dropdown = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first()
      await expect(dropdown).toBeVisible({ timeout: 5000 })

      // 4. 选择"系统"通知类型
      const systemOption = dropdown.locator('.ant-select-item-option', { hasText: '系统' })
      await expect(systemOption).toBeVisible({ timeout: 3000 })
      await systemOption.click()

      // 等待下拉关闭并等待数据加载完成
      await expect(dropdown).toBeHidden({ timeout: 3000 })
      await page.waitForLoadState('networkidle')

      // 5. 验证列表更新：仅显示系统类型通知或显示空状态
      const notificationList = page.locator('.notification-list')
      const emptyHint = page.getByText('暂无通知')
      const hasList = await notificationList.isVisible().catch(() => false)
      const hasEmpty = await emptyHint.isVisible().catch(() => false)
      expect(hasList || hasEmpty).toBeTruthy()

      // 如果有通知，验证所有通知的类型标签均为"系统"
      if (hasList) {
        const rows = notificationList.locator('.notification-row')
        const rowCount = await rows.count()
        expect(rowCount).toBeGreaterThan(0)
        for (let i = 0; i < rowCount; i++) {
          const typeTag = rows.nth(i).locator('.notification-body-title .ant-tag').last()
          await expect(typeTag).toHaveText('系统')
        }
      }

      // 6. 切换回"全部"：hover 使清除按钮出现并点击清除筛选
      const selectedSelect = page.locator('.ant-select').filter({
        has: page.locator('.ant-select-selection-item:has-text("系统")')
      }).first()
      await selectedSelect.hover()
      const clearIcon = selectedSelect.locator('.ant-select-clear')
      await expect(clearIcon).toBeVisible({ timeout: 3000 })
      await clearIcon.click()

      // 等待数据加载完成
      await page.waitForLoadState('networkidle')

      // 7. 验证列表恢复：筛选 placeholder 重新出现，列表恢复显示
      await expect(page.getByText('筛选类型').first()).toBeVisible({ timeout: 5000 })

      const restoredList = page.locator('.notification-list')
      const restoredEmpty = page.getByText('暂无通知')
      const hasRestoredList = await restoredList.isVisible().catch(() => false)
      const hasRestoredEmpty = await restoredEmpty.isVisible().catch(() => false)
      expect(hasRestoredList || hasRestoredEmpty).toBeTruthy()
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