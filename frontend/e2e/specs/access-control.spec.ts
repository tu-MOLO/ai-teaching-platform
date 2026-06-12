import { test, expect } from '@playwright/test'
import { loginAs, logout } from '../fixtures/auth.fixture'
import { createTestUser, createCourse } from '../utils/api-helper'

test.describe('访问控制', () => {
  test.describe('未登录访问受保护页面', () => {
    const protectedPaths = [
      { path: '/', description: '仪表盘' },
      { path: '/courses', description: '课程管理' },
      { path: '/courses/create', description: '创建课程' },
      { path: '/students', description: '学生管理' },
      { path: '/portfolio', description: '成长档案' },
      { path: '/lesson-planner', description: '教案管理' },
      { path: '/resource-center', description: '资源中心' },
      { path: '/reports', description: '报告' },
      { path: '/profile', description: '个人资料' },
      { path: '/settings', description: '设置' },
      { path: '/notifications', description: '通知' },
      { path: '/ai-assistant', description: 'AI助手' },
    ]

    for (const { path, description } of protectedPaths) {
      test(`未登录访问${description}页面应重定向到登录页`, async ({ page }) => {
        // 不登录，直接访问受保护页面
        await page.goto(path)

        // 应被重定向到 /login
        await page.waitForURL('**/login', { timeout: 10000 })
        await expect(page).toHaveURL(/\/login/)
      })
    }
  })

  test.describe('用户无法访问他人数据', () => {
    test('用户B不应能访问用户A创建的课程编辑页面', async ({ page, request }) => {
      // 创建用户A
      const userA = await createTestUser(request)
      expect(userA.token).toBeTruthy()

      // 用户A登录
      await loginAs(page, userA.credentials.username, userA.credentials.password)

      // 用户A创建一个课程
      const courseData = {
        name: `用户A的课程-${Date.now()}`,
        subject: '数学',
        grade: '三年级',
        description: '这是用户A创建的测试课程',
      }
      const courseResult = (await createCourse(request, userA.token, courseData)) as Record<string, unknown>
      const courseId = courseResult?.data && typeof courseResult.data === 'object'
        ? (courseResult.data as Record<string, unknown>)?.id as string
        : courseResult?.id as string || ''

      expect(courseId).toBeTruthy()

      // 用户A登出
      await logout(page)

      // 创建用户B
      const userB = await createTestUser(request)
      expect(userB.token).toBeTruthy()

      // 用户B登录
      await loginAs(page, userB.credentials.username, userB.credentials.password)

      // 用户B尝试直接访问用户A的课程编辑页面
      const editPageUrl = `/courses/${courseId}/edit`
      await page.goto(editPageUrl)

      // SPA 中，页面先加载（返回 200），然后通过 JS 请求课程数据
      // 后端会返回 404（因为课程不属于用户B），前端捕获错误后重定向到 /courses
      // 等待重定向完成或错误页面显示
      await page.waitForURL('**/courses', { timeout: 10000 }).catch(() => {})

      // 验证访问被拒绝：页面不应停留在编辑页
      const currentUrl = page.url()
      const isOnEditPage = currentUrl.includes(editPageUrl)
      const hasErrorResult = await page.locator('.ant-result-error, .ant-result-404, .ant-result-403').isVisible({ timeout: 1000 }).catch(() => false)

      expect(isOnEditPage && !hasErrorResult).toBeFalsy()
    })
  })
})