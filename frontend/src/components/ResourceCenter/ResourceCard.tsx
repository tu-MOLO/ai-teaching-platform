/**
 * ResourceCard 资源卡片组件
 *
 * 用于展示资源中心中单个资源的卡片组件，显示资源封面、标题、描述、标签和元信息。
 * 点击卡片可跳转到资源详情页。
 *
 * @component
 * @example
 * ```tsx
 * import ResourceCard from './components/ResourceCenter/ResourceCard';
 * import { Resource } from '../../services/resource';
 *
 * const resource: Resource = {
 *   id: '1',
 *   title: '示例图片.jpg',
 *   description: '这是一个示例图片资源',
 *   file_url: 'https://example.com/image.jpg',
 *   preview_url: 'https://example.com/preview.jpg',
 *   file_type: 'image/jpeg',
 *   file_size: 1024000,
 *   tags: [{ id: '1', name: '图片' }],
 *   created_at: '2024-01-01T00:00:00Z',
 *   updated_at: '2024-01-01T00:00:00Z'
 * };
 *
 * <ResourceCard resource={resource} />
 * ```
 *
 * @interface ResourceCardProps
 * @property {Resource} resource - 资源数据对象
 */

import React from 'react';
import { Card, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { Resource } from '../../services/resource';

/**
 * 资源卡片组件Props接口
 */
export interface ResourceCardProps {
  /** 资源数据对象 */
  resource: Resource;
}

/**
 * 资源卡片组件
 *
 * 展示资源的基本信息，支持预览图或文件类型图标显示
 *
 * @param props - 组件属性
 * @returns React组件
 */
const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  /**
   * 根据文件类型获取对应的图标
   * @param fileType - 文件MIME类型
   * @returns 对应的表情符号图标
   */
  const getFileIcon = (fileType: string): string => {
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎬';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('document')) return '📃';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📄';
  };

  /**
   * 格式化文件大小
   * @param bytes - 文件大小（字节）
   * @returns 格式化后的文件大小字符串
   */
  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return '未知';
    if (bytes === 0) return '0 B';
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  /**
   * 格式化日期
   * @param dateString - ISO 8601格式的日期字符串
   * @returns 格式化后的日期字符串
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 截断描述文本
  const truncatedDescription = resource.description && resource.description.length > 100
    ? `${resource.description.substring(0, 100)}...`
    : resource.description;

  return (
    <Link to={`/resource-center/${resource.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card
        className="resource-card"
        hoverable
        cover={
          <div className="resource-card-cover" style={{ height: 160, overflow: 'hidden' }}>
            {resource.preview_url ? (
              <img
                src={resource.preview_url}
                alt={resource.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                backgroundColor: '#f5f5f5',
                fontSize: '64px'
              }}>
                {getFileIcon(resource.file_type)}
              </div>
            )}
          </div>
        }
      >
        {/* 资源标题 */}
        <h3 className="resource-card-title" style={{ margin: '0 0 8px', fontSize: '16px' }}>
          {resource.title}
        </h3>

        {/* 资源描述 */}
        <p className="resource-card-description" style={{ margin: '0 0 12px', color: '#666', fontSize: '14px' }}>
          {truncatedDescription}
        </p>

        {/* 标签列表 */}
        <div className="resource-card-tags" style={{ marginBottom: 12 }}>
          {resource.tags.slice(0, 3).map(tag => (
            <Tag key={tag.id}>{tag.name}</Tag>
          ))}
          {resource.tags.length > 3 && (
            <Tag>+{resource.tags.length - 3}</Tag>
          )}
        </div>

        {/* 元信息：日期和文件大小 */}
        <div className="resource-card-meta" style={{ display: 'flex', justifyContent: 'space-between', color: '#999', fontSize: '12px' }}>
          <span>{formatDate(resource.created_at)}</span>
          <span>{formatFileSize(resource.file_size)}</span>
        </div>
      </Card>
    </Link>
  );
};

export default ResourceCard;