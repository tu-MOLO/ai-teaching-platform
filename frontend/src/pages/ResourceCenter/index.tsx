import React, { useState, useEffect, useRef } from 'react';
import { Input, Pagination, message, Empty, Spin } from 'antd';
import {
  SearchOutlined,
  UploadOutlined,
  FileOutlined,
  EyeOutlined,
  DownloadOutlined,
  FolderOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  VideoCameraOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getResources, Resource as ApiResource } from '../../services/resource';
import './index.css';

const { Search } = Input;

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'pdf' | 'doc' | 'video' | 'other';
  tags: string[];
  views: number;
  downloads: number;
  created_at: string;
}

// 将API资源类型转换为前端展示类型
const mapApiResourceToResource = (apiResource: ApiResource): Resource => {
  // 根据file_type映射到type
  const getType = (fileType: string): Resource['type'] => {
    if (!fileType) return 'other';
    if (fileType.startsWith('image/')) return 'image';
    if (fileType === 'application/pdf') return 'pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'doc';
    if (fileType.startsWith('video/')) return 'video';
    return 'other';
  };

  return {
    id: apiResource.id,
    title: apiResource.title || apiResource.name, // 优先使用title，兼容name字段
    description: apiResource.description || '',
    type: getType(apiResource.file_type),
    tags: (apiResource.tags || []).map(tag => tag.name),
    views: apiResource.views || 0,
    downloads: apiResource.downloads || 0,
    created_at: apiResource.created_at ? apiResource.created_at.split('T')[0] : '', // 取日期部分
  };
};

const ResourceCenter: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const navigate = useNavigate();
  const isFetched = useRef(false);

  const tags = ['全部', '教案', '视频', '图片', '文档', '模板', '培智教育', '生活技能', '认知训练'];

  // 获取资源列表
  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await getResources({});
      // 响应拦截器已提取 data 字段，response 直接是数组
      const items = response.data || [];
      const mappedResources = items.map(mapApiResourceToResource);
      setResources(mappedResources);
    } catch (error) {
      message.error('获取资源列表失败');
      console.error('Failed to fetch resources:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 防止 React.StrictMode 导致的双重请求
    if (!isFetched.current) {
      isFetched.current = true;
      fetchResources();
    }
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setCurrentPage(1);
  };

  const handleTagChange = (tag: string) => {
    if (tag === '全部') {
      setSelectedTags([]);
    } else {
      const newSelectedTags = selectedTags.includes(tag)
        ? selectedTags.filter(t => t !== tag)
        : [...selectedTags, tag];
      setSelectedTags(newSelectedTags);
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleUpload = () => {
    navigate('/resource-center/upload');
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <FileImageOutlined />;
      case 'pdf':
        return <FilePdfOutlined />;
      case 'doc':
        return <FileWordOutlined />;
      case 'video':
        return <VideoCameraOutlined />;
      default:
        return <FileOutlined />;
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => resource.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const pageSize = 8;
  const total = filteredResources.length;
  const paginatedResources = filteredResources.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="resource-center">
      {/* 页面头部 */}
      <div className="resource-header">
        <div className="resource-title-section">
          <h1 className="resource-title">资源中心</h1>
          <p className="resource-subtitle">管理和分享您的教学资源</p>
        </div>
        <button className="btn-upload" onClick={handleUpload}>
          <UploadOutlined />
          上传资源
        </button>
      </div>

      {/* 搜索和筛选区域 */}
      <div className="search-section">
        <div className="search-bar">
          <Search
            placeholder="搜索资源标题或描述..."
            allowClear
            enterButton={<><SearchOutlined /> 搜索</>}
            size="large"
            onSearch={handleSearch}
            className="search-input-large"
          />
        </div>

        <div className="filter-section">
          <span className="filter-label">标签筛选：</span>
          <div className="tag-filter">
            {tags.map(tag => (
              <button
                key={tag}
                className={`filter-tag ${(tag === '全部' && selectedTags.length === 0) || selectedTags.includes(tag) ? 'active' : ''}`}
                onClick={() => handleTagChange(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="stats-bar">
        <div className="stats-item">
          <span className="stats-value">{resources.length}</span>
          <span className="stats-label">资源总数</span>
        </div>
        <div className="stats-item">
          <span className="stats-value">
            {resources.reduce((sum, r) => sum + r.downloads, 0)}
          </span>
          <span className="stats-label">总下载</span>
        </div>
        <div className="stats-item">
          <span className="stats-value">
            {resources.reduce((sum, r) => sum + r.views, 0)}
          </span>
          <span className="stats-label">总浏览</span>
        </div>
      </div>

      {/* 资源列表 */}
      {loading ? (
        <div className="resource-loading">
          <Spin size="large" />
          <p>加载资源中...</p>
        </div>
      ) : paginatedResources.length > 0 ? (
        <>
          <div className="resource-grid">
            {paginatedResources.map(resource => (
              <div key={resource.id} className="resource-card" onClick={() => navigate(`/resource-center/${resource.id}`)}>
                <div className="resource-card-cover">
                  <div className="resource-type-icon">
                    {getFileIcon(resource.type)}
                  </div>
                </div>
                <div className="resource-card-body">
                  <h3 className="resource-card-title">{resource.title}</h3>
                  <p className="resource-card-desc">{resource.description}</p>
                  <div className="resource-card-tags">
                    {resource.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="resource-tag">{tag}</span>
                    ))}
                  </div>
                  <div className="resource-card-footer">
                    <div className="resource-meta">
                      <span className="resource-meta-item">
                        <EyeOutlined /> {resource.views}
                      </span>
                      <span className="resource-meta-item">
                        <DownloadOutlined /> {resource.downloads}
                      </span>
                    </div>
                    <span className="resource-meta-item">
                      {resource.created_at}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          <div className="pagination-wrapper">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              onChange={handlePageChange}
              showSizeChanger={false}
              showQuickJumper
            />
          </div>
        </>
      ) : (
        <Empty
          image={<FolderOutlined style={{ fontSize: 64, color: 'var(--color-text-tertiary)' }} />}
          description={
            <div className="empty-state">
              <div className="empty-state-title">暂无资源</div>
              <div className="empty-state-desc">点击上方按钮上传您的第一个资源</div>
            </div>
          }
        />
      )}
    </div>
  );
};

export default ResourceCenter;
