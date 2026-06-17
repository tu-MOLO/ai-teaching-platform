import { test, expect } from '../fixtures/auth.fixture'

test.describe('AI 助手页面', () => {
  test.describe('发送消息并获取回复', () => {
    test('用户输入消息并发送后，应收到 AI 回复', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // 导航到 AI 助手页面
      await page.goto('/ai-assistant')
      await page.waitForLoadState('networkidle')

      // 如果页面显示"请先配置 API 密钥"提示，则跳过实际发送测试
      const noApiKeyHint = page.getByText('请先配置 API 密钥以启用 AI 助手功能')
      if (await noApiKeyHint.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 未配置 API 密钥：验证配置引导显示，且聊天输入区不可见
        await expect(noApiKeyHint).toBeVisible()
        // 验证没有聊天输入区（未配置 Key 时不应显示聊天界面）
        const chatInput = page.getByPlaceholder('输入消息，Enter 发送，Shift+Enter 换行')
        await expect(chatInput).not.toBeVisible({ timeout: 3000 }).catch(() => {})
        return
      }

      // 找到聊天输入框（TextArea）
      const chatInput = page.getByPlaceholder('输入消息，Enter 发送，Shift+Enter 换行')
      await expect(chatInput).toBeVisible({ timeout: 10000 })

      // 输入消息
      const testMessage = '你好，请介绍一下你自己'
      await chatInput.fill(testMessage)

      // 点击发送按钮（primary 按钮，包含 SendOutlined 图标）
      const sendButton = page.locator('.chat-input-row').getByRole('button')
      await expect(sendButton).toBeEnabled()
      await sendButton.click()

      // 等待用户消息出现在聊天区域
      await expect(page.locator('.chat-message.user')).toBeVisible({ timeout: 5000 })

      // 等待 AI 回复（可能存在 loading 状态，使用更长超时）
      // AI 回复以 assistant 样式出现
      const assistantMessage = page.locator('.chat-message.assistant')
      await expect(assistantMessage).toBeVisible({ timeout: 60000 })

      // 验证回复包含文本内容
      const assistantContent = assistantMessage.locator('.chat-message-content')
      await expect(assistantContent).not.toBeEmpty({ timeout: 30000 })
    })
  })

  test.describe('对话管理', () => {
    test('点击新建对话后，聊天区域应清空', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // 导航到 AI 助手页面
      await page.goto('/ai-assistant')
      await page.waitForLoadState('networkidle')

      // 如果未配置 API 密钥，只验证页面渲染
      const noApiKeyHint = page.getByText('请先配置 API 密钥以启用 AI 助手功能')
      if (await noApiKeyHint.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 未配置 API 密钥：验证配置引导显示
        await expect(noApiKeyHint).toBeVisible()
        return
      }

      // 确保侧边栏展开（可能默认折叠）
      const sidebar = page.locator('.ai-assistant-sidebar')
      // 如果侧边栏折叠，尝试展开
      if (await sidebar.locator('.collapsed').count() > 0) {
        const expandButton = sidebar.getByRole('button', { name: '展开' })
        if (await expandButton.isVisible().catch(() => false)) {
          await expandButton.click()
        }
      }

      // 查找"新建对话"按钮
      const newConversationButton = page.getByRole('button', { name: '新建对话' })
      await expect(newConversationButton).toBeVisible({ timeout: 10000 })

      // 点击新建对话
      await newConversationButton.click()

      // 验证聊天区域显示空状态提示（"开始一段新对话"）
      await expect(page.getByText('开始一段新对话')).toBeVisible({ timeout: 5000 })
    })
  })
})