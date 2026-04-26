import api from './api';
import { toBlob, toItem, toListResponse } from './response';

/**
 * 学生类型定义
 */
export interface Student {
  id: string;
  name: string;
  gender: string;
  birth_date: string;
  grade: string;
  class_name: string;
  avatar?: string;
  parent_contact?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 学生列表响应
 */
export interface StudentListResponse {
  data: Student[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

/**
 * 学生列表查询参数
 */
export interface StudentQueryParams {
  page?: number;
  page_size?: number;
  keyword?: string;
  grade?: string;
  class_name?: string;
}

/**
 * 创建学生请求数据
 */
export interface CreateStudentData {
  name: string;
  gender: string;
  birth_date: string;
  grade: string;
  class_name: string;
  avatar?: string;
  parent_contact?: string;
}

/**
 * 更新学生请求数据
 */
export interface UpdateStudentData {
  name?: string;
  gender?: string;
  birth_date?: string;
  grade?: string;
  class_name?: string;
  avatar?: string;
  parent_contact?: string;
}

/**
 * 获取学生列表
 * @param params 查询参数
 */
const getStudents = async (params?: StudentQueryParams): Promise<StudentListResponse> => {
  const response = await api.get('/students', { params });
  return toListResponse<Student>(response);
};

/**
 * 获取单个学生详情
 * @param id 学生ID
 */
const getStudent = async (id: string): Promise<Student> => {
  const response = await api.get(`/students/${id}`);
  return toItem<Student>(response);
};

/**
 * 创建学生
 * @param data 学生数据
 */
const createStudent = async (data: CreateStudentData): Promise<Student> => {
  const response = await api.post('/students', data);
  return toItem<Student>(response);
};

/**
 * 更新学生
 * @param id 学生ID
 * @param data 更新数据
 */
const updateStudent = async (id: string, data: UpdateStudentData): Promise<Student> => {
  const response = await api.put(`/students/${id}`, data);
  return toItem<Student>(response);
};

/**
 * 删除学生
 * @param id 学生ID
 */
const deleteStudent = async (id: string): Promise<void> => {
  await api.delete(`/students/${id}`);
};

/**
 * 导出学生成长报告
 * @param id 学生ID
 */
const exportStudentPortfolio = async (id: string): Promise<Blob> => {
  const response = await api.get(`/students/${id}/export`, {
    responseType: 'blob'
  });
  return toBlob(response);
};

export const studentService = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  exportStudentPortfolio
};

export default studentService;
