import { http } from "@/utils/http";

/** 菜单记录 */
export type MenuRecord = {
  id: number;
  parentId: number | null;
  path: string;
  name?: string;
  component?: string;
  redirect?: string;
  title: string;
  icon?: string;
  rank: number;
  showLink: boolean;
  extraIcon?: string;
  showParent: boolean;
  keepAlive: boolean;
  frameSrc?: string;
  perms?: string;
  status: boolean;
  menuType: "M" | "C" | "F";
  visible: boolean;
  children?: MenuRecord[];
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
};

/** 菜单树节点（tree-select 用） */
export type MenuTreeSelectNode = {
  id: number;
  label: string;
  parentId: number | null;
  children: MenuTreeSelectNode[];
};

/** 菜单树查询参数 */
export type MenuTreeParams = {
  title?: string;
  status?: string;
  visible?: string;
  menuTypes?: string[];
};

/** 菜单创建/更新参数 */
export type MenuFormData = {
  parentId?: number | null;
  menuType: "M" | "C" | "F";
  title: string;
  name?: string;
  path: string;
  component?: string;
  redirect?: string;
  icon?: string;
  rank?: number;
  showLink?: boolean;
  perms?: string;
  status?: boolean;
  visible?: boolean;
};

/** API 响应 — 列表/树 */
type MenuTreeResult = {
  data: MenuRecord[];
};

/** API 响应 — 树选择器 */
type MenuTreeSelectResult = {
  data: MenuTreeSelectNode[];
};

/** API 响应 — 单个菜单 */
type MenuResult = {
  data: MenuRecord;
};

/** 获取菜单树 */
export const getMenuTree = (params?: MenuTreeParams) => {
  return http.request<MenuTreeResult>("get", "/api/v1/menus/tree", { params });
};

/** 获取菜单树选择器数据（仅 M/C 类型，用于上级菜单选择） */
export const getMenuTreeSelect = () => {
  return http.request<MenuTreeSelectResult>("get", "/api/v1/menus/tree-select");
};

/** 获取单个菜单 */
export const getMenu = (id: number) => {
  return http.request<MenuResult>("get", `/api/v1/menus/${id}`);
};

/** 新增菜单 */
export const createMenu = (data: MenuFormData) => {
  return http.request<MenuResult>("post", "/api/v1/menus", { data });
};

/** 更新菜单 */
export const updateMenu = (id: number, data: MenuFormData) => {
  return http.request<MenuResult>("put", `/api/v1/menus/${id}`, { data });
};

/** 删除菜单 */
export const deleteMenu = (id: number) => {
  return http.request<MenuResult>("delete", `/api/v1/menus/${id}`);
};

/** 菜单角色更新参数 */
export type MenuRoleFormData = {
  role_ids: number[];
};

/** 更新菜单关联角色 */
export const updateMenuRoles = (id: number, data: MenuRoleFormData) => {
  return http.request<MenuResult>("patch", `/api/v1/menus/${id}/roles`, {
    data
  });
};
