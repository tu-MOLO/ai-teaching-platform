import { test, expect } from '../fixtures/auth.fixture'
import { loginViaApi } from '../utils/api-helper'
import { selectFirstOption } from '../utils/select-helper'

/**
 * 学生管理 E2E 测试
 *
 * 覆盖学生的创建、编辑、状态更新等核心流程
 */
test.describe('学生管理', () => {
  test('创建学生', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // 1. 导航到添加学生页面
    await page.goto('/students/create')
    await page.waitForURL('**/students/create')

    // 2. 填写学生姓名（限制20个字符以内）
    const studentName = `E2E学生${Date.now().toString().slice(-6)}`
    await page.fill('input[id="name"]', studentName)

    // 3. 选择性别
    await selectFirstOption(page, '性别')

    // 4. 选择年级
    await selectFirstOption(page, '年级')

    // 5. 选择班级
    await selectFirstOption(page, '班级')

    // 6. 选择出生日期（DatePicker）
    await page.locator('#birth_date').click()
    const dateCell = page
      .locator('.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) .ant-picker-cell-inner')
      .first()
    await dateCell.waitFor({ state: 'visible', timeout: 5000 })
    await dateCell.click()
    
    // 额外等待确保日期选择器关闭
    await page.waitForTimeout(500)

    // 7. 提交表单
    // 等待 API 响应
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/v1/students') && response.request().method() === 'POST',
      { timeout: 15000 }
    ).catch(() => null)
    
    await page.locator('button').filter({ hasText: /保\s*存/ }).click()
    
    // 等待 API 响应或超时
    const apiResponse = await responsePromise
    
    if (apiResponse) {
      if (apiResponse.status() >= 400) {
        const body = await apiResponse.text()
        throw new Error(`Create student API failed: ${apiResponse.status()} - ${body}`)
      }
    } else {
      // API 没有被调用，可能是表单验证失败
      // 检查是否有验证错误
      const validationErrors = page.locator('.ant-form-item-explain-error')
      const errorCount = await validationErrors.count()
      if (errorCount > 0) {
        const errors = []
        for (let i = 0; i < errorCount; i++) {
          errors.push(await validationErrors.nth(i).textContent())
        }
        throw new Error(`Form validation failed with ${errorCount} errors: ${errors.join(', ')}`)
      }
    }
    
    // 等待页面导航到学生列表
    await page.waitForURL('**/students', { timeout: 15000 })

    // 9. 验证新学生在列表中可见
    await expect(page.getByText(studentName)).toBeVisible({ timeout: 5000 })
  })

  test('编辑学生信息', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 通过 API 创建学生
    const createRes = await request.post('/api/v1/students', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'E2E 编辑前学生名',
        gender: 'male',
        grade: '一年级',
        class_name: '一班',
        birth_date: '2018-01-01',
        is_active: true,
      },
    })
    const createdStudent = await createRes.json()
    // Backend wraps response in DataResponse: { code: 'OK', data: { id: '...', ... } }
    const data = (createdStudent as any).data || (createdStudent as any)
    const studentId = data?.id
    expect(studentId).toBeTruthy()

    // 1. 导航到编辑学生页面
    await page.goto(`/students/${studentId}/edit`)
    await page.waitForURL(`**/students/${studentId}/edit`)

    // 等待表单加载完成(编辑页面需要异步获取学生数据)
    // 等待 Spin 消失，确保数据已加载
    await page.waitForSelector('.ant-spin-spinning', { state: 'hidden', timeout: 5000 }).catch(() => {})
    // 等待输入框可交互
    await page.waitForSelector('input[id="name"]', { state: 'visible', timeout: 5000 })
    // 额外等待确保表单状态稳定
    await page.waitForTimeout(1000)

    // 2. 修改学生姓名（限制20个字符以内）
    const updatedName = `编辑后${Date.now().toString().slice(-6)}`
    await page.fill('input[id="name"]', updatedName)

    // 3. 保存修改
    const editResponsePromise = page.waitForResponse(
      (response) => response.url().match(/\/api\/v1\/students\/[^/]+$/) && response.request().method() === 'PUT',
      { timeout: 15000 }
    ).catch(() => null)
    
    await page.locator('button').filter({ hasText: /保\s*存/ }).click()
    
    const editApiResponse = await editResponsePromise
    
    if (editApiResponse) {
      if (editApiResponse.status() >= 400) {
        const body = await editApiResponse.text()
        throw new Error(`Update student API failed: ${editApiResponse.status()} - ${body}`)
      }
    } else {
      const validationErrors = page.locator('.ant-form-item-explain-error')
      const errorCount = await validationErrors.count()
      if (errorCount > 0) {
        const errors = []
        for (let i = 0; i < errorCount; i++) {
          errors.push(await validationErrors.nth(i).textContent())
        }
        throw new Error(`Form validation failed with ${errorCount} errors: ${errors.join(', ')}`)
      }
    }

    // 4. 验证重定向到学生列表
    await page.waitForURL('**/students', { timeout: 15000 })

    // 5. 验证更新后的学生名在列表中可见
    // 刷新页面以确保列表数据已重新加载（编辑后跳转不触发列表重新获取）
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 5000 })
  })

  test('学生状态更新', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 通过 API 创建一个在读状态的学生
    const createRes = await request.post('/api/v1/students', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'E2E 状态测试学生',
        gender: 'female',
        grade: '二年级',
        class_name: '二班',
        birth_date: '2017-06-15',
        is_active: true,
      },
    })
    const createdStudent = await createRes.json()
    // Backend wraps response in DataResponse: { code: 'OK', data: { id: '...', ... } }
    const data = (createdStudent as any).data || (createdStudent as any)
    const studentId = data?.id
    expect(studentId).toBeTruthy()

    // 1. 导航到编辑学生页面
    await page.goto(`/students/${studentId}/edit`)
    await page.waitForURL(`**/students/${studentId}/edit`)

    // 等待表单加载完成
    await page.waitForSelector('input[id="name"]', { state: 'visible', timeout: 5000 })
    await page.waitForTimeout(500)

    // 2. 切换"在读"状态开关
    // Switch 的 id 在 Form.Item 内部的隐藏 input 上，Switch 按钮是同级元素
    const isActiveSwitch = page.locator('.ant-form-item').filter({ has: page.locator('#is_active') }).locator('.ant-switch')
    await isActiveSwitch.click()

    // 3. 保存修改
    // 先设置 API 响应监听，再点击
    const statusResponsePromise = page.waitForResponse(
      (response) => response.url().match(/\/api\/v1\/students\/[^/]+$/) && response.request().method() === 'PUT',
      { timeout: 15000 }
    )
    await page.locator('button').filter({ hasText: /保\s*存/ }).click()
    
    // 等待 API 响应
    const statusApiResponse = await statusResponsePromise
    
    if (statusApiResponse.status() >= 400) {
      const body = await statusApiResponse.text()
      throw new Error(`Update student status API failed: ${statusApiResponse.status()} - ${body}`)
    }

    // 4. 验证重定向到学生列表
    await page.waitForURL('**/students', { timeout: 15000 })

    // 5. 验证状态已更新为"已停用"
    // Use first() to handle duplicate rows from previous test runs
    const studentRow = page.locator('.ant-table-tbody tr').filter({ hasText: 'E2E 状态测试学生' }).first()
    await expect(studentRow).toBeVisible({ timeout: 5000 })
    const statusTag = studentRow.locator('.ant-tag')
    await expect(statusTag).toContainText('已停用')
  })
})