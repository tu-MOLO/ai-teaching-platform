import api from './api';
import { toItem, toListResponse } from './response';
import type { Resource, ResourceListItem, ResourceQueryParams, ResourceListResponse } from '@/types/resource';

export type { Resource, ResourceListItem, ResourceQueryParams, ResourceListResponse } from '@/types/resource';

export const fetchResourceFileBlob = async (resourceId: string): Promise<Blob> => {
  const response = await api.get(`/resources/${resourceId}/file`, {
    responseType: 'blob',
  });
  return response as unknown as Blob;
};

export const extractResourceIdFromFileUrl = (fileUrl?: string | null): string | null => {
  if (!fileUrl) {
    return null;
  }

  const match = fileUrl.match(/\/resources\/([^/]+)\/file(?:\?|$)/);
  return match?.[1] || null;
};

/**
 * 获取资源列表
 * @param params 查询参数
 */
export const getResources = async (params?: ResourceQueryParams): Promise<ResourceListResponse> => {
  const response = await api.get('/resources', { params });
  return toListResponse<ResourceListItem>(response);
};

/**
 * 获取单个资源详情
 * @param id 资源ID
 */
export const getResource = async (id: string): Promise<Resource> => {
  const response = await api.get(`/resources/${id}`);
  return toItem<Resource>(response);
};

/**
 * 上传资源
 * @param data FormData数据
 */
export const uploadResource = async (data: FormData): Promise<Resource> => {
  const response = await api.post('/resources', data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return toItem<Resource>(response);
};

/**
 * 更新资源
 * @param id 资源ID
 * @param data 更新数据
 */
export const updateResource = async (id: string, data: { name?: string; description?: string; tag_ids?: string[] }): Promise<Resource> => {
  const response = await api.put(`/resources/${id}`, data);
  return toItem<Resource>(response);
};

/**
 * 删除资源
 * @param id 资源ID
 */
export const deleteResource = async (id: string): Promise<void> => {
  await api.delete(`/resources/${id}`);
};

/**
 * 导出资源服务
 */
export const resourceService = {
  getResources,
  getResource,
  uploadResource,
  updateResource,
  deleteResource
};

export default resourceService;
