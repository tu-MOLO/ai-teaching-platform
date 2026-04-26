/**
 * 错误码枚举 - 与后端 ErrorCode 保持一致
 */
export enum ErrorCode {
  // 通用错误 (1000-1999)
  UNKNOWN_ERROR = '1000',
  INVALID_PARAMETER = '1001',
  MISSING_PARAMETER = '1002',
  RESOURCE_NOT_FOUND = '1003',
  RESOURCE_ALREADY_EXISTS = '1004',
  OPERATION_NOT_ALLOWED = '1005',
  VERSION_CONFLICT = '1006',

  // 认证授权错误 (2000-2999)
  UNAUTHORIZED = '2000',
  TOKEN_EXPIRED = '2001',
  TOKEN_INVALID = '2002',
  TOKEN_REVOKED = '2003',
  FORBIDDEN = '2004',
  PERMISSION_DENIED = '2005',
  ACCOUNT_LOCKED = '2006',
  ACCOUNT_DISABLED = '2007',

  // 用户相关错误 (3000-3999)
  USER_NOT_FOUND = '3000',
  USER_ALREADY_EXISTS = '3001',
  INVALID_CREDENTIALS = '3002',
  PASSWORD_TOO_WEAK = '3003',
  PASSWORD_INCORRECT = '3004',

  // 数据相关错误 (4000-4999)
  DATA_VALIDATION_ERROR = '4000',
  DATA_INTEGRITY_ERROR = '4001',
  DATABASE_ERROR = '4002',

  // 文件相关错误 (5000-5999)
  FILE_NOT_FOUND = '5000',
  FILE_TOO_LARGE = '5001',
  INVALID_FILE_TYPE = '5002',
  FILE_UPLOAD_ERROR = '5003',

  // 限流错误 (6000-6999)
  RATE_LIMIT_EXCEEDED = '6000'
}

/**
 * 错误码到错误消息的映射
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
  [ErrorCode.INVALID_PARAMETER]: '参数无效',
  [ErrorCode.MISSING_PARAMETER]: '缺少必要参数',
  [ErrorCode.RESOURCE_NOT_FOUND]: '资源不存在',
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: '资源已存在',
  [ErrorCode.OPERATION_NOT_ALLOWED]: '操作不允许',
  [ErrorCode.VERSION_CONFLICT]: '数据版本冲突',
  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.TOKEN_EXPIRED]: '令牌已过期',
  [ErrorCode.TOKEN_INVALID]: '令牌无效',
  [ErrorCode.TOKEN_REVOKED]: '令牌已被撤销',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.PERMISSION_DENIED]: '权限不足',
  [ErrorCode.ACCOUNT_LOCKED]: '账户已被锁定',
  [ErrorCode.ACCOUNT_DISABLED]: '账户已被禁用',
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.PASSWORD_TOO_WEAK]: '密码强度不足',
  [ErrorCode.PASSWORD_INCORRECT]: '密码错误',
  [ErrorCode.DATA_VALIDATION_ERROR]: '数据验证失败',
  [ErrorCode.DATA_INTEGRITY_ERROR]: '数据完整性错误',
  [ErrorCode.DATABASE_ERROR]: '数据库错误',
  [ErrorCode.FILE_NOT_FOUND]: '文件不存在',
  [ErrorCode.FILE_TOO_LARGE]: '文件过大',
  [ErrorCode.INVALID_FILE_TYPE]: '不支持的文件类型',
  [ErrorCode.FILE_UPLOAD_ERROR]: '文件上传失败',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: '请求过于频繁'
};

/**
 * API错误响应接口 - 与后端 ErrorResponse 对齐
 */
export interface ApiErrorResponse {
  error: string;
  code: ErrorCode | string;
  details?: Record<string, unknown>;
}

/**
 * 验证错误响应接口 - 与后端 ValidationErrorResponse 对齐
 */
export interface ValidationErrorResponse extends ApiErrorResponse {
  errors: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * 业务异常类
 */
export class BusinessError extends Error {
  public readonly code: ErrorCode | string;
  public readonly details?: Record<string, unknown>;
  public readonly statusCode?: number;

  constructor(message: string, code: ErrorCode | string = ErrorCode.UNKNOWN_ERROR, details?: Record<string, unknown>, statusCode?: number) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}

/**
 * 获取错误码对应的错误消息
 * @param code 错误码
 * @returns 错误消息
 */
export function getErrorMessage(code: ErrorCode | string): string {
  return ErrorMessages[code as ErrorCode] || '未知错误';
}

/**
 * HTTP状态码到错误类型的映射
 */
export const HttpStatusErrorMap: Record<number, string> = {
  400: '请求参数错误',
  401: '未授权，请先登录',
  403: '权限不足',
  404: '请求的资源不存在',
  409: '资源冲突',
  422: '数据验证失败',
  429: '请求过于频繁，请稍后重试',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务暂不可用'
};

/**
 * 获取HTTP状态码对应的错误消息
 * @param statusCode HTTP状态码
 * @returns 错误消息
 */
export function getHttpErrorMessage(statusCode: number): string {
  return HttpStatusErrorMap[statusCode] || `请求失败 (${statusCode})`;
}
