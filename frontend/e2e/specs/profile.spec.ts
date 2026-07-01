import { test, expect } from '../fixtures/auth.fixture'

test.describe('个人资料', () => {
  test('查看个人资料', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // 1. 导航到个人资料页面
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // 2. 验证页面显示"个人资料"标题
    await expect(
      page.locator('h1.profile-title').getByText('个人资料')
    ).toBeVisible({ timeout: 10000 })

    // 3. 验证用户头像区域存在
    await expect(page.locator('.profile-avatar')).toBeVisible({ timeout: 5000 })

    // 4. 验证用户名显示（.profile-name 区域包含用户名或真实姓名）
    await expect(page.locator('.profile-name')).toBeVisible({ timeout: 5000 })

    // 5. 验证登录次数统计存在
    await expect(
      page.getByText('登录次数').first()
    ).toBeVisible({ timeout: 5000 })

    // 6. 验证安全设置区域存在
    await expect(
      page.getByText('安全设置').first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('编辑并保存个人资料', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // 1. 导航到个人资料页面
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    // 等待页面加载完成（标题可见）
    await expect(
      page.locator('h1.profile-title').getByText('个人资料')
    ).toBeVisible({ timeout: 10000 })

    // 2. 点击"编辑资料"按钮
    const editButton = page.getByRole('button', { name: '编辑资料' })
    await expect(editButton).toBeVisible({ timeout: 5000 })
    await editButton.click()

    // 3. 验证表单进入可编辑状态 — 真实姓名输入框变为可编辑
    const fullNameInput = page.locator('input#full_name')
    await expect(fullNameInput).toBeVisible({ timeout: 5000 })
    await expect(fullNameInput).toBeEditable({ timeout: 5000 })

    // 4. 修改真实姓名字段
    await fullNameInput.clear()
    await fullNameInput.fill('E2E测试教师')

    // 5. 点击"保存"按钮，监听 API 响应
    const saveResponse = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/user/profile') && resp.status() === 200
    )
    const saveButton = page.getByRole('button', { name: '保存' })
    await expect(saveButton).toBeVisible({ timeout: 5000 })
    await saveButton.click()

    // 6. 等待 API 响应
    await saveResponse

    // 7. 验证保存成功消息出现
    await expect(
      page.locator('.ant-message-success').first()
    ).toBeVisible({ timeout: 10000 })

    // 8. 验证页面回到只读模式 — "编辑资料"按钮重新出现
    await expect(
      page.getByRole('button', { name: '编辑资料' })
    ).toBeVisible({ timeout: 10000 })

    // 9. 验证显示更新后的真实姓名
    await expect(
      page.getByText('E2E测试教师').first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('修改密码表单校验', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // 1. 导航到个人资料页面
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    await expect(
      page.locator('h1.profile-title').getByText('个人资料')
    ).toBeVisible({ timeout: 10000 })

    // 2. 点击"修改密码"按钮
    const changePasswordButton = page.getByRole('button', { name: '修改密码' })
    await expect(changePasswordButton).toBeVisible({ timeout: 5000 })
    await changePasswordButton.click()

    // 3. 验证弹窗出现
    const modal = page.locator('.ant-modal')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // 4. 验证弹窗包含当前密码、新密码、确认新密码三个字段
    await expect(
      modal.getByText('当前密码').first()
    ).toBeVisible({ timeout: 5000 })
    await expect(
      modal.getByText('新密码').first()
    ).toBeVisible({ timeout: 5000 })
    await expect(
      modal.getByText('确认新密码').first()
    ).toBeVisible({ timeout: 5000 })

    // 5. 尝试提交空表单（点击确认按钮）
    const confirmButton = modal.getByRole('button', { name: '确认修改' })
    await expect(confirmButton).toBeVisible({ timeout: 5000 })
    await confirmButton.click()

    // 6. 验证显示校验错误提示
    await expect(
      page.locator('.ant-form-item-explain-error').first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('修改密码成功', async ({ authenticatedPage }) => {
    const page = authenticatedPage

    // 1. 导航到个人资料页面
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    await expect(
      page.locator('h1.profile-title').getByText('个人资料')
    ).toBeVisible({ timeout: 10000 })

    // 2. 点击"修改密码"按钮
    const changePasswordButton = page.getByRole('button', { name: '修改密码' })
    await expect(changePasswordButton).toBeVisible({ timeout: 5000 })
    await changePasswordButton.click()

    // 3. 验证弹窗出现
    const modal = page.locator('.ant-modal')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // 4. 填写正确的当前密码
    const currentPasswordInput = modal.locator('input#currentPassword')
    await expect(currentPasswordInput).toBeVisible({ timeout: 5000 })
    await currentPasswordInput.fill('Teacher@Local2026!')

    // 5. 填写符合规则的新密码
    const newPasswordInput = modal.locator('input#newPassword')
    await expect(newPasswordInput).toBeVisible({ timeout: 5000 })
    await newPasswordInput.fill('NewTeacher@2026')

    // 6. 填写确认密码（与新密码一致）
    const confirmPasswordInput = modal.locator('input#confirmPassword')
    await expect(confirmPasswordInput).toBeVisible({ timeout: 5000 })
    await confirmPasswordInput.fill('NewTeacher@2026')

    // 7. 监听修改密码 API 响应，然后点击"确认修改"按钮
    const passwordResponse = page.waitForResponse(
      (resp) => resp.url().includes('/api/v1/user/password') && resp.status() === 200
    )
    const confirmButton = modal.getByRole('button', { name: '确认修改' })
    await confirmButton.click()

    // 8. 等待 API 响应
    await passwordResponse

    // 9. 验证密码修改成功消息出现
    await expect(
      page.locator('.ant-message-success').first()
    ).toBeVisible({ timeout: 10000 })

    // 10. 验证弹窗关闭
    await expect(modal).not.toBeVisible({ timeout: 10000 })
  })
})
