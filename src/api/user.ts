import { http } from "@/utils/http";

/** 登录请求参数 */
export type LoginParams = {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 记住登录状态 */
  remember_me?: boolean;
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
    remaining_attempts?: number;
    /** 等待时间（秒，锁定时） */
    retry_after?: number;
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
