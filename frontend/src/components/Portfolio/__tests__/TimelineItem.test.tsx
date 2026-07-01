import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import TimelineItem from '../TimelineItem'

vi.mock('@/stores/portfolioTypes', () => ({
  usePortfolioTypesStore: () => ({
    getIconForType: (_id: string) => '📝',
    getNameForType: (id: string) => id === 'evaluation' ? '评价' : '作品',
  }),
}))

vi.mock('@/services/resource', () => ({
  fetchResourceFileBlob: vi.fn().mockResolvedValue(new Blob()),
}))

vi.mock('antd', () => ({
  Card: ({ children, className}: any) =>
    React.createElement('div', { 'data-testid': 'card', className }, children),
  Typography: {
    Title: ({ children, ...props }: any) =>
      React.createElement('h5', { 'data-testid': 'title', ...props }, children),
    Text: ({ children, type, ...props }: any) =>
      React.createElement('span', { 'data-testid': 'text', 'data-type': type, ...props }, children),
    Paragraph: ({ children}: any) =>
      React.createElement('p', { 'data-testid': 'paragraph' }, children),
  },
  Tag: ({ children, color, onClick, style}: any) =>
    React.createElement('span', { 'data-testid': 'tag', 'data-color': color, onClick, style }, children),
  Space: ({ children}: any) =>
    React.createElement('div', { 'data-testid': 'space' }, children),
  Progress: ({ percent}: any) =>
    React.createElement('div', { 'data-testid': 'progress', 'data-percent': percent }),
  Button: ({ children, onClick, danger}: any) =>
    React.createElement('button', { 'data-testid': 'button', onClick, 'data-danger': danger ? 'true' : 'false', type: 'button' }, children),
  Popconfirm: ({ children, onConfirm}: any) =>
    React.createElement(
      'div',
      {
        'data-testid': 'popconfirm',
        onClick: (e: any) => { e.stopPropagation(); onConfirm?.() },
      },
      children
    ),
}))

vi.mock('@ant-design/icons', () => ({
  EditOutlined: () => React.createElement('span', null, 'Edit'),
  DeleteOutlined: () => React.createElement('span', null, 'Delete'),
}))

describe('TimelineItem', () => {
  const baseItem = {
    id: '1',
    student_id: 'student-1',
    type: 'work' as const,
    title: '我的作品',
    content: '这是一个作品',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders item title', () => {
    render(React.createElement(TimelineItem, { item: baseItem }))
    expect(screen.getByText('我的作品')).toBeInTheDocument()
  })

  it('renders type icon and name', () => {
    render(React.createElement(TimelineItem, { item: baseItem }))
    expect(screen.getByText('📝')).toBeInTheDocument()
    expect(screen.getByText('作品')).toBeInTheDocument()
  })

  it('renders content text', () => {
    render(React.createElement(TimelineItem, { item: baseItem }))
    expect(screen.getByText('这是一个作品')).toBeInTheDocument()
  })

  it('renders evaluation scores when type is "evaluation"', () => {
    const evalItem = {
      ...baseItem,
      type: 'evaluation' as const,
      cognitive_score: 4,
      skill_score: 3.5,
    }
    render(React.createElement(TimelineItem, { item: evalItem }))
    const progressBars = screen.getAllByTestId('progress')
    expect(progressBars.length).toBeGreaterThanOrEqual(2)
  })

  it('does not render scores when type is "work"', () => {
    render(React.createElement(TimelineItem, { item: baseItem }))
    expect(screen.queryByTestId('progress')).not.toBeInTheDocument()
  })

  it('renders edit button when onEdit provided', () => {
    render(React.createElement(TimelineItem, { item: baseItem, onEdit: vi.fn() }))
    expect(screen.getByText('编辑')).toBeInTheDocument()
  })

  it('renders delete button when onDelete provided', () => {
    render(React.createElement(TimelineItem, { item: baseItem, onDelete: vi.fn() }))
    expect(screen.getByText('删除')).toBeInTheDocument()
  })

  it('calls onEdit when edit button clicked', async () => {
    const user = userEvent.setup()
    const mockOnEdit = vi.fn()
    render(React.createElement(TimelineItem, { item: baseItem, onEdit: mockOnEdit }))
    await user.click(screen.getByText('编辑'))
    expect(mockOnEdit).toHaveBeenCalledWith('1')
  })

  it('calls onDelete when delete button is clicked and confirmed', async () => {
    const user = userEvent.setup()
    const mockOnDelete = vi.fn()
    render(React.createElement(TimelineItem, { item: baseItem, onDelete: mockOnDelete }))
    await user.click(screen.getByText('删除'))
    expect(mockOnDelete).toHaveBeenCalledWith('1')
  })

  it('renders attachments when present', () => {
    const itemWithAttachments = {
      ...baseItem,
      attachments: JSON.stringify(['file1.pdf', 'file2.jpg']),
    }
    render(React.createElement(TimelineItem, { item: itemWithAttachments }))
    expect(screen.getByText('附件 1')).toBeInTheDocument()
    expect(screen.getByText('附件 2')).toBeInTheDocument()
  })

  it('renders created_at date', () => {
    render(React.createElement(TimelineItem, { item: baseItem }))
    expect(screen.getByText(/记录时间:/)).toBeInTheDocument()
  })
})