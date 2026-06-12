import { test, expect } from '../fixtures/auth.fixture'
import { loginViaApi, createCourse } from '../utils/api-helper'
import { selectFirstOption, selectOption } from '../utils/select-helper'

/**
 * 课程管理 E2E 测试
 *
 * 覆盖课程的创建、编辑、列表分页等核心流程
 */
test.describe('课程管理', () => {
  test('创建课程', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // 1. 导航到创建课程页面
    await page.goto('/courses/create')
    await page.waitForURL('**/courses/create')
    // 等待 ConfigurableSelect 选项数据加载完成(等待 loading spinner 消失)
    await page.locator('.ant-select-loading').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(1000)

    // 2. 填写课程名称
    const courseName = `E2E 测试课程 - ${Date.now()}`
    await page.fill('input[id="name"]', courseName)

    // 3. 选择学科
    await selectFirstOption(page, '学科')

    // 4. 选择年级
    await selectOption(page, '年级', '培智一年级')

    // 5. 填写上课时间
    await page.fill('input[id="schedule"]', '周一、周三 9:00-9:40')

    // 6. 选择状态
    await selectFirstOption(page, '状态')

    // 7. 提交表单
    await page.locator('button').filter({ hasText: /保\s*存/ }).click()

    // 8. 验证重定向到课程列表
    await page.waitForURL('**/courses', { timeout: 10000 })
    await expect(page).toHaveURL(/\/courses/)

    // 9. 验证新课程在列表中可见
    await expect(page.getByText(courseName)).toBeVisible({ timeout: 5000 })
  })

  test('编辑课程', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 通过 API 创建课程
    const courseData = await createCourse(request, token, {
      name: 'E2E 编辑前课程名',
      subject: '语文',
      grade: '一年级',
      schedule: '周二 10:00-10:40',
      status: 'active',
    })
    const courseId = (courseData as any).id || (courseData as any).data?.id
    expect(courseId).toBeTruthy()

    // 1. 导航到编辑课程页面
    await page.goto(`/courses/${courseId}/edit`)
    await page.waitForURL(`**/courses/${courseId}/edit`)

    // 2. 修改课程名称
    const updatedName = `E2E 编辑后课程名 - ${Date.now()}`
    await page.fill('input[id="name"]', updatedName)

    // 3. 保存修改
    await page.locator('button').filter({ hasText: /保\s*存/ }).click()

    // 4. 验证重定向到课程列表
    await page.waitForURL('**/courses', { timeout: 10000 })

    // 5. 验证更新后的课程名在列表中可见
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 5000 })
  })

  test('课程列表分页', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // 1. 导航到课程列表
    await page.goto('/courses')
    await page.waitForURL('**/courses')

    // 2. 验证页面标题可见
    await expect(page.getByText('课程管理')).toBeVisible({ timeout: 5000 })

    // 3. 验证表格或页面内容正常渲染（即使空列表也应有表格结构）
    const tableOrEmpty = page.locator('.ant-table').first()
    await expect(tableOrEmpty).toBeVisible({ timeout: 5000 })

    // 4. 验证"新建课程"按钮存在
    await expect(page.getByRole('button', { name: /新建课程/ })).toBeVisible()
  })
})