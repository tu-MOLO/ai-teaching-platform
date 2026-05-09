import React from 'react'
import { Card, Tag } from 'antd'
import { Link } from 'react-router-dom'
import type { Resource } from '../../types/resource'

export interface ResourceCardProps {
  resource: Resource
}

const getFileIcon = (fileType: string): string => {
  if (fileType.includes('image')) return '🖼️'
  if (fileType.includes('video')) return '🎬'
  if (fileType.includes('audio')) return '🎵'
  if (fileType.includes('pdf')) return '📄'
  if (fileType.includes('document')) return '📝'
  if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️'
  return '📁'
}

const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) return '未知'
  if (bytes === 0) return '0 B'
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const formatDate = (dateString: string): string => new Date(dateString).toLocaleDateString('zh-CN')

const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  const truncatedDescription =
    resource.description && resource.description.length > 100
      ? `${resource.description.slice(0, 100)}...`
      : resource.description

  return (
    <Link to={`/resource-center/${resource.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card hoverable>
        <div
          style={{
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            fontSize: 64,
            marginBottom: 16,
          }}
        >
          {getFileIcon(resource.file_type)}
        </div>

        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{resource.name}</h3>
        <p style={{ margin: '0 0 12px', color: '#666', fontSize: 14 }}>{truncatedDescription || '暂无描述'}</p>

        <div style={{ marginBottom: 12 }}>
          {(resource.tags || []).slice(0, 3).map((tag) => (
            <Tag key={tag?.id || 'unknown'}>{tag?.name || ''}</Tag>
          ))}
          {(resource.tags || []).length > 3 && <Tag>+{(resource.tags || []).length - 3}</Tag>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#999', fontSize: 12 }}>
          <span>{formatDate(resource.created_at)}</span>
          <span>{formatFileSize(resource.file_size)}</span>
        </div>
      </Card>
    </Link>
  )
}

export default ResourceCard
