import React, { useCallback, useEffect, useState } from 'react'
import { Button, Descriptions, Empty, Space, Tooltip, message } from 'antd'
import {
  DownloadOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileWordOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons'
import type { Resource } from '../../types/resource'
import { fetchResourceFileBlob } from '../../services/resource'

export interface ResourcePreviewProps {
  resource: Resource
}

const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) return '未知'
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`
}

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getFileTypeDisplay = (fileType: string): string => {
  if (fileType.includes('image')) return '图片文件'
  if (fileType.includes('video')) return '视频文件'
  if (fileType.includes('audio')) return '音频文件'
  if (fileType.includes('pdf')) return 'PDF 文档'
  if (fileType.includes('word') || fileType.includes('msword') || fileType.includes('officedocument.wordprocessingml')) {
    return 'Word 文档'
  }
  if (fileType.includes('excel') || fileType.includes('spreadsheetml')) return 'Excel 表格'
  if (fileType.includes('powerpoint') || fileType.includes('presentationml')) return 'PowerPoint 演示文稿'
  return '其他文件'
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes('image')) return <FileImageOutlined />
  if (fileType.includes('pdf')) return <FilePdfOutlined />
  if (fileType.includes('word') || fileType.includes('msword') || fileType.includes('officedocument.wordprocessingml')) {
    return <FileWordOutlined />
  }
  if (fileType.includes('excel') || fileType.includes('spreadsheetml')) return <FileExcelOutlined />
  if (fileType.includes('powerpoint') || fileType.includes('presentationml')) return <FilePptOutlined />
  return <FileOutlined />
}

const ResourcePreview: React.FC<ResourcePreviewProps> = ({ resource }) => {
  const [imageScale, setImageScale] = useState(1)
  const [previewError, setPreviewError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadingBlob, setLoadingBlob] = useState(false)

  const fileType = resource.file_type
  const isImage = fileType.includes('image')
  const isVideo = fileType.includes('video')
  const isAudio = fileType.includes('audio')
  const isPdf = fileType.includes('pdf')
  const isOffice =
    fileType.includes('word') ||
    fileType.includes('excel') ||
    fileType.includes('powerpoint') ||
    fileType.includes('msword') ||
    fileType.includes('spreadsheetml') ||
    fileType.includes('presentationml')

  useEffect(() => {
    if (!resource.id) return
    let objectUrl: string | null = null
    let cancelled = false

    const loadBlob = async () => {
      setLoadingBlob(true)
      try {
        const blob = await fetchResourceFileBlob(resource.id)
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
        setPreviewError(false)
      } catch {
        if (!cancelled) {
          setPreviewError(true)
        }
      } finally {
        if (!cancelled) {
          setLoadingBlob(false)
        }
      }
    }

    loadBlob()

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [resource.id, previewError === false && blobUrl === null])

  const handleDownload = useCallback(async () => {
    if (!resource.id) {
      message.error('当前资源没有可下载地址')
      return
    }

    try {
      const blob = await fetchResourceFileBlob(resource.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = resource.file_name || resource.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      message.success('开始下载文件')
    } catch {
      message.error('下载文件失败')
    }
  }, [resource.id, resource.file_name, resource.name])

  const handleZoom = useCallback((delta: number) => {
    setImageScale((prev) => Math.max(0.5, Math.min(3, prev + delta)))
  }, [])

  const handleResetZoom = useCallback(() => {
    setImageScale(1)
  }, [])

  const handlePreviewError = useCallback(() => {
    setPreviewError(true)
  }, [])

  const handleRetry = useCallback(() => {
    setPreviewError(false)
    setBlobUrl(null)
  }, [])

  const renderImagePreview = () => {
    if (previewError || !blobUrl) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" align="center">
              <span>{loadingBlob ? '图片加载中...' : '图片加载失败'}</span>
              {!loadingBlob && (
                <Button type="primary" icon={<ReloadOutlined />} onClick={handleRetry}>
                  重试
                </Button>
              )}
            </Space>
          }
        />
      )
    }

    return (
      <div
        style={{
          width: '100%',
          height: isFullscreen ? '100vh' : '500px',
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isFullscreen ? '#000' : '#fafafa',
        }}
      >
        <img
          src={blobUrl}
          alt={resource.name}
          onError={handlePreviewError}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `scale(${imageScale})`,
            transition: 'transform 0.2s ease',
            cursor: isFullscreen ? 'zoom-out' : 'default',
          }}
          onClick={isFullscreen ? () => setIsFullscreen(false) : undefined}
        />
      </div>
    )
  }

  const renderVideoPreview = () => {
    if (previewError || !blobUrl) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" align="center">
              <span>{loadingBlob ? '视频加载中...' : '视频加载失败'}</span>
              {!loadingBlob && (
                <Button type="primary" icon={<ReloadOutlined />} onClick={handleRetry}>
                  重试
                </Button>
              )}
            </Space>
          }
        />
      )
    }

    return (
      <video src={blobUrl} controls onError={handlePreviewError} style={{ width: '100%', maxHeight: '500px' }}>
        您的浏览器不支持视频播放
      </video>
    )
  }

  const renderAudioPreview = () => {
    if (previewError || !blobUrl) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" align="center">
              <span>{loadingBlob ? '音频加载中...' : '音频加载失败'}</span>
              {!loadingBlob && (
                <Button type="primary" icon={<ReloadOutlined />} onClick={handleRetry}>
                  重试
                </Button>
              )}
            </Space>
          }
        />
      )
    }

    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <audio src={blobUrl} controls onError={handlePreviewError} style={{ width: '100%' }}>
          您的浏览器不支持音频播放
        </audio>
      </div>
    )
  }

  const renderDownloadOnly = (title: string, icon: React.ReactNode, helperText: string) => (
    <Empty
      image={icon}
      description={
        <Space direction="vertical" align="center">
          <span style={{ fontSize: 16, fontWeight: 500 }}>{title}</span>
          <span style={{ color: '#999' }}>{helperText}</span>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
            下载查看
          </Button>
        </Space>
      }
    />
  )

  const renderPreview = () => {
    if (isImage) return renderImagePreview()
    if (isVideo) return renderVideoPreview()
    if (isAudio) return renderAudioPreview()
    if (isPdf) {
      return renderDownloadOnly('PDF 文档', <FilePdfOutlined style={{ fontSize: 64, color: '#ff4d4f' }} />, 'PDF 文件请下载后查看')
    }
    if (isOffice) {
      const icon = React.cloneElement(getFileIcon(fileType) as React.ReactElement, {
        style: { fontSize: 64, color: '#1890ff' },
      })
      return renderDownloadOnly(getFileTypeDisplay(fileType), icon, 'Office 文件请下载后查看')
    }
    return renderDownloadOnly('文件预览', <FileOutlined style={{ fontSize: 64, color: '#999' }} />, '该类型文件暂不支持在线预览')
  }

  const renderToolbar = () => {
    const buttons = [
      <Tooltip title="下载文件" key="download">
        <Button icon={<DownloadOutlined />} onClick={handleDownload}>
          下载
        </Button>
      </Tooltip>,
    ]

    if (isImage) {
      buttons.push(
        <Tooltip title="缩小" key="zoom-out">
          <Button icon={<ZoomOutOutlined />} onClick={() => handleZoom(-0.25)} disabled={imageScale <= 0.5} />
        </Tooltip>,
        <span key="zoom-level" style={{ padding: '0 8px', color: '#666' }}>
          {Math.round(imageScale * 100)}%
        </span>,
        <Tooltip title="放大" key="zoom-in">
          <Button icon={<ZoomInOutlined />} onClick={() => handleZoom(0.25)} disabled={imageScale >= 3} />
        </Tooltip>,
        <Tooltip title="重置缩放" key="reset">
          <Button icon={<ReloadOutlined />} onClick={handleResetZoom} disabled={imageScale === 1}>
            重置
          </Button>
        </Tooltip>,
        <Tooltip title={isFullscreen ? '退出全屏' : '全屏预览'} key="fullscreen">
          <Button icon={<FullscreenOutlined />} onClick={() => setIsFullscreen((prev) => !prev)}>
            {isFullscreen ? '退出全屏' : '全屏'}
          </Button>
        </Tooltip>,
      )
    }

    if (isPdf && blobUrl) {
      buttons.push(
        <Tooltip title="在新窗口打开" key="open-new">
          <Button icon={<FullscreenOutlined />} onClick={() => window.open(blobUrl, '_blank')}>
            新窗口打开
          </Button>
        </Tooltip>,
      )
    }

    return (
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#fafafa',
          borderTop: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Space>{buttons}</Space>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #e8e8e8', backgroundColor: '#fafafa' }}>
        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="文件名">{resource.name}</Descriptions.Item>
          <Descriptions.Item label="文件大小">{formatFileSize(resource.file_size)}</Descriptions.Item>
          <Descriptions.Item label="文件类型">{getFileTypeDisplay(fileType)}</Descriptions.Item>
          <Descriptions.Item label="上传时间">{formatDateTime(resource.created_at)}</Descriptions.Item>
          {(resource.tags || []).length > 0 && (
            <Descriptions.Item label="标签">{(resource.tags || []).map((tag) => tag?.name || '').join(', ')}</Descriptions.Item>
          )}
        </Descriptions>
      </div>

      <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '300px' }}>{renderPreview()}</div>
      {renderToolbar()}
    </div>
  )
}

export default ResourcePreview
