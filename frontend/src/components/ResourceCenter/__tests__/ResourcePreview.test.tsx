import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import ResourcePreview from '../ResourcePreview'
import { fetchResourceFileBlob } from '@/services/resource'

vi.mock('@/services/resource', () => ({
  fetchResourceFileBlob: vi.fn().mockResolvedValue(new Blob(['test'])),
}))

vi.mock('antd', () => ({
  Button: ({ children, onClick }: any) =>
    React.createElement('button', { onClick, 'data-testid': `btn-${children}` }, children),
  Descriptions: Object.assign(
    ({ children }: any) => React.createElement('div', { 'data-testid': 'descriptions' }, children),
    {
      Item: ({ children, label }: any) =>
        React.createElement('div', { 'data-testid': `desc-item-${label}` }, label, children),
    }
  ),
  Empty: ({ description }: any) => React.createElement('div', { 'data-testid': 'empty' }, description),
  Space: ({ children, direction }: any) =>
    React.createElement('div', { 'data-testid': `space-${direction || 'horizontal'}` }, children),
  Tooltip: ({ children }: any) => React.createElement('div', null, children),
  message: { error: vi.fn() },
}))

vi.mock('@ant-design/icons', () => ({
  DownloadOutlined: () => React.createElement('span', null, 'Download'),
  ReloadOutlined: () => React.createElement('span', null, 'Reload'),
  ZoomInOutlined: () => React.createElement('span', null, 'ZoomIn'),
  ZoomOutOutlined: () => React.createElement('span', null, 'ZoomOut'),
  FullscreenOutlined: () => React.createElement('span', null, 'Fullscreen'),
  FileExcelOutlined: () => React.createElement('span', null, 'Excel'),
  FileImageOutlined: () => React.createElement('span', null, 'Image'),
  FileOutlined: () => React.createElement('span', null, 'File'),
  FilePdfOutlined: () => React.createElement('span', null, 'PDF'),
  FilePptOutlined: () => React.createElement('span', null, 'PPT'),
  FileWordOutlined: () => React.createElement('span', null, 'Word'),
}))

const baseResource = {
  id: 'res-1',
  name: 'test.pdf',
  file_name: 'test.pdf',
  file_type: 'application/pdf',
  file_size: 1024,
  created_at: '2024-01-01T00:00:00Z',
  tags: [{ id: 't1', name: 'tag1' }],
}

describe('ResourcePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchResourceFileBlob).mockResolvedValue(new Blob(['test']))
  })

  it('renders resource info', () => {
    render(React.createElement(ResourcePreview, { resource: baseResource as any }))
    expect(screen.getByTestId('descriptions')).toBeInTheDocument()
    expect(screen.getByTestId('desc-item-文件名')).toHaveTextContent('test.pdf')
  })

  it('renders download button', () => {
    render(React.createElement(ResourcePreview, { resource: baseResource as any }))
    expect(screen.getByTestId('btn-下载')).toBeInTheDocument()
  })

  it('renders image preview for image type', async () => {
    const imageResource = { ...baseResource, file_type: 'image/png' }
    render(React.createElement(ResourcePreview, { resource: imageResource as any }))
    await waitFor(() => expect(fetchResourceFileBlob).toHaveBeenCalledWith('res-1'))
    expect(screen.getByTestId('btn-下载')).toBeInTheDocument()
    expect(screen.getByTestId('btn-重置')).toBeInTheDocument()
    expect(screen.getByTestId('btn-全屏')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    const img = document.querySelector('img')
    expect(img).toBeInTheDocument()
  })

  it('renders video preview for video type', async () => {
    const videoResource = { ...baseResource, file_type: 'video/mp4' }
    render(React.createElement(ResourcePreview, { resource: videoResource as any }))
    await waitFor(() => expect(fetchResourceFileBlob).toHaveBeenCalledWith('res-1'))
    const video = document.querySelector('video')
    expect(video).toBeInTheDocument()
  })

  it('renders audio preview for audio type', async () => {
    const audioResource = { ...baseResource, file_type: 'audio/mp3' }
    render(React.createElement(ResourcePreview, { resource: audioResource as any }))
    await waitFor(() => expect(fetchResourceFileBlob).toHaveBeenCalledWith('res-1'))
    const audio = document.querySelector('audio')
    expect(audio).toBeInTheDocument()
  })

  it('renders empty fallback when blob fails', async () => {
    vi.mocked(fetchResourceFileBlob).mockRejectedValue(new Error('fail'))
    render(React.createElement(ResourcePreview, { resource: baseResource as any }))
    await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument())
  })
})
