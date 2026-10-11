import { describe, it, expect, vi } from 'vitest'

const mockRequest = { get: vi.fn(), post: vi.fn() }

vi.mock('../request', () => ({
  default: mockRequest,
}))

describe('services/api 桶模块', () => {
  it('default 导出即 request 实例', async () => {
    const mod = await import('../api')
    expect(mod.default).toBe(mockRequest)
  })

  it('具名 api 同样指向 request 实例', async () => {
    const mod = await import('../api')
    expect(mod.api).toBe(mockRequest)
  })
})
