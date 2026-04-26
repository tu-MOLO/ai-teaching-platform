import api from './api';
import { toItem, toListResponse } from './response';

/**
 * 课程类型定义
 */
export interface Course {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacher: string;
  schedule?: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft';
  created_at: string;
  updated_at: string;
}

/**
 * 创建课程请求数据
 */
export interface CreateCourseData {
  name: string;
  subject: string;
  grade: string;
  teacher: string;
  schedule?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'draft';
}

/**
 * 更新课程请求数据
 */
export interface UpdateCourseData {
  name?: string;
  subject?: string;
  grade?: string;
  teacher?: string;
  schedule?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'draft';
}

/**
 * 课程列表查询参数
 */
export interface CourseQueryParams {
  page?: number;
  page_size?: number;
  keyword?: string;
  subject?: string;
  grade?: string;
  status?: string;
}

/**
 * 课程列表响应
 */
export interface CourseListResponse {
  data: Course[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

/**
 * 获取课程列表
 * @param params 查询参数
 */
export const getCourses = async (params?: CourseQueryParams): Promise<CourseListResponse> => {
  const response = await api.get('/courses', { params });
  return toListResponse<Course>(response);
};

/**
 * 获取单个课程详情
 * @param id 课程ID
 */
export const getCourse = async (id: string): Promise<Course> => {
  const response = await api.get(`/courses/${id}`);
  return toItem<Course>(response);
};

/**
 * 创建课程
 * @param data 课程数据
 */
export const createCourse = async (data: CreateCourseData): Promise<Course> => {
  const response = await api.post('/courses', data);
  return toItem<Course>(response);
};

/**
 * 更新课程
 * @param id 课程ID
 * @param data 更新数据
 */
export const updateCourse = async (id: string, data: UpdateCourseData): Promise<Course> => {
  const response = await api.put(`/courses/${id}`, data);
  return toItem<Course>(response);
};

/**
 * 删除课程
 * @param id 课程ID
 */
export const deleteCourse = async (id: string): Promise<void> => {
  await api.delete(`/courses/${id}`);
};
