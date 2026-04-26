/**
 * TagFilter 组件
 *
 * 用于资源中心的标签筛选功能，支持搜索、分组、排序和清空选择等操作。
 *
 * @component
 * @example
 * ```tsx
 * const [selectedTags, setSelectedTags] = useState<string[]>([]);
 *
 * <TagFilter
 *   tags={[
 *     { id: '1', name: 'JavaScript', category: '编程语言', usageCount: 100 },
 *     { id: '2', name: 'React', category: '框架', usageCount: 80 },
 *   ]}
 *   selectedTags={selectedTags}
 *   onTagChange={(tagId) => {
 *     setSelectedTags(prev =>
 *       prev.includes(tagId)
 *         ? prev.filter(id => id !== tagId)
 *         : [...prev, tagId]
 *     );
 *   }}
 *   onClear={() => setSelectedTags([])}
 * />
 * ```
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Tag, Input, Button, Badge, Collapse, Select, Space, Typography, Empty, Tooltip } from 'antd';
import { SearchOutlined, ClearOutlined, TagOutlined } from '@ant-design/icons';
import type { Tag as TagType } from '../../services/tag';

const { Search } = Input;
const { Panel } = Collapse;
const { Option } = Select;
const { Text } = Typography;

/**
 * 扩展的标签类型，包含可选的category和usageCount字段
 */
export interface ExtendedTag extends TagType {
  /** 标签类别，用于分组显示 */
  category?: string;
  /** 标签使用频率，用于排序 */
  usageCount?: number;
}

/**
 * 排序方式枚举
 */
type SortType = 'name' | 'usage';

export interface TagFilterProps {
  /** 标签列表数据 */
  tags: ExtendedTag[];
  /** 当前已选中的标签ID列表 */
  selectedTags: string[];
  /** 标签选择变化时的回调函数 */
  onTagChange: (tagId: string) => void;
  /** 清空所有选择时的回调函数（可选） */
  onClear?: () => void;
  /** 是否显示分组折叠面板，默认为true */
  showGroupCollapse?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 标签筛选组件
 *
 * 提供标签搜索、分组显示、排序和清空选择等功能
 */
const TagFilter: React.FC<TagFilterProps> = ({
  tags,
  selectedTags,
  onTagChange,
  onClear,
  showGroupCollapse = true,
  className = '',
}) => {
  // 搜索关键词状态
  const [searchText, setSearchText] = useState('');
  // 排序方式状态
  const [sortType, setSortType] = useState<SortType>('name');

  /**
   * 处理标签点击事件
   */
  const handleTagClick = useCallback(
    (tagId: string) => {
      onTagChange(tagId);
    },
    [onTagChange]
  );

  /**
   * 处理清空选择
   */
  const handleClear = useCallback(() => {
    onClear?.();
  }, [onClear]);

  /**
   * 处理搜索输入变化
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  /**
   * 处理搜索
   */
  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
  }, []);

  /**
   * 处理排序方式变化
   */
  const handleSortChange = useCallback((value: SortType) => {
    setSortType(value);
  }, []);

  /**
   * 获取标签的分组键
   */
  const getTagCategory = useCallback((tag: ExtendedTag): string => {
    return tag.category || '未分类';
  }, []);

  /**
   * 根据搜索和排序条件过滤并排序标签
   */
  const processedTags = useMemo(() => {
    let result = [...tags];

    // 搜索过滤
    if (searchText.trim()) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(
        (tag) =>
          tag.name.toLowerCase().includes(lowerSearch) ||
          (tag.description && tag.description.toLowerCase().includes(lowerSearch))
      );
    }

    // 排序
    result.sort((a, b) => {
      if (sortType === 'name') {
        return a.name.localeCompare(b.name, 'zh-CN');
      } else if (sortType === 'usage') {
        const countA = a.usageCount || 0;
        const countB = b.usageCount || 0;
        return countB - countA; // 降序排列，使用频率高的在前
      }
      return 0;
    });

    return result;
  }, [tags, searchText, sortType]);

  /**
   * 按类别分组标签
   */
  const groupedTags = useMemo(() => {
    const groups: Record<string, ExtendedTag[]> = {};

    processedTags.forEach((tag) => {
      const category = getTagCategory(tag);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(tag);
    });

    // 按类别名称排序
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'zh-CN'));
  }, [processedTags, getTagCategory]);

  /**
   * 获取已选标签的详细信息
   */
  const selectedTagDetails = useMemo(() => {
    return tags.filter((tag) => selectedTags.includes(tag.id));
  }, [tags, selectedTags]);

  /**
   * 渲染单个标签
   */
  const renderTag = useCallback(
    (tag: ExtendedTag) => {
      const isSelected = selectedTags.includes(tag.id);
      const usageCount = tag.usageCount;

      return (
        <Tooltip
          key={tag.id}
          title={
            <div>
              <div>{tag.name}</div>
              {tag.description && (
                <div style={{ fontSize: '12px', opacity: 0.8 }}>{tag.description}</div>
              )}
              {usageCount !== undefined && (
                <div style={{ fontSize: '12px', opacity: 0.8 }}>使用次数: {usageCount}</div>
              )}
            </div>
          }
        >
          <Tag
            color={isSelected ? 'blue' : 'default'}
            onClick={() => handleTagClick(tag.id)}
            style={{
              cursor: 'pointer',
              padding: '4px 12px',
              fontSize: '14px',
              margin: '4px',
              transition: 'all 0.3s ease',
              border: isSelected ? '1px solid #1890ff' : '1px solid #d9d9d9',
              backgroundColor: isSelected ? '#e6f7ff' : undefined,
            }}
            className={`tag-filter-item ${isSelected ? 'tag-filter-item-selected' : ''}`}
          >
            <Space size={4}>
              {isSelected && <TagOutlined />}
              <span>{tag.name}</span>
              {usageCount !== undefined && !isSelected && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  ({usageCount})
                </Text>
              )}
            </Space>
          </Tag>
        </Tooltip>
      );
    },
    [selectedTags, handleTagClick]
  );

  /**
   * 渲染分组标签列表
   */
  const renderGroupedTags = useCallback(() => {
    if (groupedTags.length === 0) {
      return (
        <Empty
          description="暂无匹配的标签"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: '20px 0' }}
        />
      );
    }

    if (!showGroupCollapse) {
      return (
        <div style={{ padding: '8px 0' }}>
          {processedTags.map(renderTag)}
        </div>
      );
    }

    return (
      <Collapse
        defaultActiveKey={groupedTags.map(([category]) => category)}
        ghost
        style={{ backgroundColor: 'transparent' }}
      >
        {groupedTags.map(([category, categoryTags]) => (
          <Panel
            key={category}
            header={
              <Space>
                <Text strong>{category}</Text>
                <Badge
                  count={categoryTags.length}
                  style={{ backgroundColor: '#52c41a' }}
                />
              </Space>
            }
            style={{ marginBottom: '8px' }}
          >
            <div style={{ padding: '4px 0' }}>
              {categoryTags.map(renderTag)}
            </div>
          </Panel>
        ))}
      </Collapse>
    );
  }, [groupedTags, processedTags, renderTag, showGroupCollapse]);

  return (
    <div
      className={`tag-filter ${className}`}
      style={{
        backgroundColor: '#fafafa',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #f0f0f0',
      }}
    >
      {/* 头部工具栏 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e8e8e8',
        }}
      >
        {/* 搜索框 */}
        <Search
          placeholder="搜索标签名称..."
          value={searchText}
          onChange={handleSearchChange}
          onSearch={handleSearch}
          allowClear
          style={{ flex: 1, minWidth: '200px', maxWidth: '300px' }}
          prefix={<SearchOutlined />}
        />

        {/* 排序选择器 */}
        <Select
          value={sortType}
          onChange={handleSortChange}
          style={{ width: '140px' }}
          placeholder="排序方式"
        >
          <Option value="name">
            <Space>
              <TagOutlined />
              名称排序
            </Space>
          </Option>
          <Option value="usage">
            <Space>
              <TagOutlined />
              使用频率
            </Space>
          </Option>
        </Select>

        {/* 清空选择按钮 */}
        {selectedTags.length > 0 && (
          <Badge count={selectedTags.length} offset={[0, 0]}>
            <Button
              icon={<ClearOutlined />}
              onClick={handleClear}
              danger
              size="middle"
            >
              清空选择
            </Button>
          </Badge>
        )}
      </div>

      {/* 已选标签展示 */}
      {selectedTagDetails.length > 0 && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#e6f7ff',
            borderRadius: '6px',
            border: '1px solid #91d5ff',
          }}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
            已选标签 ({selectedTagDetails.length}):
          </Text>
          <Space size={[8, 8]} wrap>
            {selectedTagDetails.map((tag) => (
              <Tag
                key={tag.id}
                color="blue"
                closable
                onClose={() => handleTagClick(tag.id)}
                style={{ padding: '4px 8px' }}
              >
                {tag.name}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* 标签列表 */}
      <div className="tag-filter-list">
        {renderGroupedTags()}
      </div>

      {/* 统计信息 */}
      <div
        style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text type="secondary" style={{ fontSize: '12px' }}>
          共 {tags.length} 个标签
          {searchText && `，搜索到 ${processedTags.length} 个`}
        </Text>
        {selectedTags.length > 0 && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            已选择 {selectedTags.length} 个标签
          </Text>
        )}
      </div>
    </div>
  );
};

export default TagFilter;
