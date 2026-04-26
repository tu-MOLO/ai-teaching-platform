/**
 * ResourcePreview 组件
 *
 * 用于预览各种类型资源的组件，支持图片、视频、音频、PDF、Office文档等格式。
 *
 * @component
 * @example
 * ```tsx
 * import ResourcePreview from './components/ResourceCenter/ResourcePreview';
 * import { Resource } from '../../services/resource';
 *
 * const resource: Resource = {
 *   id: '1',
 *   title: '示例图片.jpg',
 *   description: '这是一个示例图片',
 *   description_html: '<p>这是一个示例图片</p>',
 *   file_url: 'https://example.com/image.jpg',
 *   preview_url: 'https://example.com/image_preview.jpg',
 *   file_type: 'image/jpeg',
 *   file_size: 1024000,
 *   tags: [],
 *   created_at: '2024-01-01T00:00:00Z',
 *   updated_at: '2024-01-01T00:00:00Z'
 * };
 *
 * <ResourcePreview resource={resource} />
 * ```
 *
 * @interface ResourcePreviewProps
 * @property {Resource} resource - 资源对象，包含文件的元数据和访问URL
 *
 * 支持的文件类型：
 * - 图片: JPEG, PNG, GIF, SVG, WebP
 * - 视频: MP4, WebM, OGG 等
 * - 音频: MP3, WAV, OGG 等
 * - 文档: PDF (显示下载提示)
 * - Office: Word, Excel, PPT (显示下载提示)
 * - 其他: 显示通用下载提示
 */

import React, { useState, useCallback } from 'react';
import {
  Descriptions,
  Button,
  Space,
  Empty,
  Tooltip,
  message
} from 'antd';
import {
  DownloadOutlined,
  FullscreenOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { Resource } from '../../services/resource';

export interface ResourcePreviewProps {
  resource: Resource;
}

/**
 * 格式化文件大小
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的文件大小字符串
 */
const formatFileSize = (bytes?: number): string => {
  if (bytes === undefined || bytes === null) return '未知';
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
};

/**
 * 格式化日期时间
 * @param dateString - ISO 8601 格式的日期字符串
 * @returns 格式化后的日期时间字符串
 */
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * 获取文件类型显示名称
 * @param fileType - MIME 类型或文件扩展名
 * @returns 用户友好的文件类型名称
 */
const getFileTypeDisplay = (fileType: string): string => {
  if (fileType.includes('image')) return '图片文件';
  if (fileType.includes('video')) return '视频文件';
  if (fileType.includes('audio')) return '音频文件';
  if (fileType.includes('pdf')) return 'PDF 文档';
  if (fileType.includes('word') || fileType.includes('msword') || fileType.includes('officedocument.wordprocessingml')) return 'Word 文档';
  if (fileType.includes('excel') || fileType.includes('spreadsheetml')) return 'Excel 表格';
  if (fileType.includes('powerpoint') || fileType.includes('presentationml')) return 'PowerPoint 演示文稿';
  return '其他文件';
};

/**
 * 获取文件类型图标
 * @param fileType - MIME 类型或文件扩展名
 * @returns 对应的 Ant Design 图标组件
 */
const getFileIcon = (fileType: string) => {
  if (fileType.includes('image')) return <FileImageOutlined />;
  if (fileType.includes('pdf')) return <FilePdfOutlined />;
  if (fileType.includes('word') || fileType.includes('msword') || fileType.includes('officedocument.wordprocessingml')) return <FileWordOutlined />;
  if (fileType.includes('excel') || fileType.includes('spreadsheetml')) return <FileExcelOutlined />;
  if (fileType.includes('powerpoint') || fileType.includes('presentationml')) return <FilePptOutlined />;
  return <FileOutlined />;
};

const ResourcePreview: React.FC<ResourcePreviewProps> = ({ resource }) => {
  const [imageScale, setImageScale] = useState<number>(1);
  const [previewError, setPreviewError] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const fileType = resource.file_type;
  const isImage = fileType.includes('image');
  const isVideo = fileType.includes('video');
  const isAudio = fileType.includes('audio');
  const isPdf = fileType.includes('pdf');
  const isOffice = fileType.includes('word') || fileType.includes('excel') || fileType.includes('powerpoint') ||
                   fileType.includes('msword') || fileType.includes('spreadsheetml') || fileType.includes('presentationml');

  /**
   * 处理下载按钮点击
   */
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = resource.file_url;
    link.download = resource.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('开始下载文件');
  }, [resource.file_url, resource.title]);

  /**
   * 处理图片缩放
   * @param delta - 缩放增量（正数为放大，负数为缩小）
   */
  const handleZoom = useCallback((delta: number) => {
    setImageScale(prev => {
      const newScale = prev + delta;
      return Math.max(0.5, Math.min(3, newScale));
    });
  }, []);

  /**
   * 重置图片缩放
   */
  const handleResetZoom = useCallback(() => {
    setImageScale(1);
  }, []);

  /**
   * 切换全屏预览
   */
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  /**
   * 处理预览错误
   */
  const handlePreviewError = useCallback(() => {
    setPreviewError(true);
  }, []);

  /**
   * 重试预览
   */
  const handleRetry = useCallback(() => {
    setPreviewError(false);
  }, []);

  /**
   * 渲染图片预览（支持 JPEG, PNG, GIF, SVG, WebP）
   */
  const renderImagePreview = () => {
    if (previewError) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" align="center">
              <span>图片加载失败</span>
              <Button type="primary" icon={<ReloadOutlined />} onClick={handleRetry}>
                重试
              </Button>
            </Space>
          }
        />
      );
    }

    // 图片类型检测（保留以供将来使用）
    // const isSvg = fileType.includes('svg');
    // const isGif = fileType.includes('gif');
    // const isWebp = fileType.includes('webp');

    return (
      <div
        style={{
          width: '100%',
          height: isFullscreen ? '100vh' : '500px',
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isFullscreen ? '#000' : '#fafafa'
        }}
      >
        <img
          src={resource.preview_url || resource.file_url}
          alt={resource.title}
          onError={handlePreviewError}
          style={{
            maxWidth: '100%',
            maxHeight: isFullscreen ? '100%' : '100%',
            objectFit: 'contain',
            transform: `scale(${imageScale})`,
            transition: 'transform 0.2s ease',
            cursor: isFullscreen ? 'zoom-out' : 'default'
          }}
          onClick={isFullscreen ? toggleFullscreen : undefined}
        />
      </div>
    );
  };

  /**
   * 渲染视频预览
   */
  const renderVideoPreview = () => {
    if (previewError) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" align="center">
              <span>视频加载失败</span>
              <Button type="primary" icon={<ReloadOutlined />} onClick={handleRetry}>
                重试
              </Button>
            </Space>
          }
        />
      );
    }

    return (
      <video
        src={resource.file_url}
        controls
        onError={handlePreviewError}
        style={{ width: '100%', maxHeight: '500px' }}
      >
        您的浏览器不支持视频播放
      </video>
    );
  };

  /**
   * 渲染音频预览
   */
  const renderAudioPreview = () => {
    if (previewError) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" align="center">
              <span>音频加载失败</span>
              <Button type="primary" icon={<ReloadOutlined />} onClick={handleRetry}>
                重试
              </Button>
            </Space>
          }
        />
      );
    }

    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <audio
          src={resource.file_url}
          controls
          onError={handlePreviewError}
          style={{ width: '100%' }}
        >
          您的浏览器不支持音频播放
        </audio>
      </div>
    );
  };

  /**
   * 渲染PDF预览提示
   */
  const renderPdfPreview = () => (
    <Empty
      image={<FilePdfOutlined style={{ fontSize: 64, color: '#ff4d4f' }} />}
      description={
        <Space direction="vertical" align="center">
          <span style={{ fontSize: 16, fontWeight: 500 }}>PDF 文档</span>
          <span style={{ color: '#999' }}>PDF 文件需要下载后查看</span>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
            下载查看
          </Button>
        </Space>
      }
    />
  );

  /**
   * 渲染Office文档预览提示
   */
  const renderOfficePreview = () => {
    const icon = getFileIcon(fileType);
    const typeName = getFileTypeDisplay(fileType);

    return (
      <Empty
        image={React.cloneElement(icon as React.ReactElement, { style: { fontSize: 64, color: '#1890ff' } })}
        description={
          <Space direction="vertical" align="center">
            <span style={{ fontSize: 16, fontWeight: 500 }}>{typeName}</span>
            <span style={{ color: '#999' }}>Office 文档需要下载后查看</span>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
              下载查看
            </Button>
          </Space>
        }
      />
    );
  };

  /**
   * 渲染默认预览（通用文件类型）
   */
  const renderDefaultPreview = () => (
    <Empty
      image={<FileOutlined style={{ fontSize: 64, color: '#999' }} />}
      description={
        <Space direction="vertical" align="center">
          <span style={{ fontSize: 16, fontWeight: 500 }}>文件预览</span>
          <span style={{ color: '#999' }}>该类型文件暂不支持在线预览</span>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
            下载查看
          </Button>
        </Space>
      }
    />
  );

  /**
   * 根据文件类型渲染对应的预览内容
   */
  const renderPreview = () => {
    if (isImage) return renderImagePreview();
    if (isVideo) return renderVideoPreview();
    if (isAudio) return renderAudioPreview();
    if (isPdf) return renderPdfPreview();
    if (isOffice) return renderOfficePreview();
    return renderDefaultPreview();
  };

  /**
   * 渲染预览工具栏
   */
  const renderToolbar = () => {
    const buttons = [];

    // 下载按钮（所有类型都显示）
    buttons.push(
      <Tooltip title="下载文件" key="download">
        <Button icon={<DownloadOutlined />} onClick={handleDownload}>
          下载
        </Button>
      </Tooltip>
    );

    // 图片类型特有的工具栏按钮
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
        <Tooltip title={isFullscreen ? "退出全屏" : "全屏预览"} key="fullscreen">
          <Button icon={<FullscreenOutlined />} onClick={toggleFullscreen}>
            {isFullscreen ? '退出全屏' : '全屏'}
          </Button>
        </Tooltip>
      );
    }

    // PDF 全屏按钮
    if (isPdf) {
      buttons.push(
        <Tooltip title="在新窗口打开" key="open-new">
          <Button icon={<FullscreenOutlined />} onClick={() => window.open(resource.file_url, '_blank')}>
            新窗口打开
          </Button>
        </Tooltip>
      );
    }

    return (
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: '#fafafa',
          borderTop: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Space>{buttons}</Space>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
      {/* 文件信息栏 */}
      <div style={{ padding: '16px', borderBottom: '1px solid #e8e8e8', backgroundColor: '#fafafa' }}>
        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="文件名">{resource.title}</Descriptions.Item>
          <Descriptions.Item label="文件大小">{formatFileSize(resource.file_size)}</Descriptions.Item>
          <Descriptions.Item label="文件类型">{getFileTypeDisplay(fileType)}</Descriptions.Item>
          <Descriptions.Item label="上传时间">{formatDateTime(resource.created_at)}</Descriptions.Item>
          {resource.tags && resource.tags.length > 0 && (
            <Descriptions.Item label="标签">
              {resource.tags.map(tag => tag.name).join(', ')}
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>

      {/* 预览区域 */}
      <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '300px' }}>
        {renderPreview()}
      </div>

      {/* 预览工具栏 */}
      {renderToolbar()}
    </div>
  );
};

export default ResourcePreview;
