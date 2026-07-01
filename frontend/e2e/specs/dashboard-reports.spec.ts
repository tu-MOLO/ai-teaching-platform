import { test, expect } from '../fixtures/auth.fixture'
import { loginViaApi, createCourse } from '../utils/api-helper'

test.describe('仪表盘与报告页面', () => {
  test.describe('仪表盘数据展示', () => {
    test('仪表盘页面应正常渲染，展示统计卡片和布局结构', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // 导航到仪表盘首页
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 验证仪表盘标题"工作台"存在
      await expect(page.getByRole('heading', { name: /工作台/ })).toBeVisible({ timeout: 10000 })

      // 验证统计卡片区域存在
      const statsStrip = page.locator('.stats-strip')
      await expect(statsStrip).toBeVisible({ timeout: 5000 })

      // 验证统计卡片标题存在（新用户数据可能为 0）
      // 总课程数
      await expect(page.getByText('总课程数')).toBeVisible({ timeout: 5000 })
      // 总学生数
      await expect(page.getByText('总学生数')).toBeVisible({ timeout: 5000 })
      // 本月教案
      await expect(page.getByText('本月教案')).toBeVisible({ timeout: 5000 })
      // 我的资源
      await expect(page.getByText('我的资源')).toBeVisible({ timeout: 5000 })

      // 验证快速操作区域存在
      await expect(page.getByText('快捷操作')).toBeVisible({ timeout: 5000 })

      // 验证快捷操作按钮存在
      await expect(page.getByRole('button', { name: /创建新课程/ })).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('button', { name: /添加学生/ })).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('button', { name: /查看报告/ })).toBeVisible({ timeout: 5000 })

      // 验证系统通知区域存在
      await expect(page.getByText('系统通知')).toBeVisible({ timeout: 5000 })
    })

    test('创建课程后仪表盘统计更新', async ({ authenticatedPage, testUser, request }) => {
      const page = authenticatedPage

      // 获取 API token
      const token = await loginViaApi(request, testUser.username, testUser.password)
      expect(token).toBeTruthy()

      // 1. 导航到仪表盘
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // 2. 等待统计卡片加载完成
      await expect(page.locator('.stat-item-value').first()).toBeVisible({ timeout: 10000 })

      // 3. 记录当前"总课程数"的值
      // 找到包含"总课程数"文本的 stat-item，然后获取其 stat-item-value
      const totalCoursesItem = page.locator('.stat-item').filter({ hasText: '总课程数' })
      const totalCoursesValue = await totalCoursesItem.locator('.stat-item-value').textContent()
      const initialCourseCount = parseInt(totalCoursesValue?.replace(/,/g, '') || '0', 10)

      // 4. 通过 API 创建一个新课程
      const courseData = await createCourse(request, token, {
        name: `E2E 仪表盘测试课程 ${Date.now()}`,
        subject: '数学',
        grade: '三年级',
        schedule: '周一 9:00-9:40',
        status: 'active',
      })
      const courseId = (courseData as any).id || (courseData as any).data?.id
      expect(courseId).toBeTruthy()

      try {
        // 5. 刷新仪表盘页面
        await page.reload()
        await page.waitForLoadState('networkidle')

        // 6. 等待数据加载完成
        await expect(page.locator('.stat-item-value').first()).toBeVisible({ timeout: 10000 })

        // 7. 验证"总课程数"比之前增加 1
        const updatedTotalCoursesItem = page.locator('.stat-item').filter({ hasText: '总课程数' })
        const updatedTotalCoursesValue = await updatedTotalCoursesItem.locator('.stat-item-value').textContent()
        const updatedCourseCount = parseInt(updatedTotalCoursesValue?.replace(/,/g, '') || '0', 10)

        expect(updatedCourseCount).toBe(initialCourseCount + 1)
      } finally {
        // 8. 清理：删除创建的课程
        await request.delete(`/api/v1/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
    })
  })

  test.describe('报告页面数据', () => {
    test('报告页面应正常加载，展示图表区域', async ({ authenticatedPage }) => {
      const page = authenticatedPage

      // 导航到报告页面
      await page.goto('/reports')
      await page.waitForLoadState('networkidle')

      // 验证报告页面标题
      await expect(page.getByText('教学数据分析报告')).toBeVisible({ timeout: 10000 })

      // 验证统计卡片存在
      await expect(page.getByText('总课程数')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('总学生数')).toBeVisible({ timeout: 5000 })

      // 验证图表区域存在
      // 课程分类统计图表
      await expect(page.getByText('课程分类统计')).toBeVisible({ timeout: 5000 })
      // 学生年级分布图表
      await expect(page.getByText('学生年级分布')).toBeVisible({ timeout: 5000 })
      // 月度教学趋势图表
      await expect(page.getByText('月度教学趋势')).toBeVisible({ timeout: 5000 })

      // 验证最近活动区域存在
      await expect(page.getByText('最近活动')).toBeVisible({ timeout: 5000 })
    })
  })
})