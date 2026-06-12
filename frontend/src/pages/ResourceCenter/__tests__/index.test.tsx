import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

const mockNavigate = vi.fn()
const mockGetResources = vi.fn().mockResolvedValue({ data: [], total: 0 })
const mockGetTags = vi.fn().mockResolvedValue([])

vi.mock('../../../services/resource', () => ({
  getResources: (...args: any[]) => mockGetResources(...args),
}))

vi.mock('../../../services/tag', () => ({
  getTags: (...args: any[]) => mockGetTags(...args),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: any) => React.createElement('a', { href: to, ...props }, children),
}))

vi.mock('antd', () => {
  const EmptyComp = ({ description }: any) =>
    React.createElement('div', { 'data-testid': 'empty' }, typeof description === 'object' ? '' : description)
  const SearchComp = ({ placeholder, onSearch, onChange }: any) =>
    React.createElement('div', null,
      React.createElement('input', { placeholder, 'data-testid': 'search-input', onChange: (e: any) => onChange?.(e) }),
      React.createElement('button', { onClick: () => onSearch?.(''), 'data-testid': 'search-btn' }, 'Search')
    )
  const PaginationComp = ({ current, total, pageSize, onChange }: any) =>
    React.createElement('div', { 'data-testid': 'pagination' }, `Page ${current} of ${Math.ceil(total / pageSize)}`,
      React.createElement('button', { onClick: () => onChange?.(current + 1), 'data-testid': 'page-next' }, 'Next')
    )

  return {
    Input: Object.assign(
      (props: any) => React.createElement('input', props),
      { Search: SearchComp }
    ),
    Empty: Object.assign(EmptyComp, { PRESENTED_IMAGE_SIMPLE: 'simple' }),
    Pagination: PaginationComp,
    Spin: ({ children, size: _size }: any) => React.createElement('div', { 'data-testid': 'spin' }, children),
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  }
})

vi.mock('@ant-design/icons', () => {
  const icon = (name: string) => () => React.createElement('span', { 'data-testid': `icon-${name}` }, name)
  return {
    FileOutlined: icon('FileOutlined'),
    FileImageOutlined: icon('FileImageOutlined'),
    FilePdfOutlined: icon('FilePdfOutlined'),
    SearchOutlined: icon('SearchOutlined'),
    UploadOutlined: icon('UploadOutlined'),
    VideoCameraOutlined: icon('VideoCameraOutlined'),
  }
})

const ResourceCenter = (await import('../index')).default

describe('ResourceCenter page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetResources.mockResolvedValue({ data: [], total: 0 })
    mockGetTags.mockResolvedValue([])
  })

  it('should render resource center page', () => {
    render(React.createElement(ResourceCenter))
    expect(screen.getByText('资源中心')).toBeInTheDocument()
  })

  it('should display search/filter bar', () => {
    render(React.createElement(ResourceCenter))
    expect(screen.getByPlaceholderText('搜索资源名称')).toBeInTheDocument()
  })

  it('should display 上传资源 button', () => {
    render(React.createElement(ResourceCenter))
    expect(screen.getByText('上传资源')).toBeInTheDocument()
  })

  it('should navigate on upload button click', () => {
    render(React.createElement(ResourceCenter))
    fireEvent.click(screen.getByText('上传资源'))
    expect(mockNavigate).toHaveBeenCalledWith('/resource-center/upload')
  })

  it('should fetch resources on mount', async () => {
    render(React.createElement(ResourceCenter))
    await waitFor(() => expect(mockGetResources).toHaveBeenCalled())
    await waitFor(() => expect(mockGetTags).toHaveBeenCalled())
  })

  it('should handle search', async () => {
    render(React.createElement(ResourceCenter))
    const input = screen.getByTestId('search-input')
    fireEvent.change(input, { target: { value: 'math' } })
    fireEvent.click(screen.getByTestId('search-btn'))
    await waitFor(() => expect(mockGetResources).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'math' })))
  })

  it('should display resources when data exists', async () => {
    mockGetResources.mockResolvedValue({
      data: [
        { id: '1', name: 'Resource 1', description: 'Desc 1', file_type: 'image/png', tags: [{ id: 't1', name: 'tag1' }], created_at: '2024-01-01T00:00:00' },
      ],
      total: 1,
    })
    mockGetTags.mockResolvedValue([{ id: 't1', name: 'tag1' }])
    render(React.createElement(ResourceCenter))
    await waitFor(() => expect(screen.getByText('Resource 1')).toBeInTheDocument())
  })

  it('should display empty state when no resources', async () => {
    render(React.createElement(ResourceCenter))
    await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument())
  })

  it('should handle pagination change', async () => {
    mockGetResources.mockResolvedValue({
      data: Array.from({ length: 9 }, (_, i) => ({
        id: String(i + 1), name: `Resource ${i + 1}`, description: '', file_type: 'image/png', tags: [], created_at: '2024-01-01T00:00:00',
      })),
      total: 20,
    })
    render(React.createElement(ResourceCenter))
    await waitFor(() => expect(screen.getByTestId('page-next')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('page-next'))
    await waitFor(() => expect(mockGetResources).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })))
  })

  it('should handle tag filter', async () => {
    mockGetTags.mockResolvedValue([{ id: 't1', name: 'tag1' }])
    render(React.createElement(ResourceCenter))
    await waitFor(() => expect(screen.getByText('tag1')).toBeInTheDocument())
    fireEvent.click(screen.getByText('tag1'))
    await waitFor(() => expect(mockGetResources).toHaveBeenCalledWith(expect.objectContaining({ tag_ids: ['t1'] })))
  })

  it('should clear tag filter on all click', async () => {
    mockGetTags.mockResolvedValue([{ id: 't1', name: 'tag1' }])
    render(React.createElement(ResourceCenter))
    await waitFor(() => expect(screen.getByText('全部')).toBeInTheDocument())
    fireEvent.click(screen.getByText('全部'))
    await waitFor(() => expect(mockGetResources).toHaveBeenCalledWith(expect.objectContaining({ tag_ids: undefined })))
  })

  it('should navigate to resource detail on card click', async () => {
    mockGetResources.mockResolvedValue({
      data: [{ id: '1', name: 'Resource 1', description: 'Desc 1', file_type: 'image/png', tags: [], created_at: '2024-01-01T00:00:00' }],
      total: 1,
    })
    render(React.createElement(ResourceCenter))
    await waitFor(() => expect(screen.getByText('Resource 1')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Resource 1'))
    expect(mockNavigate).toHaveBeenCalledWith('/resource-center/1')
  })

  it('should handle fetch resources error', async () => {
    const { BusinessError } = await import('../../../types/error')
    mockGetResources.mockRejectedValueOnce(new BusinessError('Unauthorized', '401'))
    render(React.createElement(ResourceCenter))
    await waitFor(() => expect(mockGetResources).toHaveBeenCalled())
  })

  it('should handle fetch resources generic error', async () => {
    mockGetResources.mockRejectedValueOnce(new Error('fail'))
    render(React.createElement(ResourceCenter))
    await waitFor(() => expect(mockGetResources).toHaveBeenCalled())
  })

  it('should show loading state initially', () => {
    render(React.createElement(ResourceCenter))
    expect(screen.getByTestId('spin')).toBeInTheDocument()
  })
})
