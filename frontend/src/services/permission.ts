import api from './api';
import { toItem, toListResponse } from './response';

/**
 * 角色类型定义
 */
export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  permission_count: number;
}

/**
 * 权限类型定义
 */
export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  is_active: boolean;
}

/**
 * 角色列表响应
 */
export interface RoleListResponse {
  items: Role[];
  total: number;
}

/**
 * 权限列表响应
 */
export interface PermissionListResponse {
  items: Permission[];
  total: number;
}

/**
 * 更新角色权限数据
 */
export interface UpdateRolePermissionsData {
  permission_codes: string[];
}

/**
 * 获取角色列表
 */
export const getRoles = async (): Promise<RoleListResponse> => {
  const response = await api.get('/permissions/roles');
  return toListResponse<Role>(response);
};

/**
 * 获取角色的权限列表
 * @param roleCode 角色代码
 */
export const getRolePermissions = async (roleCode: string): Promise<string[]> => {
  const response = await api.get(`/permissions/roles/${roleCode}/permissions`);
  return toListResponse<string>(response).data;
};

/**
 * 更新角色权限
 * @param roleCode 角色代码
 * @param data 权限更新数据
 */
export const updateRolePermissions = async (
  roleCode: string,
  data: UpdateRolePermissionsData
): Promise<{ message: string; code: string }> => {
  const response = await api.put(`/permissions/roles/${roleCode}/permissions`, data);
  return toItem<{ message: string; code: string }>(response);
};

/**
 * 获取所有权限列表
 */
export const getPermissions = async (): Promise<PermissionListResponse> => {
  const response = await api.get('/permissions/permissions');
  return toListResponse<Permission>(response);
};

/**
 * 初始化权限系统
 */
export const initializePermissions = async (): Promise<{ message: string; code: string }> => {
  const response = await api.post('/permissions/initialize');
  return toItem<{ message: string; code: string }>(response);
};

export const permissionService = {
  getRoles,
  getRolePermissions,
  updateRolePermissions,
  getPermissions,
  initializePermissions
};

export default permissionService;
