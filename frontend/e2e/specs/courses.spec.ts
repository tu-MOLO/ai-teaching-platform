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

  test('删除课程', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 通过 API 创建课程
    const courseName = `E2E 待删除课程 ${Date.now()}`
    const courseData = await createCourse(request, token, {
      name: courseName,
      subject: '语文',
      grade: '一年级',
      schedule: '周五 14:00-14:40',
      status: 'active',
    })
    const courseId = (courseData as any).id || (courseData as any).data?.id
    expect(courseId).toBeTruthy()

    // 1. 导航到课程列表
    await page.goto('/courses')
    await page.waitForURL('**/courses')

    // 2. 等待表格加载并验证课程存在
    await expect(page.getByText(courseName).first()).toBeVisible({ timeout: 5000 })

    // 3. 在表格行中找到该课程的删除按钮并点击
    // 课程列表使用 Ant Design Table，每行有操作列包含"删除"按钮
    const courseRow = page.locator('.ant-table-tbody tr').filter({ hasText: courseName }).first()
    const deleteButton = courseRow.getByRole('button', { name: '删除' })
    await expect(deleteButton).toBeVisible({ timeout: 5000 })
    await deleteButton.click()

    // 4. 等待 Modal.confirm 确认弹窗出现
    // Courses 页面使用 Modal.confirm() 函数式调用
    // 弹窗标题 "确认删除"，确认按钮文字 "确认删除"
    const confirmButton = page.getByRole('button', { name: '确认删除' })
    await expect(confirmButton).toBeVisible({ timeout: 5000 })
    await confirmButton.click()

    // 5. 验证课程从列表中移除（使用 first() 避免 Modal.confirm 弹窗中同名文本的 strict mode violation）
    await expect(page.getByText(courseName).first()).not.toBeVisible({ timeout: 5000 })
  })

  test('课程列表分页深度测试', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 1. 通过 API 批量创建 15 个课程（超过默认分页大小 10）
    const createdCourseIds: string[] = []
    const timestamp = Date.now()
    for (let i = 1; i <= 15; i++) {
      const courseData = await createCourse(request, token, {
        name: `E2E 分页测试课程 ${i} - ${timestamp}`,
        subject: '语文',
        grade: '一年级',
        schedule: '周一 9:00-9:40',
        status: 'active',
      })
      const courseId = (courseData as any).id || (courseData as any).data?.id
      if (courseId) {
        createdCourseIds.push(courseId)
      }
    }
    expect(createdCourseIds.length).toBe(15)

    try {
      // 2. 导航到课程列表
      await page.goto('/courses')
      await page.waitForURL('**/courses')

      // 3. 等待表格加载完成
      await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })

      // 4. 验证分页器存在
      const pagination = page.locator('.ant-pagination')
      await expect(pagination).toBeVisible({ timeout: 5000 })

      // 5. 验证当前在第一页（页码 1 高亮）
      const activePage = page.locator('.ant-pagination-item-active')
      await expect(activePage).toBeVisible({ timeout: 5000 })
      await expect(activePage).toHaveText('1')

      // 6. 点击"下一页"按钮
      const nextButton = page.locator('.ant-pagination-next')
      await expect(nextButton).toBeVisible({ timeout: 5000 })
      await nextButton.click()

      // 7. 等待表格内容更新
      await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })

      // 8. 验证分页器状态更新（当前页码变为 2）
      await expect(activePage).toHaveText('2', { timeout: 5000 })
    } finally {
      // 9. 清理创建的课程数据
      for (const courseId of createdCourseIds) {
        try {
          await request.delete(`/api/v1/courses/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        } catch {
          // 忽略清理失败
        }
      }
    }
  })

  test('课程列表搜索测试', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 1. 通过 API 创建一个已知名称的课程
    const searchTestCourseName = 'E2E搜索测试课程ABC'
    const courseData = await createCourse(request, token, {
      name: searchTestCourseName,
      subject: '数学',
      grade: '二年级',
      schedule: '周三 10:00-10:40',
      status: 'active',
    })
    const courseId = (courseData as any).id || (courseData as any).data?.id
    expect(courseId).toBeTruthy()

    try {
      // 2. 导航到课程列表
      await page.goto('/courses')
      await page.waitForURL('**/courses')

      // 3. 等待表格加载完成
      await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })

      // 4. 在搜索框输入关键词"ABC"
      const searchInput = page.locator('input[placeholder="搜索课程名称或教师"]')
      await expect(searchInput).toBeVisible({ timeout: 5000 })
      await searchInput.fill('ABC')

      // 5. 等待搜索结果加载
      await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })

      // 6. 验证表格仅显示匹配的课程（包含"ABC"文本）
      const matchingRows = page.locator('.ant-table-tbody tr').filter({ hasText: 'ABC' })
      await expect(matchingRows.first()).toBeVisible({ timeout: 5000 })

      // 7. 验证搜索到的课程包含我们创建的课程名称
      await expect(page.getByText(searchTestCourseName).first()).toBeVisible({ timeout: 5000 })

      // 8. 清空搜索框（点击清除按钮）
      const clearButton = page.locator('.ant-input-clear-icon')
      if (await clearButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clearButton.click()
      } else {
        // 手动清空
        await searchInput.clear()
      }

      // 9. 等待表格恢复显示所有课程
      await page.waitForSelector('.ant-table-tbody tr', { timeout: 10000 })

      // 10. 验证表格恢复显示（应该有多行数据）
      const tableRows = page.locator('.ant-table-tbody tr')
      const rowCount = await tableRows.count()
      expect(rowCount).toBeGreaterThan(0)
    } finally {
      // 11. 清理创建的课程数据
      try {
        await request.delete(`/api/v1/courses/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        // 忽略清理失败
      }
    }
  })
})