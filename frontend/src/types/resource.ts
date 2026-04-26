/**
 * 资源标签类型定义
 */
export interface ResourceTag {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

/**
 * 资源文件类型
 */
export type ResourceFileType = 'image' | 'pdf' | 'doc' | 'video' | 'other';

/**
 * 资源类型定义 - 与后端 ResourceResponse 对齐
 */
export interface Resource {
  id: string;
  name: string;
  description?: string;
  file_name: string;
  file_size: number;
  file_type: string;
  user_id: string;
  tags: ResourceTag[];
  file_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 资源列表项（简化版，用于列表展示）- 与后端 ResourceListResponse 对齐
 */
export interface ResourceListItem {
  id: string;
  name: string;
  file_name: string;
  file_size: number;
  file_type: string;
  user_id: string;
  tags: ResourceTag[];
  created_at: string;
}

/**
 * 资源创建请求数据 - 与后端 ResourceCreate 对齐
 */
export interface ResourceCreateData {
  name: string;
  description?: string;
  tag_ids?: string[];
  file: File;
}

/**
 * 资源更新请求数据 - 与后端 ResourceUpdate 对齐
 */
export interface ResourceUpdateData {
  name?: string;
  description?: string;
  tag_ids?: string[];
}

/**
 * 资源查询参数 - 与后端 ResourceSearchParams 对齐
 */
export interface ResourceQueryParams {
  page?: number;
  page_size?: number;
  keyword?: string;
  tag_ids?: string[];
  file_type?: string;
}

/**
 * 资源列表响应 - 与后端 ListResponse 对齐
 */
export interface ResourceListResponse {
  data: ResourceListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

/**
 * 资源筛选状态
 */
export interface ResourceFilterState {
  searchText: string;
  selectedTags: string[];
  selectedType: ResourceFileType | null;
  currentPage: number;
  pageSize: number;
}
