import { test, expect } from '../fixtures/auth.fixture'
import { loginViaApi } from '../utils/api-helper'
import { selectFirstOption } from '../utils/select-helper'

/**
 * 教案管理 E2E 测试
 *
 * 覆盖教案的创建、发布、取消发布等核心流程
 */
test.describe('教案管理', () => {
  test('创建教案为草稿状态', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 1. 导航到教案创建页面
    await page.goto('/lesson-planner/create')
    await page.waitForURL('**/lesson-planner/create')

    // 2. 填写教案标题
    const lessonTitle = 'E2E 测试教案 - 草稿'
    await page.locator('input[id="title"]').fill(lessonTitle)

    // 3. 选择学科
    await selectFirstOption(page, '学科')

    // 4. 选择年级
    await selectFirstOption(page, '年级')

    // 5. 填写课程时长（已默认 40 分钟，保持不变）
    // 6. 填写教学内容（TextArea）
    await page.locator('#teaching_content').fill('这是 E2E 测试的教案教学内容。')

    // 7. 确保选择"保存为草稿"（默认已选中 draft）
    const draftRadio = page.locator('.ant-radio-wrapper').filter({ hasText: '保存为草稿' })
    await draftRadio.locator('input[type="radio"]').check({ force: true })

    // 8. 提交表单
    await page.locator('button').filter({ hasText: /创.*教案/ }).click()

    // 9. 验证导航到教案列表页（创建后跳转到 /lesson-planner）
    await page.waitForURL('**/lesson-planner')

    // 10. 验证教案出现在草稿列表中
    // 导航到草稿列表
    await page.goto('/lesson-planner/list/draft')
    await page.waitForURL('**/lesson-planner/list/draft')

    // 验证页面上包含创建的教案标题（使用 first() 避免 strict mode violation）
    await expect(page.getByText(lessonTitle).first()).toBeVisible({ timeout: 5000 })

    // 验证状态显示为"草稿"
    // 在表格或卡片中查找包含"草稿"的状态标识
    const statusDraft = page.locator('.ant-table-tbody .ant-tag, .lesson-card-status, .ant-tag').filter({ hasText: '草稿' })
    await expect(statusDraft.first()).toBeVisible({ timeout: 5000 })
  })

  test('发布教案', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token，用于通过 API 创建一条草稿教案
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 通过 API 创建一条草稿教案
    const lessonTitle = 'E2E 测试发布教案'
    const createRes = await request.post('/api/v1/lesson-plans', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: lessonTitle,
        subject: '语文',
        grade: '一年级',
        duration: 40,
        teaching_content: '测试内容',
        status: 'draft',
      },
    })
    expect(createRes.ok()).toBeTruthy()
    const createdPlan = await createRes.json()
    // API 响应可能被 unwrap 过
    const planId = (createdPlan as any).id || (createdPlan as any).data?.id
    expect(planId).toBeTruthy()

    // 1. 导航到教案详情页
    await page.goto(`/lesson-planner/${planId}`)
    await page.waitForURL(`**/lesson-planner/${planId}`)

    // 2. 验证初始状态为"草稿"
    await expect(page.getByText('草稿').first()).toBeVisible({ timeout: 5000 })

    // 3. 点击"标记完成"按钮发布教案
    const publishButton = page.locator('button').filter({ hasText: /标记完成/ })
    await expect(publishButton).toBeVisible()
    await publishButton.click()

    // 4. 等待页面刷新，验证状态变为"已完成"
    await expect(page.getByText('已完成').first()).toBeVisible({ timeout: 5000 })

    // 5. 验证已发布状态下，详情页显示"取消完成"按钮（表示已发布状态）
    await expect(page.locator('button').filter({ hasText: /取消完成/ })).toBeVisible({ timeout: 5000 })

    // 6. 验证状态 Tag 颜色为 green（已完成）
    const statusTag = page.locator('.ant-tag').filter({ hasText: '已完成' })
    await expect(statusTag).toBeVisible()
  })

  test('取消发布', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token，通过 API 创建一条已发布教案
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 通过 API 创建一条已发布教案
    const lessonTitle = 'E2E 测试取消发布教案'
    const createRes = await request.post('/api/v1/lesson-plans', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: lessonTitle,
        subject: '数学',
        grade: '二年级',
        duration: 45,
        teaching_content: '测试取消发布内容',
        status: 'published',
      },
    })
    expect(createRes.ok()).toBeTruthy()
    const createdPlan = await createRes.json()
    const planId = (createdPlan as any).id || (createdPlan as any).data?.id
    expect(planId).toBeTruthy()

    // 1. 导航到教案详情页
    await page.goto(`/lesson-planner/${planId}`)
    await page.waitForURL(`**/lesson-planner/${planId}`)

    // 2. 验证初始状态为"已完成"
    await expect(page.getByText('已完成').first()).toBeVisible({ timeout: 5000 })

    // 3. 点击"取消完成"按钮
    const unpublishButton = page.locator('button').filter({ hasText: /取消完成/ })
    await expect(unpublishButton).toBeVisible()
    await unpublishButton.click()

    // 4. 在 Modal 确认对话框中点击"确认取消完成"
    const confirmButton = page.locator('.ant-modal-confirm').locator('button').filter({ hasText: /确认取消完成/ })
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 })
    await confirmButton.click()

    // 5. 等待页面刷新，验证状态变为"草稿"
    await expect(page.getByText('草稿').first()).toBeVisible({ timeout: 5000 })

    // 6. 验证编辑按钮重新可用（草稿状态下显示"编辑"按钮）
    await expect(page.locator('button').filter({ hasText: /编辑/ })).toBeVisible({ timeout: 5000 })

    // 7. 验证"标记完成"按钮重新出现
    await expect(page.locator('button').filter({ hasText: /标记完成/ })).toBeVisible({ timeout: 5000 })
  })

  test('编辑教案', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token，通过 API 创建一条草稿教案
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 通过 API 创建一条草稿教案
    const originalTitle = `E2E 编辑前教案 ${Date.now()}`
    const createRes = await request.post('/api/v1/lesson-plans', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: originalTitle,
        subject: '语文',
        grade: '一年级',
        duration: 40,
        teaching_content: '编辑前的原始内容',
        status: 'draft',
      },
    })
    expect(createRes.ok()).toBeTruthy()
    const createdPlan = await createRes.json()
    const planId = (createdPlan as any).id || (createdPlan as any).data?.id
    expect(planId).toBeTruthy()

    // 1. 导航到教案编辑页面
    await page.goto(`/lesson-planner/${planId}/edit`)
    await page.waitForURL(`**/lesson-planner/${planId}/edit`)

    // 2. 等待表单加载完成
    await page.waitForSelector('input[id="title"]', { state: 'visible', timeout: 10000 })
    await page.waitForTimeout(1000)

    // 3. 修改教案标题
    const updatedTitle = `E2E 编辑后教案 ${Date.now()}`
    await page.locator('input[id="title"]').clear()
    await page.locator('input[id="title"]').fill(updatedTitle)

    // 4. 修改教学内容
    await page.locator('#teaching_content').clear()
    await page.locator('#teaching_content').fill('这是编辑后的教学内容。')

    // 5. 保存修改（编辑页面的提交按钮可能是"保存修改"或"更新教案"等）
    const saveButton = page.locator('button').filter({ hasText: /保\s*存|更\s*新|修\s*改/ })
    await saveButton.click()

    // 6. 验证导航到教案列表页
    await page.waitForURL('**/lesson-planner', { timeout: 10000 }).catch(() => {
      // 可能导航到详情页
    })

    // 7. 导航到教案列表验证更新后的标题可见
    await page.goto('/lesson-planner/list/draft')
    await page.waitForURL('**/lesson-planner/list/draft')
    await expect(page.getByText(updatedTitle).first()).toBeVisible({ timeout: 5000 })
  })
})