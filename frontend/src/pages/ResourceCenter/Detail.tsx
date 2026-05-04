import React, { useEffect, useState } from 'react'
import { Button, message } from 'antd'
import { DownloadOutlined, LeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { ResourcePreview } from '@/components'
import { getResource, type Resource } from '../../services/resource'
import './index.css'

const escapeHtml = (unsafe: string): string =>
  unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const sanitizeHtml = (html: string): string => escapeHtml(html).replace(/\n/g, '<br />')

const ResourceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [resource, setResource] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!id) {
      return
    }

    const fetchResource = async () => {
      setLoading(true)
      try {
        const response = await getResource(id)
        setResource(response)
      } catch (error: any) {
        if (error?.status === 404 || error?.response?.status === 404) {
          console.log('Resource not found:', id)
        } else {
          message.error('获取资源详情失败')
          console.error('Failed to fetch resource:', error)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchResource()
  }, [id])

  const handleDownload = () => {
    if (!resource?.file_url) {
      message.error('当前资源没有可下载地址')
      return
    }

    window.open(resource.file_url, '_blank')
  }

  if (loading) {
    return <div className="resource-center">加载中...</div>
  }

  if (!resource) {
    return <div className="resource-center">资源不存在</div>
  }

  return (
    <div className="resource-center">
      <Button icon={<LeftOutlined />} onClick={() => navigate('/resource-center')} style={{ marginBottom: 24 }}>
        返回资源列表
      </Button>

      <div className="resource-detail">
        <div className="resource-detail-header">
          <h1 className="resource-detail-title">{resource.name}</h1>

          <div className="resource-detail-meta">
            <span>上传时间: {new Date(resource.created_at).toLocaleString()}</span>
            <span>
              文件大小:{' '}
              {resource.file_size ? `${(resource.file_size / 1024 / 1024).toFixed(2)} MB` : '未知'}
            </span>
            <span>文件类型: {resource.file_type}</span>
          </div>

          <div className="resource-detail-tags">
            {resource.tags.map((tag) => (
              <span
                key={tag.id}
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '16px',
                  fontSize: '12px',
                  marginRight: '8px',
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        <div className="resource-detail-preview">
          <ResourcePreview resource={resource} />
        </div>

        <div className="resource-detail-description">
          <div
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(resource.description || '暂无描述'),
            }}
          />
        </div>

        <div className="resource-detail-actions">
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
            下载文件
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ResourceDetail
