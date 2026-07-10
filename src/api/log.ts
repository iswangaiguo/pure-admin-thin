import { http } from "@/utils/http";

export type LoginLogResult = "success" | "failed";

export type LoginLogRecord = {
  id: number;
  userId: number | null;
  username: string;
  result: LoginLogResult;
  reason: string | null;
  loginIp: string | null;
  loginLocation: string | null;
  browser: string | null;
  os: string | null;
  userAgent: string | null;
  loggedAt: string;
  createdAt: string;
  updatedAt?: string;
};

export type LoginLogListParams = {
  page?: number;
  pageSize?: number;
  username?: string;
  result?: LoginLogResult | "";
  loginIp?: string;
  startedAt?: string;
  endedAt?: string;
};

type LoginLogPageResult = {
  data: LoginLogRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

/** 获取登录日志列表 */
export const getLoginLogList = (params?: LoginLogListParams) => {
  return http.request<LoginLogPageResult>("get", "/api/v1/logs/login", {
    params
  });
};
