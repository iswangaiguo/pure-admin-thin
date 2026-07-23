import { http } from "@/utils/http";
import type { StatusCode } from "@/api/status";

/** 角色记录 */
export type RoleRecord = {
  id: number;
  /** 角色代码 */
  code: string;
  /** 角色名称 */
  name: string;
  /** 启用状态：1 启用，0 禁用 */
  status: StatusCode;
  /** 关联菜单ID列表 */
  menus: number[];
  createdAt?: string;
  updatedAt?: string;
};

/** 角色创建/更新参数（仅元数据，不含权限关联） */
export type RoleFormData = {
  code: string;
  name: string;
  status?: StatusCode;
};

/** 角色菜单更新参数 */
export type RoleMenuFormData = {
  menuIds: number[];
};

/** 角色列表响应 */
type RoleListResult = {
  data: RoleRecord[];
};

/** 单个角色响应 */
type RoleResult = {
  data: RoleRecord;
};

/** 获取角色列表 */
export const getRoleList = () => {
  return http.request<RoleListResult>("get", "/api/v1/roles");
};

/** 获取单个角色 */
export const getRole = (id: number) => {
  return http.request<RoleResult>("get", `/api/v1/roles/${id}`);
};

/** 新增角色 */
export const createRole = (data: RoleFormData) => {
  return http.request<RoleResult>("post", "/api/v1/roles", { data });
};

/** 更新角色 */
export const updateRole = (id: number, data: RoleFormData) => {
  return http.request<RoleResult>("patch", `/api/v1/roles/${id}`, { data });
};

/** 删除角色 */
export const deleteRole = (id: number) => {
  return http.request("delete", `/api/v1/roles/${id}`);
};

/** 更新角色菜单 */
export const updateRoleMenus = (id: number, data: RoleMenuFormData) => {
  return http.request<RoleResult>("patch", `/api/v1/roles/${id}/menus`, {
    data
  });
};
