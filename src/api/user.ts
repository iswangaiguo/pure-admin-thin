import { http } from "@/utils/http";

/** 登录请求参数 */
export type LoginParams = {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 记住登录状态 */
  rememberMe?: boolean;
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
  error: {
    /** 错误代码 */
    code: string;
    /** 错误消息 */
    message: string;
    /** 剩余尝试次数（密码错误时） */
    remainingAttempts?: number;
    /** 等待时间（秒，锁定时） */
    retryAfter?: number;
  };
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

// ==================== 用户管理 CRUD ====================

/** 用户记录 */
export type UserRecord = {
  id: number;
  /** 用户名 */
  name: string;
  /** 邮箱 */
  email: string;
  /** 手机号 */
  phone: string | null;
  /** 状态：active=正常 disabled=禁用 */
  status: "active" | "disabled";
  /** 角色代码列表 */
  roles: string[];
  /** 最后登录时间 */
  last_login_at: string | null;
  /** 创建时间 */
  created_at: string;
};

/** 用户表单数据 */
export type UserFormData = {
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email: string;
  /** 密码（新增时必填，编辑时留空表示不修改） */
  password?: string;
  /** 是否启用 */
  is_active?: boolean;
  /** 角色代码列表 */
  roles?: string[];
};

/** 用户列表查询参数 */
export type UserListParams = {
  page?: number;
  pageSize?: number;
  /** 关键词（搜索用户名或邮箱） */
  keyword?: string;
  /** 状态过滤 */
  status?: string;
  /** 角色过滤 */
  role?: string;
};

/** 单个用户响应 */
type UserResult = {
  data: UserRecord;
};

/** 分页用户列表响应 */
type UserPageResult = {
  data: UserRecord[];
  meta: {
    page: number;
    page_size: number;
    total: number;
  };
};

/** 获取用户列表（分页） */
export const getUserList = (params?: UserListParams) => {
  return http.request<UserPageResult>("get", "/api/v1/users", { params });
};

/** 新增用户 */
export const createUser = (data: UserFormData) => {
  return http.request<UserResult>("post", "/api/v1/users", { data });
};

/** 修改用户 */
export const updateUser = (id: number, data: UserFormData) => {
  return http.request<UserResult>("put", `/api/v1/users/${id}`, { data });
};

/** 删除用户（软删除） */
export const deleteUser = (id: number) => {
  return http.request("delete", `/api/v1/users/${id}`);
};
