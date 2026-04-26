/**
 * API 通用响应类型定义
 */

/**
 * 标准API响应结构
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/**
 * 数据响应（单个对象）
 */
export interface DataResponse<T> {
  data: T;
}

/**
 * 列表响应（带分页）
 */
export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

/**
 * API错误响应
 */
export interface ApiError {
  code: number;
  message: string;
  details?: Record<string, string[]>;
}

/**
 * 排序参数
 */
export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * 通用查询参数（分页+排序+搜索）
 */
export interface QueryParams extends PaginationParams, SortParams {
  search?: string;
}

/**
 * HTTP状态码
 */
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

/**
 * API请求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * 请求配置选项
 */
export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  timeout?: number;
  withCredentials?: boolean;
}
