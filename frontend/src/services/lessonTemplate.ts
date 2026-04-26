import api from './api';
import { toItem, toListResponse } from './response';

/**
 * 教案模板类型定义
 */
export interface LessonTemplate {
  id: string;
  name: string;
  description?: string;
  subject?: string;
  grade?: string;
  duration?: number;
  template_data?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 模板列表查询参数
 */
export interface LessonTemplateQueryParams {
  page?: number;
  page_size?: number;
}

/**
 * 模板列表响应
 */
export interface LessonTemplateListResponse {
  data: LessonTemplate[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

/**
 * 获取教案模板列表
 * @param params 查询参数
 */
export const getLessonTemplates = async (params?: LessonTemplateQueryParams): Promise<LessonTemplateListResponse> => {
  const response = await api.get('/lesson-templates', { params });
  return toListResponse<LessonTemplate>(response);
};

/**
 * 获取单个教案模板详情
 * @param id 模板ID
 */
export const getLessonTemplate = async (id: string): Promise<LessonTemplate> => {
  const response = await api.get(`/lesson-templates/${id}`);
  return toItem<LessonTemplate>(response);
};

export const lessonTemplateService = {
  getLessonTemplates,
  getLessonTemplate
};

export default lessonTemplateService;
