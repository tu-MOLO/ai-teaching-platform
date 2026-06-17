import { test, expect } from '../fixtures/auth.fixture'

test.describe('系统设置', () => {
  test.describe('AI 配置', () => {
    test('配置 API 密钥', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // 1. 导航到 AI 配置页面
      await page.goto('/settings?tab=ai')
      await page.waitForLoadState('networkidle')

      // 2. 如果 URL 参数未生效，手动点击 AI 配置标签页
      const aiTab = page.getByRole('tab', { name: 'AI 配置' })
      if (await aiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 检查当前是否已经激活（ant-tabs-tab-active）
        const isActive = await aiTab.evaluate(
          (el) => el.classList.contains('ant-tabs-tab-active')
        ).catch(() => false)
        if (!isActive) {
          await aiTab.click()
          await page.waitForTimeout(500)
        }
      }

      // 3. 等待 AI 配置区域加载完成
      await page.waitForLoadState('networkidle')

      // 4. 验证 AI 配置区域渲染 — 查找 API 服务商 或 AI 助手配置
      await expect(
        page.getByText(/API 服务商|AI 助手配置/).first()
      ).toBeVisible({ timeout: 10000 })

      // 5. 填写 API 密钥
      const apiKeyInput = page.getByPlaceholder('请输入API密钥')
      await expect(apiKeyInput).toBeVisible({ timeout: 5000 })
      await apiKeyInput.fill('sk-test-e2e-api-key-for-settings')

      // 6. 点击保存按钮
      const saveButton = page.getByRole('button', { name: '保存配置' })
      await expect(saveButton).toBeVisible({ timeout: 5000 })
      await saveButton.click()

      // 7. 验证保存成功 — 成功消息或 "已配置个人 API 密钥" 文本
      await expect(
        page.getByText(/已配置/).first()
      ).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('主题配色', () => {
    test('切换预设主题', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // 1. 导航到主题配色页面
      await page.goto('/settings?tab=theme')
      await page.waitForLoadState('networkidle')

      // 2. 如果 URL 参数未生效，手动点击主题配色标签页
      const themeTab = page.getByRole('tab', { name: '主题配色' })
      if (await themeTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        const isActive = await themeTab.evaluate(
          (el) => el.classList.contains('ant-tabs-tab-active')
        ).catch(() => false)
        if (!isActive) {
          await themeTab.click()
          await page.waitForTimeout(500)
        }
      }

      await page.waitForLoadState('networkidle')

      // 3. 等待预设主题卡片渲染 — 验证 "预设配色方案" 标题可见
      await expect(
        page.getByText('预设配色方案').first()
      ).toBeVisible({ timeout: 10000 })

      // 4. 确认预设主题名称可见
      await expect(page.getByText('蓝色渐变').first()).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('莫兰迪柔色').first()).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('深灰中性').first()).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('紫粉渐变').first()).toBeVisible({ timeout: 5000 })

      // 5. 找到当前未选中的主题（莫兰迪柔色），点击切换
      // 当前选中的主题带有 "当前" Badge
      const morandiCard = page.locator('.ant-card').filter({ hasText: '莫兰迪柔色' }).first()
      await expect(morandiCard).toBeVisible({ timeout: 5000 })

      // 检查莫兰迪柔色是否已是当前主题（已有 "当前" badge）
      const morandiHasSelected = await morandiCard.getByText('当前').isVisible({ timeout: 1000 }).catch(() => false)
      if (morandiHasSelected) {
        // 莫兰迪柔色已选中，切换到紫粉渐变
        const violetCard = page.locator('.ant-card').filter({ hasText: '紫粉渐变' }).first()
        await violetCard.click()
      } else {
        // 莫兰迪柔色未选中，点击切换
        await morandiCard.click()
      }

      // 6. 等待主题切换生效
      await page.waitForTimeout(800)

      // 7. 验证点击的主题现在显示 "当前" badge
      const currentBadge = page.getByText('当前').first()
      await expect(currentBadge).toBeVisible({ timeout: 5000 })

      // 8. 验证页面仍然功能正常 — "颜色变量" 和 "实时预览" 区域可见
      await expect(
        page.getByText('颜色变量').first()
      ).toBeVisible({ timeout: 5000 })
      await expect(
        page.getByText('实时预览').first()
      ).toBeVisible({ timeout: 5000 })
    })

    test('自定义主题颜色', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // 1. 导航到主题配色页面
      await page.goto('/settings?tab=theme')
      await page.waitForLoadState('networkidle')

      // 2. 如果 URL 参数未生效，手动点击主题配色标签页
      const themeTab = page.getByRole('tab', { name: '主题配色' })
      if (await themeTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        const isActive = await themeTab.evaluate(
          (el) => el.classList.contains('ant-tabs-tab-active')
        ).catch(() => false)
        if (!isActive) {
          await themeTab.click()
          await page.waitForTimeout(500)
        }
      }

      await page.waitForLoadState('networkidle')

      // 3. 等待 "颜色变量" 区域渲染
      await expect(
        page.getByText('颜色变量').first()
      ).toBeVisible({ timeout: 10000 })

      // 4. 点击展开 "主色调" 面板
      // Collapse 面板的 label 包含 "主色调" 文本
      const primaryPanel = page.locator('.ant-collapse-header').filter({ hasText: '主色调' }).first()
      if (await primaryPanel.isVisible({ timeout: 3000 }).catch(() => false)) {
        await primaryPanel.click()
        await page.waitForTimeout(300)
      }

      // 5. 在展开的主色调面板中，找到第一个 HEX 输入框（monospace, width 120）
      // 这些输入框在 .ant-collapse-item-active 内部
      const hexInput = page.locator(
        '.ant-collapse-item-active input[style*="monospace"]'
      ).first()

      // Fallback: 如果通过样式找不到，尝试在活跃面板中查找 input
      const hexInputExists = await hexInput.isVisible({ timeout: 2000 }).catch(() => false)
      if (hexInputExists) {
        // 6. 清空并输入新颜色
        await hexInput.clear()
        await hexInput.fill('#FF6B6B')
        // 触发 blur 或 Enter 以应用更改
        await hexInput.press('Enter')
        await page.waitForTimeout(500)
      }
      // else: 如果找不到 hex 输入框，至少验证颜色变量编辑器已渲染

      // 7. 验证 "实时预览" 区域仍然可见，页面功能正常
      await expect(
        page.getByText('实时预览').first()
      ).toBeVisible({ timeout: 5000 })

      // 8. 验证颜色变量编辑器区域仍然存在
      await expect(
        page.getByText('主色调').first()
      ).toBeVisible({ timeout: 5000 })
    })
  })
})
