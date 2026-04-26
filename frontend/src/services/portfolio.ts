import { api } from './api'
import { toBlob, toItem, toListResponse } from './response'
import type { ListResponse } from '@/types/api'
import type { PortfolioItem, PortfolioItemCreate, PortfolioItemUpdate } from '@/types/portfolio'

export const portfolioService = {
  getPortfolios: async (
    params?: { student_id?: string; type?: string; page?: number; page_size?: number }
  ): Promise<ListResponse<PortfolioItem>> => {
    const response = await api.get('/portfolios', { params })
    return toListResponse<PortfolioItem>(response)
  },

  getPortfolioItem: async (itemId: string): Promise<PortfolioItem> => {
    const response = await api.get(`/portfolios/${itemId}`)
    return toItem<PortfolioItem>(response)
  },

  createPortfolioItem: async (data: PortfolioItemCreate): Promise<PortfolioItem> => {
    const response = await api.post('/portfolios', data)
    return toItem<PortfolioItem>(response)
  },

  updatePortfolioItem: async (itemId: string, data: PortfolioItemUpdate): Promise<PortfolioItem> => {
    const response = await api.put(`/portfolios/${itemId}`, data)
    return toItem<PortfolioItem>(response)
  },

  deletePortfolioItem: async (itemId: string): Promise<void> => {
    await api.delete(`/portfolios/${itemId}`)
  },

  exportPortfolioReport: async (studentId: string): Promise<Blob> => {
    const response = await api.get(`/students/${studentId}/export`, {
      responseType: 'blob',
    })
    return toBlob(response)
  },
}
