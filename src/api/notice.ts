import { http } from "@/utils/http";

export type NoticeType = "notification" | "announcement";
export type NoticeState = "draft" | "published" | "withdrawn";
export type NoticeAction = "draft" | "publish";

export type NoticeActor = {
  id: number | null;
  username: string | null;
};

export type NoticeRecord = {
  id: number;
  title: string;
  type: NoticeType;
  state: NoticeState;
  pinned: boolean;
  content?: string;
  createdBy: NoticeActor | null;
  updatedBy: NoticeActor | null;
  publishedBy: NoticeActor | null;
  publishedAt: string | null;
  withdrawnBy: NoticeActor | null;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoticeFormData = {
  title: string;
  type: NoticeType;
  content: string;
  pinned: boolean;
};

export type NoticeListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  type?: NoticeType | "";
  state?: NoticeState | "";
  pinned?: boolean | "";
};

export type NoticeStats = {
  noticeId: number;
  recipientCount: number;
  readCount: number;
  unreadCount: number;
  readRate: number;
};

export type MyNoticeRecord = {
  id: number;
  title: string;
  type: NoticeType;
  pinned: boolean;
  content?: string;
  publishedBy: NoticeActor | null;
  publishedAt: string;
  read: boolean;
  readAt: string | null;
};

export type MyNoticeListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  type?: NoticeType | "";
  read?: boolean | "";
};

type NoticeResult = {
  data: NoticeRecord;
};

type NoticePageResult = {
  data: NoticeRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type NoticeStatsResult = {
  data: NoticeStats;
};

type MyNoticeResult = {
  data: MyNoticeRecord;
};

type MyNoticePageResult = {
  data: MyNoticeRecord[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type MyNoticeUnreadCountResult = {
  data: {
    count: number;
  };
};

/** 获取通知公告管理列表 */
export const getNoticeList = (params?: NoticeListParams) => {
  return http.request<NoticePageResult>("get", "/api/v1/notices", {
    params
  });
};

/** 获取通知公告详情 */
export const getNotice = (id: number) => {
  return http.request<NoticeResult>("get", `/api/v1/notices/${id}`);
};

/** 新建草稿或直接发布 */
export const createNotice = (
  data: NoticeFormData & { action: NoticeAction }
) => {
  return http.request<NoticeResult>("post", "/api/v1/notices", { data });
};

/** 修改草稿内容 */
export const updateNotice = (id: number, data: NoticeFormData) => {
  return http.request<NoticeResult>("patch", `/api/v1/notices/${id}`, {
    data
  });
};

/** 删除草稿 */
export const deleteNotice = (id: number) => {
  return http.request("delete", `/api/v1/notices/${id}`);
};

/** 发布草稿 */
export const publishNotice = (id: number) => {
  return http.request<NoticeResult>("post", `/api/v1/notices/${id}/publish`);
};

/** 撤回已发布内容 */
export const withdrawNotice = (id: number) => {
  return http.request<NoticeResult>("post", `/api/v1/notices/${id}/withdraw`);
};

/** 更新置顶状态 */
export const updateNoticePinned = (id: number, pinned: boolean) => {
  return http.request<NoticeResult>("patch", `/api/v1/notices/${id}/pinned`, {
    data: { pinned }
  });
};

/** 获取已读统计 */
export const getNoticeStats = (id: number) => {
  return http.request<NoticeStatsResult>("get", `/api/v1/notices/${id}/stats`);
};

/** 获取当前用户可见的已发布通知公告 */
export const getMyNoticeList = (params?: MyNoticeListParams) => {
  return http.request<MyNoticePageResult>("get", "/api/v1/me/notices", {
    params
  });
};

/** 获取当前用户可见的通知公告详情 */
export const getMyNotice = (id: number) => {
  return http.request<MyNoticeResult>("get", `/api/v1/me/notices/${id}`);
};

/** 获取当前用户未读数量 */
export const getMyNoticeUnreadCount = () => {
  return http.request<MyNoticeUnreadCountResult>(
    "get",
    "/api/v1/me/notices/unread-count"
  );
};

/** 将当前用户的一条通知公告标记为已读 */
export const markMyNoticeRead = (id: number) => {
  return http.request<void>("post", `/api/v1/me/notices/${id}/read`);
};
