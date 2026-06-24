import { http } from "@/utils/http";

/** 角色记录 */
export type RoleRecord = {
  id: number;
  /** 角色代码 */
  key: string;
  /** 角色名称 */
  name: string;
  /** 状态 1=启用 0=停用 */
  status: string;
  /** 关联菜单ID列表 */
  menus: number[];
  created_at?: string;
  updated_at?: string;
};

/** 角色表单数据 */
export type RoleFormData = {
  key: string;
  name: string;
  status?: string;
  menus?: number[];
};

/** 角色菜单更新参数 */
export type RoleMenuFormData = {
  menu_ids: number[];
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
  return http.request<RoleResult>("put", `/api/v1/roles/${id}`, { data });
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
