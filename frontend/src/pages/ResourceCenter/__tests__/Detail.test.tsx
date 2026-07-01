import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'
import ResourceDetail from '../Detail'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'res-1' }),
}))

vi.mock('@/services/resource', () => ({
  getResource: vi.fn().mockResolvedValue({
    id: 'res-1',
    name: 'test.pdf',
    file_name: 'test.pdf',
    file_type: 'application/pdf',
    file_size: 1024,
    created_at: '2024-01-01T00:00:00Z',
    description: 'desc',
    tags: [{ id: 't1', name: 'tag1' }],
  }),
  fetchResourceFileBlob: vi.fn().mockResolvedValue(new Blob(['test'])),
}))

vi.mock('@/components', () => ({
  ResourcePreview: ({ resource }: any) =>
    React.createElement('div', { 'data-testid': 'resource-preview' }, resource.name),
}))

vi.mock('antd', () => ({
  Button: ({ children, onClick }: any) =>
    React.createElement('button', { onClick, 'data-testid': `btn-${children}` }, children),
  message: { error: vi.fn() },
}))

vi.mock('@ant-design/icons', () => ({
  DownloadOutlined: () => React.createElement('span', null, 'Download'),
  LeftOutlined: () => React.createElement('span', null, 'Left'),
  DeleteOutlined: () => React.createElement('span', null, 'Delete'),
}))

describe('ResourceDetail', () => {
  it('renders resource after loading', async () => {
    render(React.createElement(ResourceDetail))
    await waitFor(() => expect(screen.getByTestId('resource-preview')).toBeInTheDocument())
  })

  it('navigates back to list', async () => {
    render(React.createElement(ResourceDetail))
    await waitFor(() => expect(screen.getByTestId('btn-返回资源列表')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('btn-返回资源列表'))
    expect(mockNavigate).toHaveBeenCalledWith('/resource-center')
  })
})
