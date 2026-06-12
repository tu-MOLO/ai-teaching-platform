import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import AbilityRadar from '../AbilityRadar'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('echarts-for-react', () => ({
  default: ({ option }: any) => React.createElement('div', { 'data-testid': 'echarts', 'data-option': JSON.stringify(option) }),
}))

vi.mock('@/services/portfolio', () => ({
  portfolioService: {
    getPortfolios: vi.fn().mockResolvedValue({ data: [], pages: 1 }),
  },
}))

vi.mock('antd', () => ({
  Card: ({ children, className }: any) => React.createElement('div', { 'data-testid': 'card', className }, children),
  Spin: () => React.createElement('div', { 'data-testid': 'spin' }, 'Loading'),
  Empty: ({ image, description, children }: any) =>
    React.createElement('div', { 'data-testid': 'empty' }, image, description, children),
  Button: ({ children, onClick }: any) => React.createElement('button', { onClick, 'data-testid': 'btn' }, children),
}))

vi.mock('@ant-design/icons', () => ({
  RadarChartOutlined: () => React.createElement('span', null, 'Radar'),
  PlusOutlined: () => React.createElement('span', null, 'Plus'),
}))

describe('AbilityRadar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(React.createElement(AbilityRadar, { studentId: 'student-1' }))
    expect(screen.getByTestId('spin')).toBeInTheDocument()
  })

  it('renders empty state when no evaluations', async () => {
    const { portfolioService } = await import('@/services/portfolio')
    portfolioService.getPortfolios = vi.fn().mockResolvedValue({ data: [{ id: '1', type: 'other' }], pages: 1 })
    render(React.createElement(AbilityRadar, { studentId: 'student-1' }))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    expect(screen.getByTestId('empty')).toBeInTheDocument()
  })

  it('renders chart when evaluation data exists', async () => {
    const { portfolioService } = await import('@/services/portfolio')
    portfolioService.getPortfolios = vi.fn().mockResolvedValue({
      data: [
        {
          id: '1',
          type: 'evaluation',
          cognitive_score: 80,
          skill_score: 90,
          creativity_score: 70,
          cooperation_score: 85,
          attention_score: 75,
        },
      ],
      pages: 1,
    })
    render(React.createElement(AbilityRadar, { studentId: 'student-1' }))
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument())
    expect(screen.getByTestId('echarts')).toBeInTheDocument()
  })
})
