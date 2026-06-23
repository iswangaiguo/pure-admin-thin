import { http } from "@/utils/http";

/** 角色记录 */
export type RoleRecord = {
  /** 角色代码 */
  key: string;
  /** 角色名称 */
  name: string;
};

/** 角色列表响应 */
type RoleListResult = {
  data: RoleRecord[];
};

/** 获取角色列表 */
export const getRoleList = () => {
  return http.request<RoleListResult>("get", "/api/v1/roles");
};
