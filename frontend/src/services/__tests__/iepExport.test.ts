import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGet = vi.fn()
const mockToBlob = vi.fn()

vi.mock('../api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

vi.mock('../response', () => ({
  toBlob: (v: unknown) => mockToBlob(v),
}))

describe('exportIEP', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>
  let appendSpy: ReturnType<typeof vi.spyOn>
  let removeSpy: ReturnType<typeof vi.spyOn>
  let createObjectURLSpy: ReturnType<typeof vi.fn>
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    appendSpy = vi.spyOn(document.body, 'appendChild')
    removeSpy = vi.spyOn(document.body, 'removeChild')
    createObjectURLSpy = vi.fn(() => 'blob:mock-url')
    revokeObjectURLSpy = vi.fn()
    URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURLSpy
  })

  afterEach(() => {
    clickSpy.mockRestore()
    appendSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('请求 blob、用 nameHint 命名并触发下载与回收', async () => {
    const { exportIEP } = await import('../iepExport')
    const blob = new Blob(['pdf-bytes'], { type: 'application/pdf' })
    mockGet.mockResolvedValue({ data: blob })
    mockToBlob.mockReturnValue(blob)

    await exportIEP('iep-1', '陈小明-IEP')

    expect(mockGet).toHaveBeenCalledWith('/ieps/iep-1/export', {
      responseType: 'blob',
    })
    expect(mockToBlob).toHaveBeenCalledWith({ data: blob })
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob)
    const link = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(link).toBeInstanceOf(HTMLAnchorElement)
    expect(link.href).toBe('blob:mock-url')
    expect(link.download).toBe('IEP_陈小明-IEP.pdf')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(appendSpy).toHaveBeenCalledTimes(1)
    expect(removeSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('未提供 nameHint 时使用 id 作为文件名', async () => {
    const { exportIEP } = await import('../iepExport')
    const blob = new Blob()
    mockGet.mockResolvedValue({ data: blob })
    mockToBlob.mockReturnValue(blob)

    await exportIEP('iep-9')

    const link = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(link.download).toBe('IEP_iep-9.pdf')
  })

  it('nameHint 含文件系统非法字符时替换为下划线', async () => {
    const { exportIEP } = await import('../iepExport')
    const blob = new Blob()
    mockGet.mockResolvedValue({ data: blob })
    mockToBlob.mockReturnValue(blob)

    await exportIEP('iep-1', 'a/b:c*d?e"f<g>h|i')

    const link = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(link.download).toBe('IEP_a_b_c_d_e_f_g_h_i.pdf')
  })
})
