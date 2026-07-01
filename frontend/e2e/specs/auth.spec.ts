import { test, expect } from '../fixtures/auth.fixture'
import { selectFirstOption } from '../utils/select-helper'

/**
 * 认证 E2E 测试
 *
 * 覆盖注册、登录、登出、Token 刷新保持登录等核心认证流程
 */
test.describe('注册', () => {
  test('注册成功', async ({ page }) => {
    // 1. 导航到注册页面
    await page.goto('/register')
    await page.waitForSelector('form[id="register"]')

    // 2. 填写用户名（仅允许字母、数字和下划线）
    await page.fill('input[id="register_username"]', `e2e_register_${Date.now()}`)

    // 3. 填写邮箱
    await page.fill('input[id="register_email"]', `e2e_register_${Date.now()}@test.com`)

    // 4. 填写密码（至少8位，包含大小写字母和数字）
    await page.fill('input[id="register_password"]', 'TestPass1')

    // 5. 填写确认密码
    await page.fill('input[id="register_confirmPassword"]', 'TestPass1')

    // 6. 选择密保问题
    await selectFirstOption(page, '密保问题')

    // 7. 填写密保答案
    await page.fill('input[id="register_security_answer"]', '测试答案')

    // 8. 提交注册表单
    await page.locator('.register-button').click()

    // 9. 验证重定向到登录页
    await page.waitForURL('**/login')
    await expect(page).toHaveURL(/\/login/)

    // 10. 验证成功消息
    await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 })
  })

  test('注册失败 - 密码过短', async ({ page }) => {
    // 1. 导航到注册页面
    await page.goto('/register')
    await page.waitForSelector('form[id="register"]')

    // 2. 填写用户名
    await page.fill('input[id="register_username"]', `e2e_shortpw_${Date.now()}`)

    // 3. 填写邮箱
    await page.fill('input[id="register_email"]', `e2e_shortpw_${Date.now()}@test.com`)

    // 4. 填写过短的密码（少于8位）
    await page.fill('input[id="register_password"]', 'Ab1')

    // 5. 填写确认密码（与密码相同）
    await page.fill('input[id="register_confirmPassword"]', 'Ab1')

    // 6. 选择密保问题
    await selectFirstOption(page, '密保问题')

    // 7. 填写密保答案
    await page.fill('input[id="register_security_answer"]', '测试答案')

    // 8. 提交注册表单
    await page.locator('.register-button').click()

    // 9. 验证仍在注册页面（未跳转）
    await expect(page).toHaveURL(/\/register/)

    // 10. 验证出现表单校验错误提示
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 })
  })

  test('注册失败 - 确认密码不一致', async ({ page }) => {
    // 1. 导航到注册页面
    await page.goto('/register')
    await page.waitForSelector('form[id="register"]')

    // 2. 填写用户名
    await page.fill('input[id="register_username"]', `e2e_mismatch_${Date.now()}`)

    // 3. 填写邮箱
    await page.fill('input[id="register_email"]', `e2e_mismatch_${Date.now()}@test.com`)

    // 4. 填写有效密码
    await page.fill('input[id="register_password"]', 'TestPass1')

    // 5. 填写不匹配的确认密码
    await page.fill('input[id="register_confirmPassword"]', 'TestPass2')

    // 6. 选择密保问题
    await selectFirstOption(page, '密保问题')

    // 7. 填写密保答案
    await page.fill('input[id="register_security_answer"]', '测试答案')

    // 8. 提交注册表单
    await page.locator('.register-button').click()

    // 9. 验证仍在注册页面（未跳转）
    await expect(page).toHaveURL(/\/register/)

    // 10. 验证出现表单校验错误提示
    await expect(page.locator('.ant-form-item-explain-error').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('登录', () => {
  test('登录成功', async ({ page, testUser, request }) => {
    // 先通过 API 注册用户
    await request.post('/api/v1/auth/register', {
      data: {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        full_name: 'E2E Test User',
        security_question: '您的母校名称是什么？',
        security_answer: '测试答案',
      },
    })
    // 1. 导航到登录页面
    await page.goto('/login')
    await page.waitForSelector('form[id="login"]')

    // 监听页面错误
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') pageErrors.push(`[CONSOLE] ${msg.text()}`)
    })

    // 2. 填写用户名和密码
    await page.fill('input[id="login_username"]', testUser.username)
    await page.fill('input[id="login_password"]', testUser.password)

    // 3. 提交登录表单
    await page.click('button[type="submit"]')

    // 4. 验证重定向到工作台
    await page.waitForURL('**/', { timeout: 15000, waitUntil: 'domcontentloaded' })
    await expect(page).not.toHaveURL(/\/login/)

    // 5. 验证侧边栏可见（表示已登录进入后台）
    await expect(page.locator('.sidebar')).toBeVisible({ timeout: 5000 })
  })

  test('登录失败 - 错误密码', async ({ page, testUser, request }) => {
    // 先通过 API 注册用户
    await request.post('/api/v1/auth/register', {
      data: {
        username: testUser.username,
        email: testUser.email,
        password: testUser.password,
        full_name: 'E2E Test User',
        security_question: '您的母校名称是什么？',
        security_answer: '测试答案',
      },
    })

    // 1. 导航到登录页面
    await page.goto('/login')
    await page.waitForSelector('form[id="login"]')

    // 2. 填写正确的用户名和错误的密码
    await page.fill('input[id="login_username"]', testUser.username)
    await page.fill('input[id="login_password"]', 'WrongPass1')

    // 3. 提交登录表单
    await page.click('button[type="submit"]')

    // 4. 验证错误消息显示
    await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 })

    // 5. 验证仍然在登录页面
    await expect(page).toHaveURL(/\/login/)
  })

  test('登录失败 - 未注册用户名', async ({ page }) => {
    // 1. 导航到登录页面
    await page.goto('/login')
    await page.waitForSelector('form[id="login"]')

    // 2. 填写不存在的用户名
    await page.fill('input[id="login_username"]', `no-such-user-${Date.now()}`)
    await page.fill('input[id="login_password"]', 'Test@123456')

    // 3. 提交登录表单
    await page.click('button[type="submit"]')

    // 4. 验证错误消息显示
    await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 })

    // 5. 验证仍然在登录页面
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('会话', () => {
  test('Token 刷新保持登录', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // 1. 已验证的页面当前在 dashboard
    await expect(page.locator('.sidebar')).toBeVisible()

    // 2. 重新加载页面
    await page.reload()

    // 3. 验证仍然在 dashboard（未被重定向到 /login）
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('.sidebar')).toBeVisible({ timeout: 5000 })
  })

  test('登出', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // 1. 点击侧边栏的退出登录按钮
    await page.click('.sidebar-footer .logout-button')

    // 2. 验证重定向到登录页
    await page.waitForURL('**/login')
    await expect(page).toHaveURL(/\/login/)

    // 3. 尝试访问受保护页面 /，应被重定向到 /login
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('密码重置', () => {
  test('通过 API 重置密码后使用新密码登录', async ({ page, request }) => {
    // 1. 通过 API 注册一个带密保问题的测试用户
    const testUsername = `e2e_reset_${Date.now()}`
    const testEmail = `e2e_reset_${Date.now()}@test.com`
    const oldPassword = 'OldPass1'
    const newPassword = 'NewPass2'

    await request.post('/api/v1/auth/register', {
      data: {
        username: testUsername,
        email: testEmail,
        password: oldPassword,
        full_name: 'E2E Reset Test User',
        security_question: '您的母校名称是什么？',
        security_answer: '测试答案',
      },
    })

    // 2. 通过 API 获取密保问题
    const questionRes = await request.post('/api/v1/auth/password/reset/question', {
      data: { username: testUsername },
    })
    expect(questionRes.ok()).toBeTruthy()
    const questionData = await questionRes.json()
    const securityQuestion = questionData?.data?.security_question || questionData?.security_question
    expect(securityQuestion).toBeTruthy()

    // 3. 通过 API 重置密码
    const resetRes = await request.post('/api/v1/auth/password/reset', {
      data: {
        username: testUsername,
        security_answer: '测试答案',
        new_password: newPassword,
      },
    })
    expect(resetRes.ok()).toBeTruthy()

    // 4. 验证旧密码无法登录
    const oldLoginRes = await request.post('/api/v1/auth/login', {
      data: { username: testUsername, password: oldPassword },
    })
    expect(oldLoginRes.status()).toBe(401)

    // 5. 导航到登录页面，使用新密码通过 UI 登录
    await page.goto('/login')
    await page.waitForSelector('form[id="login"]')

    await page.fill('input[id="login_username"]', testUsername)
    await page.fill('input[id="login_password"]', newPassword)
    await page.click('button[type="submit"]')

    // 6. 验证登录成功
    await page.waitForURL('**/', { timeout: 15000, waitUntil: 'domcontentloaded' })
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('.sidebar')).toBeVisible({ timeout: 5000 })
  })
})