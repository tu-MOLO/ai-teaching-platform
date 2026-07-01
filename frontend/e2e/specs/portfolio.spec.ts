import { test, expect } from '../fixtures/auth.fixture'
import { loginViaApi, createCourse } from '../utils/api-helper'

/**
 * 成长档案 E2E 测试
 *
 * 覆盖档案记录的添加、查看以及类型筛选等功能
 */
test.describe('成长档案', () => {
  test('添加成长档案记录', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 通过 API 创建课程
    const courseData = await createCourse(request, token, {
      name: 'E2E 测试课程',
      subject: '语文',
      grade: '一年级',
      status: 'active',
    })
    const courseId = (courseData as any).id || (courseData as any).data?.id
    expect(courseId).toBeTruthy()

    // 通过 API 创建学生（注意：创建学生使用 /api/v1/students，不是 /courses/{id}/students）
    const studentRes = await request.post('/api/v1/students', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'E2E 测试学生',
        gender: 'male',
        birth_date: '2018-01-01',
        grade: '一年级',
        class_name: '一班',
        is_active: true,
      },
    })
    const studentData = await studentRes.json()
    const studentId = (studentData as any).id || (studentData as any).data?.id
    expect(studentId).toBeTruthy()

    // 1. 导航到学生档案详情页
    await page.goto(`/portfolio/${studentId}`)
    await page.waitForURL(`**/portfolio/${studentId}`)

    // 2. 点击"添加记录"按钮
    await page.getByRole('button', { name: /添加记录/ }).click()
    await page.waitForURL(`**/portfolio/${studentId}/add-record`)

    // 3. 填写记录类型（PortfolioTypeSelect - Ant Design Select）
    await page.locator('#type').click()
    const typeOption = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first()
    await typeOption.waitFor({ state: 'visible', timeout: 5000 })
    await typeOption.click()

    // 4. 填写标题
    const recordTitle = 'E2E 测试档案记录'
    await page.locator('input[id="title"]').fill(recordTitle)

    // 5. 填写内容描述
    await page.locator('#content').fill('这是通过 E2E 测试添加的成长档案记录内容。')

    // 6. 填写能力评估维度（EvaluationForm 中的 Rate 组件）
    // 评价维度：认知理解、操作技能、创意表达、合作参与、注意力维持
    // EvaluationForm 使用 Form.Item name={[formNamePrefix, dimension.name]}，formNamePrefix = 'evaluation'
    // 每个维度都是 Ant Design Rate 组件
    // 定位到评价卡片中的 Rate 组件并点击第三颗星（评分 3）
    const evaluationCard = page.locator('.evaluation-form .ant-card').first()

    // 认知理解 - 第 3 颗星
    const rateItems = evaluationCard.locator('.ant-rate .ant-rate-star')
    // 每个维度各占 5 颗星，共 25 颗星，按顺序对应 5 个维度
    const allStars = await rateItems.all()
    if (allStars.length >= 15) {
      // 认知理解 (0-4): 点第 3 颗星 (index 2)
      await allStars[2].click()
      // 操作技能 (5-9): 点第 3 颗星 (index 7)
      await allStars[7].click()
      // 创意表达 (10-14): 点第 3 颗星 (index 12)
      await allStars[12].click()
      // 合作参与 (15-19): 点第 3 颗星 (index 17)
      if (allStars.length >= 20) {
        await allStars[17].click()
      }
      // 注意力维持 (20-24): 点第 3 颗星 (index 22)
      if (allStars.length >= 25) {
        await allStars[22].click()
      }
    }

    // 7. 提交表单
    await page.locator('button').filter({ hasText: /保\s*存记录/ }).click()

    // 8. 验证跳转回学生详情页
    await page.waitForURL(`**/portfolio/${studentId}`)

    // 9. 验证新记录在时间轴中可见
    await expect(page.getByText(recordTitle)).toBeVisible({ timeout: 5000 })

    // 10. 验证能力雷达图已渲染（ECharts 图表容器可见）
    // AbilityRadar 组件使用 ReactECharts，渲染后会有一个包含 canvas 的容器
    // 如果评价记录被成功添加，雷达图不应显示空状态
    const radarSection = page.locator('.ability-radar')
    await expect(radarSection).toBeVisible({ timeout: 5000 })
  })

  test('按类型筛选档案', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 通过 API 创建课程和学生
    const courseData = await createCourse(request, token, {
      name: 'E2E 筛选测试课程',
      subject: '数学',
      grade: '二年级',
      status: 'active',
    })
    const courseId = (courseData as any).id || (courseData as any).data?.id
    expect(courseId).toBeTruthy()

    const studentRes2 = await request.post('/api/v1/students', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'E2E 筛选测试学生',
        gender: 'female',
        birth_date: '2017-06-15',
        grade: '二年级',
        class_name: '二班',
        is_active: true,
      },
    })
    const studentData2 = await studentRes2.json()
    const studentId = (studentData2 as any).id || (studentData2 as any).data?.id
    expect(studentId).toBeTruthy()

    // 通过 API 创建多条不同类型的档案记录
    const workRes = await request.post('/api/v1/portfolios', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        student_id: studentId,
        type: 'work',
        title: 'E2E 作品记录',
        content: '这是一条作品类型的记录',
        cognitive_score: 80,
        skill_score: 75,
      },
    })
    expect(workRes.ok() || (await workRes.status()) === 201).toBeTruthy()

    const evalRes = await request.post('/api/v1/portfolios', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        student_id: studentId,
        type: 'evaluation',
        title: 'E2E 评价记录',
        content: '这是一条评价类型的记录',
        cognitive_score: 90,
        skill_score: 85,
        creativity_score: 70,
        cooperation_score: 80,
        attention_score: 75,
      },
    })
    expect(evalRes.ok() || (await evalRes.status()) === 201).toBeTruthy()

    // 1. 导航到学生档案详情页
    await page.goto(`/portfolio/${studentId}`)
    await page.waitForURL(`**/portfolio/${studentId}`)

    // 2. 等待记录加载完成
    await expect(page.getByText('E2E 作品记录')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('E2E 评价记录')).toBeVisible({ timeout: 5000 })

    // 3. 使用类型筛选下拉框筛选"评价"类型
    // StudentDetail 页面中的筛选 Select，placeholder 为"筛选类型"
    // 或者直接定位 placeholder 为"筛选类型"的 Select
    const filterByPlaceholder = page.locator('.ant-select-selector').filter({ hasText: /筛选类型/ })
    const filterExists1 = await filterByPlaceholder.count()
    if (filterExists1 > 0) {
      await filterByPlaceholder.click()
    } else {
      // 备用：点开 StudentDetail 表格内的筛选
      await page.locator('.timeline-filter-bar .ant-select').first().click()
    }

    // 等待下拉菜单出现并选择"评价"选项
    const evalOption = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: '评价' })
    await evalOption.waitFor({ state: 'visible', timeout: 5000 })
    await evalOption.click()

    // 4. 验证只显示评价类型的记录
    await expect(page.getByText('E2E 评价记录')).toBeVisible({ timeout: 5000 })

    // 5. 验证作品类型的记录被过滤掉
    await expect(page.getByText('E2E 作品记录')).not.toBeVisible({ timeout: 3000 })
  })

  test('编辑成长档案记录', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 通过 API 创建课程
    const courseData = await createCourse(request, token, {
      name: 'E2E 编辑档案测试课程',
      subject: '语文',
      grade: '一年级',
      status: 'active',
    })
    const courseId = (courseData as any).id || (courseData as any).data?.id
    expect(courseId).toBeTruthy()

    // 通过 API 创建学生
    const studentRes = await request.post('/api/v1/students', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'E2E 编辑档案测试学生',
        gender: 'male',
        birth_date: '2018-01-01',
        grade: '一年级',
        class_name: '一班',
        is_active: true,
      },
    })
    const studentData = await studentRes.json()
    const studentId = (studentData as any).id || (studentData as any).data?.id
    expect(studentId).toBeTruthy()

    // 通过 API 创建一条档案记录
    const originalTitle = `E2E 编辑前档案记录 ${Date.now()}`
    const createRes = await request.post('/api/v1/portfolios', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        student_id: studentId,
        type: 'work',
        title: originalTitle,
        content: '编辑前的原始档案内容',
        cognitive_score: 80,
        skill_score: 75,
      },
    })
    const createdRecord = await createRes.json()
    const recordData = (createdRecord as any).data || (createdRecord as any)
    const recordId = recordData?.id
    expect(recordId).toBeTruthy()

    // 1. 导航到编辑档案记录页面
    await page.goto(`/portfolio/${studentId}/edit-record/${recordId}`)
    await page.waitForURL(`**/portfolio/${studentId}/edit-record/${recordId}`)

    // 2. 等待表单加载完成
    await page.waitForSelector('input[id="title"]', { state: 'visible', timeout: 10000 })
    await page.waitForTimeout(1000)

    // 3. 修改标题
    const updatedTitle = `E2E 编辑后档案记录 ${Date.now()}`
    await page.locator('input[id="title"]').clear()
    await page.locator('input[id="title"]').fill(updatedTitle)

    // 4. 修改内容描述
    await page.locator('#content').clear()
    await page.locator('#content').fill('这是编辑后的档案内容。')

    // 5. 保存修改
    await page.locator('button').filter({ hasText: /保\s*存/ }).click()

    // 6. 验证跳转回学生详情页
    await page.waitForURL(`**/portfolio/${studentId}`, { timeout: 10000 })

    // 7. 验证更新后的记录标题在时间轴中可见
    await expect(page.getByText(updatedTitle).first()).toBeVisible({ timeout: 5000 })
  })

  test('删除档案记录', async ({ authenticatedPage, testUser, request }) => {
    const page = authenticatedPage

    // 获取 API token
    const token = await loginViaApi(request, testUser.username, testUser.password)
    expect(token).toBeTruthy()

    // 通过 API 创建学生
    const studentRes = await request.post('/api/v1/students', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: 'E2E档案删除测试学生',
        gender: 'male',
        grade: '一年级',
        class_name: '一班',
        birth_date: '2018-01-01',
        is_active: true,
      },
    })
    const studentData = await studentRes.json()
    const studentId = (studentData as any).id || (studentData as any).data?.id
    expect(studentId).toBeTruthy()

    // 通过 API 为该学生创建一条成长档案记录
    const recordTitle = 'E2E待删除档案记录'
    const portfolioRes = await request.post('/api/v1/portfolios', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        student_id: studentId,
        type: 'work',
        title: recordTitle,
        content: '这是待删除的测试记录',
      },
    })
    const portfolioData = await portfolioRes.json()
    const recordId = (portfolioData as any).id || (portfolioData as any).data?.id
    expect(recordId).toBeTruthy()

    // 1. 导航到该学生的档案详情页
    await page.goto(`/portfolio/${studentId}`)
    await page.waitForURL(`**/portfolio/${studentId}`)

    // 2. 验证记录在时间轴中存在（显示记录标题）
    await expect(page.getByText(recordTitle)).toBeVisible({ timeout: 5000 })

    // 3. 找到该记录并点击"删除"按钮
    // 定位包含该标题的记录卡片，然后找到其中的删除按钮
    const recordCard = page.locator('.timeline-item-card').filter({ hasText: recordTitle })
    const deleteButton = recordCard.locator('button').filter({ hasText: '删除' })
    await deleteButton.click()

    // 4. 验证确认弹窗出现（Popconfirm）
    const popconfirm = page.locator('.ant-popconfirm')
    await expect(popconfirm).toBeVisible({ timeout: 5000 })

    // 5. 点击"确定"按钮确认删除
    // Popconfirm 内的确认按钮文本为"删除"（okText="删除"）
    const confirmButton = popconfirm.locator('button').filter({ hasText: '删除' })
    await confirmButton.click()

    // 6. 验证记录从时间轴中移除（记录标题不再可见）
    await expect(page.getByText(recordTitle)).not.toBeVisible({ timeout: 5000 })

    // 7. 验证成功消息出现
    await expect(page.locator('.ant-message').getByText('记录删除成功')).toBeVisible({ timeout: 5000 })

    // 8. 清理创建的数据（学生和相关档案记录）
    // 删除学生时，相关档案记录应级联删除
    try {
      await request.delete(`/api/v1/students/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // 忽略清理失败
    }
  })
})