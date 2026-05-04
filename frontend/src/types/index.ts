/**
 * 类型定义统一导出文件
 * 所有类型定义都从此文件导入
 */

// API相关类型
export type {
  ApiResponse,
  DataResponse,
  ListResponse,
  PaginationParams,
  ApiError,
  SortParams,
  QueryParams,
  RequestConfig,
} from './api';
export { HttpStatus } from './api';
export type { HttpMethod } from './api';

// 错误相关类型
export {
  ErrorCode,
  ErrorMessages,
  BusinessError,
  getErrorMessage,
  HttpStatusErrorMap,
  getHttpErrorMessage,
} from './error';
export type {
  ApiErrorResponse,
  ValidationErrorResponse,
} from './error';

// 学生相关类型
export type {
  Student,
  StudentCreate,
  StudentUpdate,
} from './student';

// 成长档案相关类型
export type {
  PortfolioItem,
  PortfolioItemCreate,
  PortfolioItemUpdate,
} from './portfolio';

// 资源相关类型
export type {
  ResourceTag,
  ResourceFileType,
  Resource,
  ResourceListItem,
  ResourceCreateData,
  ResourceUpdateData,
  ResourceQueryParams,
  ResourceListResponse,
  ResourceFilterState,
} from './resource';

// 表单相关类型
export type {
  LessonPlanFormData,
  BasicSettingsFormData,
  NotificationSettingsFormData,
  SecuritySettingsFormData,
  SettingsFormData,
} from './forms';

/**
 * 通用ID类型
 */
export type ID = string | number;

/**
 * 可选ID类型
 */
export type OptionalID = ID | null | undefined;

/**
 * 通用时间戳类型
 */
export type Timestamp = string | Date;

/**
 * 通用状态类型
 */
export type Status = 'active' | 'inactive' | 'deleted' | 'suspended';

/**
 * 加载状态类型
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * 通用分页组件Props
 */
export interface PaginationProps {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize?: number) => void;
}

/**
 * 通用表格组件Props
 */
export interface TableProps<T> {
  data: T[];
  loading: boolean;
  pagination: PaginationProps;
  onRowClick?: (record: T) => void;
}

/**
 * 通用表单组件Props
 */
export interface FormProps<T> {
  initialValues?: Partial<T>;
  onSubmit: (values: T) => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * 通用模态框组件Props
 */
export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  loading?: boolean;
}

/**
 * 通用选择器选项
 */
export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

/**
 * 文件上传类型
 */
export interface UploadFile {
  uid: string;
  name: string;
  status: 'uploading' | 'done' | 'error' | 'removed';
  url?: string;
  size?: number;
  type?: string;
}
