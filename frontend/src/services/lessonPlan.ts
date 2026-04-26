import api from './api';
import type { LessonPlanFormData } from '../types/forms';
import { toItem, toListResponse } from './response';

/**
 * 教案类型定义
 */
export interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  grade: string;
  duration: number;
  teaching_objectives?: string;
  teaching_content?: string;
  teaching_methods?: string;
  teaching_process?: string;
  teaching_resources?: string;
  notes?: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at?: string;
}

/**
 * 教案列表查询参数
 */
export interface LessonPlanQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  subject?: string;
  grade?: string;
  status?: string;
}

/**
 * 教案列表响应
 */
export interface LessonPlanListResponse {
  data: LessonPlan[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

/**
 * 获取教案列表
 * @param params 查询参数
 */
export const getLessonPlans = async (params?: LessonPlanQueryParams): Promise<LessonPlanListResponse> => {
  // 将前端的 status 参数映射为后端期望的 status_filter
  const apiParams: any = { ...params };
  if (apiParams.status) {
    apiParams.status_filter = apiParams.status;
    delete apiParams.status;
  }
  const response = await api.get('/lesson-plans', { params: apiParams });
  return toListResponse<LessonPlan>(response);
};

/**
 * 获取单个教案详情
 * @param id 教案ID
 */
export const getLessonPlan = async (id: string): Promise<LessonPlan> => {
  const response = await api.get(`/lesson-plans/${id}`);
  return toItem<LessonPlan>(response);
};

/**
 * 创建教案
 * @param data 教案数据
 * @param status 教案状态 (draft/published)
 */
export const createLessonPlan = async (
  data: LessonPlanFormData,
  status?: 'draft' | 'published'
): Promise<LessonPlan> => {
  const requestData = status ? { ...data, status } : data;
  const response = await api.post('/lesson-plans', requestData);
  return toItem<LessonPlan>(response);
};

/**
 * 更新教案
 * @param id 教案ID
 * @param data 更新数据
 * @param status 教案状态 (draft/published/archived)
 */
export const updateLessonPlan = async (
  id: string,
  data: Partial<LessonPlanFormData>,
  status?: 'draft' | 'published' | 'archived'
): Promise<LessonPlan> => {
  const requestData = status ? { ...data, status } : data;
  const response = await api.put(`/lesson-plans/${id}`, requestData);
  return toItem<LessonPlan>(response);
};

/**
 * 删除教案
 * @param id 教案ID
 */
export const deleteLessonPlan = async (id: string): Promise<void> => {
  await api.delete(`/lesson-plans/${id}`);
};

/**
 * 发布教案
 * @param id 教案ID
 */
export const publishLessonPlan = async (id: string): Promise<LessonPlan> => {
  const response = await api.post(`/lesson-plans/${id}/publish`);
  return toItem<LessonPlan>(response);
};

/**
 * 取消发布教案
 * @param id 教案ID
 */
export const unpublishLessonPlan = async (id: string): Promise<LessonPlan> => {
  const response = await api.post(`/lesson-plans/${id}/unpublish`);
  return toItem<LessonPlan>(response);
};

/**
 * 归档教案
 * @param id 教案ID
 */
export const archiveLessonPlan = async (id: string): Promise<LessonPlan> => {
  const response = await api.post(`/lesson-plans/${id}/archive`);
  return toItem<LessonPlan>(response);
};

/**
 * 恢复教案
 * @param id 教案ID
 */
export const restoreLessonPlan = async (id: string): Promise<LessonPlan> => {
  const response = await api.post(`/lesson-plans/${id}/restore`);
  return toItem<LessonPlan>(response);
};

/**
 * 获取月度教案统计
 * @param year 年份
 * @param month 月份
 */
export const getMonthlyStats = async (year?: number, month?: number): Promise<{
  year: number;
  month: number;
  monthly_count: number;
  draft_count: number;
}> => {
  const params: { year?: number; month?: number } = {};
  if (year) params.year = year;
  if (month) params.month = month;
  const response = await api.get('/lesson-plans/stats/monthly', { params });
  return toItem<{ year: number; month: number; monthly_count: number; draft_count: number }>(response);
};
