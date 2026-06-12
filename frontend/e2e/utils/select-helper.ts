import { Page } from '@playwright/test'

/**
 * 等待所有下拉菜单关闭
 */
async function waitForAllDropdownsHidden(page: Page, timeout = 3000): Promise<void> {
  const dropdowns = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')
  const count = await dropdowns.count().catch(() => 0)
  if (count === 0) return
  
  // 等待所有可见下拉关闭
  await page.locator('.ant-select-dropdown').waitFor({ state: 'hidden', timeout }).catch(() => {})
}

/**
 * 获取当前可见的下拉菜单(应该只有一个)
 */
function getVisibleDropdown(page: Page) {
  // 使用 .first() 避免 strict mode violation
  return page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').first()
}

/**
 * 通过 UI 交互方式选择 ConfigurableSelect 的第一个选项
 *
 * 该函数通过点击方式操作 Ant Design Select，适用于 ConfigurableSelect 组件。
 * 包含重试机制以处理异步加载选项的场景。
 *
 * @param page Playwright Page 实例
 * @param label Form.Item 的 label 文本(如 "学科"、"年级")
 * @param timeout 每次尝试等待选项的超时时间(ms)，默认 8000
 */
export async function selectFirstOption(page: Page, label: string, timeout = 8000): Promise<void> {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // 确保所有之前的下拉已关闭
    await waitForAllDropdownsHidden(page, 3000)
    // 等待 React 状态稳定(前一个 Select 选择后可能触发 re-render)
    await page.waitForTimeout(1000)

    // 找到包含指定 label 的 Form.Item 中的 Select
    const formItem = page.locator('.ant-form-item').filter({
      has: page.locator(`.ant-form-item-label:has-text("${label}")`)
    }).first()
    const selectSelector = formItem.locator('.ant-select-selector').first()

    // 点击 Select 打开下拉
    try {
      await selectSelector.click({ timeout: 5000 })
    } catch {
      await page.waitForTimeout(500)
      continue
    }

    // 等待下拉菜单出现(使用 first() 避免 strict mode violation)
    const dropdown = getVisibleDropdown(page)
    try {
      await dropdown.waitFor({ state: 'visible', timeout: 5000 })
    } catch {
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(500)
      continue
    }

    // 检查是否显示"加载中..."
    const loadingText = dropdown.getByText('加载中...')
    const isLoading = await loadingText.isVisible({ timeout: 1000 }).catch(() => false)
    
    if (isLoading) {
      // 等待加载完成
      await loadingText.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(500)
    }

    // 等待选项出现
    const option = dropdown.locator('.ant-select-item-option').first()
    try {
      await option.waitFor({ state: 'visible', timeout })
      
      // 确保选项可见且可点击
      await option.scrollIntoViewIfNeeded()
      await option.click()
      
      // 等待下拉关闭以确认选中
      await waitForAllDropdownsHidden(page, 2000)
      return
    } catch {
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(500)
    }
  }

  throw new Error(`selectFirstOption failed for "${label}" after ${maxRetries} retries - dropdown options may not have loaded`)
}

/**
 * 通过 UI 交互方式选择指定文本的 ConfigurableSelect 选项
 *
 * @param page Playwright Page 实例
 * @param label Form.Item 的 label 文本(如 "学科"、"年级")
 * @param optionText 要选择的选项文本
 * @param timeout 每次尝试等待选项的超时时间(ms)，默认 8000
 */
export async function selectOption(page: Page, label: string, optionText: string, timeout = 8000): Promise<void> {
  const maxRetries = 3

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // 确保所有之前的下拉已关闭
    await waitForAllDropdownsHidden(page, 3000)
    // 等待 React 状态稳定
    await page.waitForTimeout(1000)

    // 找到包含指定 label 的 Form.Item 中的 Select
    const formItem = page.locator('.ant-form-item').filter({
      has: page.locator(`.ant-form-item-label:has-text("${label}")`)
    }).first()
    const selectSelector = formItem.locator('.ant-select-selector').first()

    // 点击 Select 打开下拉
    try {
      await selectSelector.click({ timeout: 5000 })
    } catch {
      await page.waitForTimeout(500)
      continue
    }

    // 等待下拉菜单出现
    const dropdown = getVisibleDropdown(page)
    try {
      await dropdown.waitFor({ state: 'visible', timeout: 5000 })
    } catch {
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(500)
      continue
    }

    // 检查是否显示"加载中..."
    const loadingText = dropdown.getByText('加载中...')
    const isLoading = await loadingText.isVisible({ timeout: 1000 }).catch(() => false)
    
    if (isLoading) {
      await loadingText.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(500)
    }

    // 查找指定文本的选项
    const option = dropdown.locator('.ant-select-item-option', { hasText: optionText }).first()
    try {
      await option.waitFor({ state: 'visible', timeout })
      await option.scrollIntoViewIfNeeded()
      await option.click()
      await waitForAllDropdownsHidden(page, 2000)
      return
    } catch {
      await page.keyboard.press('Escape').catch(() => {})
      await page.waitForTimeout(500)
    }
  }

  throw new Error(`selectOption failed for "${label}" with option "${optionText}" after ${maxRetries} retries`)
}

/**
 * @deprecated Use selectFirstOption instead
 */
export async function openSelectByLabel(page: Page, label: string): Promise<void> {
  const formItem = page.locator('.ant-form-item').filter({ has: page.locator(`.ant-form-item-label:has-text("${label}")`) }).first()
  const selector = formItem.locator('.ant-select-selector').first()
  await selector.click({ timeout: 8000 })
}

/**
 * @deprecated Use selectFirstOption instead
 */
export async function openSelect(page: Page, placeholder: string): Promise<void> {
  const placeholderEl = page.locator(`.ant-select-selection-placeholder:has-text("${placeholder}")`).first()
  const selector = placeholderEl.locator('xpath=ancestor::div[contains(@class, "ant-select-selector")][1]')
  await selector.click({ timeout: 8000 })
}
