import { http } from "@/utils/http";
import type { RoleRecord } from "@/api/role";
import type { DepartmentOption } from "@/api/department";

/** 登录请求参数 */
export type LoginParams = {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 记住登录状态 */
  rememberMe?: boolean;
  /** 验证码 UUID（后端下发，验证码启用时必填） */
  captchaUuid?: string;
  /** 用户输入的验证码（验证码启用时必填） */
  captchaCode?: string;
};

/** 登录成功响应 */
export type LoginSuccessResult = {
  data: {
    /** 访问令牌 */
    accessToken: string;
    /** 刷新令牌 */
    refreshToken: string;
    /** 访问令牌过期时间（Unix 毫秒时间戳） */
    expires: number;
    /** 用户名 */
    username: string;
    /** 当前登录用户的角色 */
    roles: Array<string>;
    /** 当前登录用户的按钮级别权限 */
    permissions: Array<string>;
  };
};

/** 登录错误响应 */
export type LoginErrorResult = {
  errors: {
    /** 错误代码 */
    code: string;
    /** 错误消息 */
    message: string;
    /** 附加详情 */
    details?: {
      /** 剩余尝试次数（密码错误时） */
      remainingAttempts?: number;
      /** 等待时间（秒，锁定时） */
      retryAfter?: number;
    };
  };
};

/** 验证码响应 */
export type CaptchaResult = {
  data: {
    /** 验证码是否启用 */
    captchaEnabled?: boolean;
    /** 验证码 UUID（启用时返回） */
    uuid?: string;
    /** base64 编码的 SVG 图片（启用时返回） */
    img?: string;
    /** 图片类型，固定为 "svg" */
    type?: string;
    /** 验证码有效期（秒） */
    expiresIn?: number;
  };
};

/** 获取登录验证码 */
export const getCaptcha = () => {
  return http.request<CaptchaResult>("get", "/api/v1/auth/captcha");
};

export type RefreshTokenResult = {
  data: {
    accessToken: string;
    refreshToken: string;
    expires: number;
    username: string;
    roles: Array<string>;
    permissions: Array<string>;
  };
};

/** 登录 */
export const getLogin = (data: LoginParams) => {
  return http.request<LoginSuccessResult>("post", "/api/v1/auth/login", {
    data
  });
};

/** 刷新`token` */
export const refreshTokenApi = (data?: object) => {
  return http.request<RefreshTokenResult>("post", "/api/v1/auth/refresh", {
    data
  });
};

/** 撤销当前登录会话 */
export const logoutApi = () => {
  return http.request<{ data: { success: boolean } }>(
    "post",
    "/api/v1/auth/logout"
  );
};

// ==================== 用户管理 CRUD ====================

export type StatusCode = 0 | 1;
export type GenderCode = 0 | 1 | 2;

/** 用户记录 */
export type UserRecord = {
  id: number;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 手机号 */
  phone: string | null;
  /** 性别：0 未知，1 男，2 女 */
  gender: GenderCode;
  /** 启用状态：1 启用，0 禁用 */
  status: StatusCode;
  /** 角色代码列表 */
  roles: string[];
  /** 所属部门 */
  department: Pick<DepartmentOption, "id" | "code" | "name"> | null;
  /** 最后登录时间 */
  lastLoginAt: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt?: string;
};

/** 用户表单数据 */
export type UserFormData = {
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 手机号 */
  phone?: string;
  /** 性别：0 未知，1 男，2 女 */
  gender?: GenderCode;
  /** 密码（新增时必填，编辑时留空表示不修改） */
  password?: string;
  /** 启用状态：1 启用，0 禁用 */
  status?: StatusCode;
  /** 角色代码列表 */
  roles?: string[];
  /** 所属部门 ID */
  departmentId?: number | null;
};

/** 用户资料表单数据（不含密码和角色） */
export type UserProfileFormData = {
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 手机号 */
  phone?: string;
  /** 性别：0 未知，1 男，2 女 */
  gender?: GenderCode;
};

/** 重置密码参数 */
export type ResetPasswordData = {
  password: string;
};

/** 分配角色参数 */
export type AssignRolesData = {
  roles: string[];
};

export type AssignDepartmentData = {
  departmentId: number | null;
};

/** 用户列表查询参数 */
export type UserListParams = {
  page?: number;
  pageSize?: number;
  /** 关键词（搜索用户名或邮箱） */
  keyword?: string;
  /** 启用状态过滤 */
  status?: StatusCode | "";
  /** 角色过滤 */
  role?: string;
  /** 部门 ID；unassigned 表示未分配部门 */
  departmentId?: number | "unassigned";
};

/** 单个用户响应 */
export type UserResult = {
  data: UserRecord;
};

/** 分页用户列表响应 */
type UserPageResult = {
  data: UserRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type AssignableRolesResult = {
  data: RoleRecord[];
};

type DepartmentOptionsResult = {
  data: DepartmentOption[];
};

/** 获取用户列表（分页） */
export const getUserList = (params?: UserListParams) => {
  return http.request<UserPageResult>("get", "/api/v1/users", { params });
};

/** 获取当前操作人可以授予的角色 */
export const getAssignableRoles = () => {
  return http.request<AssignableRolesResult>(
    "get",
    "/api/v1/users/assignable-roles"
  );
};

/** 用户列表的完整部门筛选树 */
export const getDepartmentOptions = () =>
  http.request<DepartmentOptionsResult>(
    "get",
    "/api/v1/users/department-options"
  );

/** 当前操作人可分配的有效部门树 */
export const getAssignableDepartments = () =>
  http.request<DepartmentOptionsResult>(
    "get",
    "/api/v1/users/assignable-departments"
  );

/** 新增用户 */
export const createUser = (data: UserFormData) => {
  return http.request<UserResult>("post", "/api/v1/users", { data });
};

/** 修改用户（仅资料） */
export const updateUser = (id: number, data: UserProfileFormData) => {
  return http.request<UserResult>("put", `/api/v1/users/${id}`, { data });
};

/** 重置用户密码 */
export const resetUserPassword = (id: number, data: ResetPasswordData) => {
  return http.request<UserResult>("patch", `/api/v1/users/${id}/password`, {
    data
  });
};

/** 分配用户角色 */
export const assignUserRoles = (id: number, data: AssignRolesData) => {
  return http.request<UserResult>("patch", `/api/v1/users/${id}/roles`, {
    data
  });
};

/** 调整用户所属部门 */
export const assignUserDepartment = (id: number, data: AssignDepartmentData) =>
  http.request<UserResult>("patch", `/api/v1/users/${id}/department`, {
    data
  });

/** 删除用户（硬删除） */
export const deleteUser = (id: number) => {
  return http.request("delete", `/api/v1/users/${id}`);
};

/** 获取单个用户 */
export const getUser = (id: number) => {
  return http.request<UserResult>("get", `/api/v1/users/${id}`);
};

/** 更新用户状态 */
export const updateUserStatus = (id: number, status: StatusCode) => {
  return http.request<UserResult>("patch", `/api/v1/users/${id}/status`, {
    data: { status }
  });
};

/** 当前用户信息 */
export type CurrentUserResult = {
  data: {
    id: number;
    username: string;
    email: string;
    phone: string | null;
    gender: GenderCode;
    status: StatusCode;
    roles: string[];
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt?: string;
  };
};

/** 获取当前用户信息 */
export const getCurrentUser = () => {
  return http.request<CurrentUserResult>("get", "/api/v1/me");
};
