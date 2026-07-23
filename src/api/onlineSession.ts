import { http } from "@/utils/http";

export type OnlineSessionStatus = "online" | "idle";

export type OnlineSessionUser = {
  id: number;
  username: string;
  email: string;
};

export type OnlineSessionRecord = {
  id: string;
  user: OnlineSessionUser;
  provider: string;
  ipAddress: string | null;
  userAgent: string | null;
  status: OnlineSessionStatus;
  current: boolean;
  lastSeenAt: string;
  loginAt: string;
  expiresAt: string;
};

export type OnlineSessionListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  provider?: string;
  status?: OnlineSessionStatus | "";
};

export type OnlineSessionPageResult = {
  data: OnlineSessionRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

/** 获取全部活跃认证会话。 */
export const getOnlineSessionList = (params?: OnlineSessionListParams) => {
  return http.request<OnlineSessionPageResult>(
    "get",
    "/api/v1/online-sessions",
    { params }
  );
};

/** 获取指定用户的活跃认证会话。 */
export const getUserOnlineSessions = (
  userId: number,
  params?: Pick<OnlineSessionListParams, "page" | "pageSize" | "status">
) => {
  return http.request<OnlineSessionPageResult>(
    "get",
    `/api/v1/users/${userId}/sessions`,
    { params }
  );
};

/** 强制撤销单个认证会话。 */
export const revokeOnlineSession = (sessionId: string) => {
  return http.request<void>("delete", `/api/v1/online-sessions/${sessionId}`);
};

/** 强制撤销指定用户的全部认证会话。 */
export const revokeUserOnlineSessions = (userId: number) => {
  return http.request<void>("delete", `/api/v1/users/${userId}/sessions`);
};
