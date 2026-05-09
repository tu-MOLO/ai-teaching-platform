import React, { useEffect, useMemo, useState } from 'react'
import { Empty, Input, Pagination, Spin, message } from 'antd'
import { FileOutlined, FileImageOutlined, FilePdfOutlined, SearchOutlined, UploadOutlined, VideoCameraOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getResources, type ResourceListItem } from '../../services/resource'
import { getTags } from '../../services/tag'
import { BusinessError } from '../../types/error'
import './index.css'

const { Search } = Input

type ResourceRow = {
  id: string
  name: string
  description: string
  type: 'image' | 'pdf' | 'doc' | 'video' | 'other'
  tags: string[]
  created_at: string
}

type TagFilterOption = {
  id: string
  name: string
}

const mapApiResourceToResource = (apiResource: ResourceListItem): ResourceRow => {
  const getType = (fileType: string): ResourceRow['type'] => {
    if (!fileType) return 'other'
    if (fileType.startsWith('image/')) return 'image'
    if (fileType === 'application/pdf') return 'pdf'
    if (fileType.includes('word') || fileType.includes('document')) return 'doc'
    if (fileType.startsWith('video/')) return 'video'
    return 'other'
  }

  return {
    id: apiResource?.id || '',
    name: apiResource?.name || '未命名资源',
    description: '',
    type: getType(apiResource?.file_type),
    tags: (apiResource?.tags || []).map((tag) => tag?.name || '').filter(Boolean),
    created_at: apiResource?.created_at ? apiResource.created_at.split('T')[0] : '',
  }
}

const ResourceCenter: React.FC = () => {
  const navigate = useNavigate()
  const [resources, setResources] = useState<ResourceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagOptions, setTagOptions] = useState<TagFilterOption[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(8)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true)
      try {
        const [resourceResponse, tagResponse] = await Promise.all([
          getResources({
            page: currentPage,
            page_size: pageSize,
            keyword: searchText || undefined,
            tag_ids: selectedTags.length > 0 ? selectedTags : undefined,
          }),
          getTags(),
        ])
        const items = resourceResponse?.data || []
        setResources(items.map(mapApiResourceToResource))
        setTotal(resourceResponse?.total || 0)
        setTagOptions((tagResponse || []).map((tag) => ({ id: tag.id, name: tag.name })))
      } catch (error) {
        if (!(error instanceof BusinessError && error.statusCode === 401)) {
          message.error('获取资源列表失败')
          console.error('Failed to fetch resources:', error)
        }
        setResources([])
        setTotal(0)
        setTagOptions([])
      } finally {
        setLoading(false)
      }
    }

    fetchResources()
  }, [currentPage, pageSize, searchText, selectedTags])

  const tags = useMemo(
    () => [{ id: 'all', name: '全部' }, ...tagOptions],
    [tagOptions]
  )

  const getFileIcon = (type: ResourceRow['type']) => {
    switch (type) {
      case 'image':
        return <FileImageOutlined />
      case 'pdf':
        return <FilePdfOutlined />
      case 'doc':
        return <FileOutlined />
      case 'video':
        return <VideoCameraOutlined />
      default:
        return <FileOutlined />
    }
  }

  return (
    <div className="resource-center">
      <div className="resource-header">
        <div className="resource-title-section">
          <h1 className="resource-title">资源中心</h1>
          <p className="resource-subtitle">管理和分享您的教学资源</p>
        </div>
        <button className="btn-upload" onClick={() => navigate('/resource-center/upload')}>
          <UploadOutlined />
          上传资源
        </button>
      </div>

      <div className="search-section">
        <div className="search-bar">
          <Search
            placeholder="搜索资源名称"
            allowClear
            enterButton={
              <>
                <SearchOutlined /> 搜索
              </>
            }
            size="large"
            onSearch={(value) => {
              setSearchText(value)
              setCurrentPage(1)
            }}
            onChange={(event) => {
              setSearchText(event.target.value)
              setCurrentPage(1)
            }}
            className="search-input-large"
          />
        </div>

        <div className="filter-section">
          <span className="filter-label">标签筛选：</span>
          <div className="tag-filter">
            {tags.map((tag) => (
              <button
                key={tag.id}
                className={`filter-tag ${
                  (tag.id === 'all' && selectedTags.length === 0) || selectedTags.includes(tag.id) ? 'active' : ''
                }`}
                onClick={() => {
                  if (tag.id === 'all') {
                    setSelectedTags([])
                  } else {
                    setSelectedTags((prev) =>
                      prev.includes(tag.id) ? prev.filter((item) => item !== tag.id) : [...prev, tag.id]
                    )
                  }
                  setCurrentPage(1)
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stats-item">
          <span className="stats-value">{resources.length}</span>
          <span className="stats-label">资源总数</span>
        </div>
        <div className="stats-item">
          <span className="stats-value">{tagOptions.length}</span>
          <span className="stats-label">标签数量</span>
        </div>
      </div>

      {loading ? (
        <div className="resource-loading">
          <Spin size="large" />
          <p>加载资源中...</p>
        </div>
      ) : resources.length > 0 ? (
        <>
          <div className="resource-grid">
            {resources.map((resource) => (
              <div key={resource.id} className="resource-card" onClick={() => navigate(`/resource-center/${resource.id}`)}>
                <div className="resource-card-cover">
                  <div className="resource-type-icon">{getFileIcon(resource.type)}</div>
                </div>
                <div className="resource-card-body">
                  <h3 className="resource-card-title">{resource.name}</h3>
                  <p className="resource-card-desc">{resource.description || '暂无描述'}</p>
                  <div className="resource-card-tags">
                    {(resource.tags || []).slice(0, 3).map((tag) => (
                      <span key={tag} className="resource-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="resource-card-footer">
                    <span className="resource-meta-item">{resource.created_at}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination-wrapper">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              onChange={(page) => setCurrentPage(page)}
              showSizeChanger={false}
              showQuickJumper
            />
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Empty description={<div className="empty-state-title">暂无资源</div>} />
        </div>
      )}
    </div>
  )
}

export default ResourceCenter
