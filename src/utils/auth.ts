import { useUserStoreHook } from "@/store/modules/user";
import { storageLocal, isString, isIncludeAllChildren } from "@pureadmin/utils";

export interface DataInfo<T> {
  /** Access token。Refresh token 仅存在于服务端设置的 HttpOnly Cookie 中。 */
  accessToken: string;
  /** `accessToken`的过期时间（时间戳） */
  expires: T;
  /** 头像 */
  avatar?: string;
  /** 用户名 */
  username?: string;
  /** 昵称 */
  nickname?: string;
  /** 当前登录用户的角色 */
  roles?: Array<string>;
  /** 当前登录用户的按钮级别权限 */
  permissions?: Array<string>;
}

export interface StoredUserInfo {
  avatar?: string;
  username?: string;
  nickname?: string;
  roles?: Array<string>;
  permissions?: Array<string>;
}

type AccessTokenInfo = Pick<DataInfo<number>, "accessToken" | "expires">;

export const userKey = "user-info";
const legacyTokenKey = "authorized-token";
const legacyMultipleTabsKey = "multiple-tabs";

/** Access token 只在当前页面的 JavaScript 内存中保存。 */
let currentToken: AccessTokenInfo | null = null;

function removeLegacyCookies() {
  document.cookie = `${legacyTokenKey}=; Max-Age=0; path=/; SameSite=Lax`;
  document.cookie = `${legacyMultipleTabsKey}=; Max-Age=0; path=/; SameSite=Lax`;
}

/**
 * 清除旧版本曾写入 localStorage 的 token。由于 JavaScript 无法创建
 * HttpOnly Cookie，升级后的已有会话需要重新登录一次。
 */
function removeLegacyStoredTokens() {
  const stored = storageLocal().getItem<
    StoredUserInfo & Record<string, unknown>
  >(userKey);
  if (!stored) return;

  const sanitized = { ...stored };
  delete sanitized.accessToken;
  delete sanitized.refreshToken;
  delete sanitized.expires;
  storageLocal().setItem(userKey, sanitized);
}

removeLegacyCookies();
removeLegacyStoredTokens();

/** 获取当前页面内存中的 access token。 */
export function getToken(): AccessTokenInfo | null {
  return currentToken;
}

/**
 * 保存新的 access token，并缓存非敏感的用户展示及权限信息。
 * Refresh token 由浏览器通过 HttpOnly Cookie 自动管理，前端不可读取。
 */
export function setToken(data: DataInfo<number>) {
  currentToken = {
    accessToken: data.accessToken,
    expires: data.expires
  };

  const stored = storageLocal().getItem<StoredUserInfo>(userKey);
  const userInfo: StoredUserInfo = {
    avatar: data.avatar ?? stored?.avatar ?? "",
    username: data.username ?? stored?.username ?? "",
    nickname: data.nickname ?? stored?.nickname ?? "",
    roles: data.roles ?? stored?.roles ?? [],
    permissions: data.permissions ?? stored?.permissions ?? []
  };

  useUserStoreHook().SET_AVATAR(userInfo.avatar ?? "");
  useUserStoreHook().SET_USERNAME(userInfo.username ?? "");
  useUserStoreHook().SET_NICKNAME(userInfo.nickname ?? "");
  useUserStoreHook().SET_ROLES(userInfo.roles ?? []);
  useUserStoreHook().SET_PERMS(userInfo.permissions ?? []);

  // 权限刷新后不能继续使用旧的异步路由缓存。
  storageLocal().removeItem("async-routes");
  storageLocal().setItem(userKey, userInfo);
}

/** 删除内存 token 和本地非敏感用户信息。 */
export function removeToken() {
  currentToken = null;
  removeLegacyCookies();
  storageLocal().removeItem(userKey);
  storageLocal().removeItem("async-routes");
}

/** 格式化token（jwt格式） */
export const formatToken = (token: string): string => {
  return "Bearer " + token;
};

/** 是否有按钮级别的权限（根据登录接口返回的`permissions`字段进行判断）*/
export const hasPerms = (value: string | Array<string>): boolean => {
  if (!value) return false;
  const allPerms = "*:*:*";
  const { permissions } = useUserStoreHook();
  if (!permissions) return false;
  if (permissions.length === 1 && permissions[0] === allPerms) return true;
  const isAuths = isString(value)
    ? permissions.includes(value)
    : isIncludeAllChildren(value, permissions);
  return isAuths ? true : false;
};
