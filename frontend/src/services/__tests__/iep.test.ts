import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()
const mockToItem = vi.fn((v: unknown) => v)
const mockToListResponse = vi.fn((v: unknown) => v)

vi.mock('../api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('../response', () => ({
  toItem: (v: unknown) => mockToItem(v),
  toListResponse: (v: unknown) => mockToListResponse(v),
}))

const TEMPLATE = { id: 'tpl-1', name: '默认模板', is_default: true, domains: [] }
const IEP = { id: 'iep-1', student_id: 'stu-1', term: '2026-2027一' }

describe('iep service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('评估模板', () => {
    it('listTemplates 取响应体 data 数组传给 toItem', async () => {
      const { listTemplates } = await import('../iep')
      mockGet.mockResolvedValue({ data: [TEMPLATE] })
      const result = await listTemplates()
      expect(mockGet).toHaveBeenCalledWith('/iep-templates')
      expect(mockToItem).toHaveBeenCalledWith([TEMPLATE])
      expect(result).toEqual([TEMPLATE])
    })

    it('getDefaultTemplate 请求 /iep-templates/default', async () => {
      const { getDefaultTemplate } = await import('../iep')
      mockGet.mockResolvedValue(TEMPLATE)
      const result = await getDefaultTemplate()
      expect(mockGet).toHaveBeenCalledWith('/iep-templates/default')
      expect(result).toBe(TEMPLATE)
    })

    it('createTemplate POST payload', async () => {
      const { createTemplate } = await import('../iep')
      const payload = { name: '自定义', is_default: false, domains: [] }
      mockPost.mockResolvedValue(TEMPLATE)
      await createTemplate(payload)
      expect(mockPost).toHaveBeenCalledWith('/iep-templates', payload)
    })

    it('getTemplate 请求单个模板', async () => {
      const { getTemplate } = await import('../iep')
      mockGet.mockResolvedValue(TEMPLATE)
      await getTemplate('tpl-1')
      expect(mockGet).toHaveBeenCalledWith('/iep-templates/tpl-1')
    })

    it('updateTemplate PUT 更新', async () => {
      const { updateTemplate } = await import('../iep')
      const payload = { name: '改名' }
      mockPut.mockResolvedValue(TEMPLATE)
      await updateTemplate('tpl-1', payload)
      expect(mockPut).toHaveBeenCalledWith('/iep-templates/tpl-1', payload)
    })

    it('deleteTemplate DELETE', async () => {
      const { deleteTemplate } = await import('../iep')
      mockDelete.mockResolvedValue(undefined)
      await deleteTemplate('tpl-1')
      expect(mockDelete).toHaveBeenCalledWith('/iep-templates/tpl-1')
    })

    it('resetTemplate POST reset', async () => {
      const { resetTemplate } = await import('../iep')
      mockPost.mockResolvedValue(TEMPLATE)
      await resetTemplate('tpl-1')
      expect(mockPost).toHaveBeenCalledWith('/iep-templates/tpl-1/reset')
    })
  })

  describe('IEP 列表与 CRUD', () => {
    it('listIEPs 无参数时透传空参数', async () => {
      const { listIEPs } = await import('../iep')
      mockGet.mockResolvedValue({ data: [], total: 0 })
      await listIEPs()
      expect(mockGet).toHaveBeenCalledWith('/ieps', { params: {} })
    })

    it('listIEPs 把 status 转换为 status_filter', async () => {
      const { listIEPs } = await import('../iep')
      mockGet.mockResolvedValue({ data: [], total: 0 })
      await listIEPs({ status: 'draft', page: 2 })
      expect(mockGet).toHaveBeenCalledWith('/ieps', {
        params: { page: 2, status_filter: 'draft' },
      })
    })

    it('getIEP / createIEP / updateIEP / deleteIEP 路径正确', async () => {
      const iep = await import('../iep')
      mockGet.mockResolvedValue(IEP)
      mockPost.mockResolvedValue(IEP)
      mockPut.mockResolvedValue(IEP)
      mockDelete.mockResolvedValue(undefined)

      await iep.getIEP('iep-1')
      expect(mockGet).toHaveBeenCalledWith('/ieps/iep-1')

      await iep.createIEP({ student_id: 'stu-1', term: 't' })
      expect(mockPost).toHaveBeenCalledWith('/ieps', {
        student_id: 'stu-1',
        term: 't',
      })

      await iep.updateIEP('iep-1', { term: 't2' })
      expect(mockPut).toHaveBeenCalledWith('/ieps/iep-1', { term: 't2' })

      await iep.deleteIEP('iep-1')
      expect(mockDelete).toHaveBeenCalledWith('/ieps/iep-1')
    })
  })

  describe('IEP 状态流转', () => {
    it.each([
      ['submitIEP', 'submit'],
      ['backIEPToDraft', 'back-to-draft'],
      ['lockIEP', 'lock'],
      ['reviseIEP', 'revise'],
    ] as const)('%s POST /ieps/{id}/%s', async (fnName, action) => {
      const mod = await import('../iep')
      mockPost.mockResolvedValue(IEP)
      const result = await mod[fnName]('iep-1')
      expect(mockPost).toHaveBeenCalledWith(`/ieps/iep-1/${action}`)
      expect(result).toBe(IEP)
    })
  })

  describe('AI 文书与对比', () => {
    it('generateIEPDraft POST generate-draft', async () => {
      const { generateIEPDraft } = await import('../iep')
      const draft = { missing_info: ['需补充'] }
      mockPost.mockResolvedValue(draft)
      const result = await generateIEPDraft('iep-1')
      expect(mockPost).toHaveBeenCalledWith('/ieps/iep-1/generate-draft')
      expect(result).toBe(draft)
    })

    it('generateGrowthReport POST generate-report', async () => {
      const { generateGrowthReport } = await import('../iep')
      const report = { overview: '概述' }
      mockPost.mockResolvedValue(report)
      const result = await generateGrowthReport('iep-1')
      expect(mockPost).toHaveBeenCalledWith('/ieps/iep-1/generate-report')
      expect(result).toBe(report)
    })

    it('getIEPCompare GET compare', async () => {
      const { getIEPCompare } = await import('../iep')
      const compare = { previous_term: null, current_term: 't', previous: [], current: [] }
      mockGet.mockResolvedValue(compare)
      const result = await getIEPCompare('iep-1')
      expect(mockGet).toHaveBeenCalledWith('/ieps/iep-1/compare')
      expect(result).toBe(compare)
    })
  })

  describe('错误透传', () => {
    it('getIEP 网络错误时 reject', async () => {
      const { getIEP } = await import('../iep')
      mockGet.mockRejectedValue(new Error('Network Error'))
      await expect(getIEP('x')).rejects.toThrow('Network Error')
    })
  })
})
