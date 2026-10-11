import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

// vi.hoisted 保证 mock 函数在被提升的 vi.mock 工厂执行前完成初始化
const {
  mockStaticSuccess,
  mockStaticConfirm,
  mockCtxSuccess,
  mockCtxConfirm,
  mockUseApp,
} = vi.hoisted(() => ({
  mockStaticSuccess: vi.fn(),
  mockStaticConfirm: vi.fn(),
  mockCtxSuccess: vi.fn(),
  mockCtxConfirm: vi.fn(),
  mockUseApp: vi.fn(),
}))

vi.mock('antd', () => ({
  message: { success: mockStaticSuccess, tag: 'static-msg' },
  Modal: { confirm: mockStaticConfirm },
  App: { useApp: (...args: unknown[]) => mockUseApp(...args) },
}))

import { message, modal, MessageBridge } from '../feedback'

describe('feedback 静态回退（注入前）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('message 方法调用落到 antd 静态实例', () => {
    message.success('保存成功')
    expect(mockStaticSuccess).toHaveBeenCalledWith('保存成功')
  })

  it('modal 方法调用落到 antd 静态实例', () => {
    modal.confirm({ title: '确认' })
    expect(mockStaticConfirm).toHaveBeenCalledWith({ title: '确认' })
  })

  it('访问不存在的方法得到 noop，调用不抛错', () => {
    const fn = (message as unknown as Record<string, unknown>).notExist
    expect(typeof fn).toBe('function')
    expect(() => (fn as () => void)()).not.toThrow()
  })

  it('非函数属性原样返回', () => {
    expect((message as unknown as Record<string, unknown>).tag).toBe('static-msg')
  })
})

describe('MessageBridge 注入上下文实例', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseApp.mockReturnValue({
      message: { success: mockCtxSuccess },
      modal: { confirm: mockCtxConfirm },
    })
  })

  it('挂载后 message/modal 代理切换到 App.useApp 上下文实例', () => {
    render(<MessageBridge />)

    message.success('上下文提示')
    modal.confirm({ title: '上下文确认' })

    expect(mockCtxSuccess).toHaveBeenCalledWith('上下文提示')
    expect(mockCtxConfirm).toHaveBeenCalledWith({ title: '上下文确认' })
    expect(mockStaticSuccess).not.toHaveBeenCalled()
    expect(mockStaticConfirm).not.toHaveBeenCalled()
  })

  it('组件本身不渲染任何 DOM', () => {
    const { container } = render(<MessageBridge />)
    expect(container).toBeEmptyDOMElement()
  })
})
