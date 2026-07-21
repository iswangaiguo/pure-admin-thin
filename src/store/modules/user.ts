import { defineStore } from "pinia";
import {
  type userType,
  store,
  router,
  resetRouter,
  routerArrays,
  storageLocal
} from "../utils";
import {
  type LoginSuccessResult,
  type RefreshTokenResult,
  getLogin,
  logoutApi,
  refreshTokenApi
} from "@/api/user";
import { useMultiTagsStoreHook } from "./multiTags";
import {
  type StoredUserInfo,
  setToken,
  removeToken,
  userKey
} from "@/utils/auth";

let logoutPromise: Promise<void> | null = null;

export const useUserStore = defineStore("pure-user", {
  state: (): userType => ({
    // 头像
    avatar: storageLocal().getItem<StoredUserInfo>(userKey)?.avatar ?? "",
    // 用户名
    username: storageLocal().getItem<StoredUserInfo>(userKey)?.username ?? "",
    // 昵称
    nickname: storageLocal().getItem<StoredUserInfo>(userKey)?.nickname ?? "",
    // 页面级别权限
    roles: storageLocal().getItem<StoredUserInfo>(userKey)?.roles ?? [],
    // 按钮级别权限
    permissions:
      storageLocal().getItem<StoredUserInfo>(userKey)?.permissions ?? [],
    // 是否勾选了登录页的免登录
    isRemembered: false,
    // 登录页的免登录存储几天，默认7天
    loginDay: 7
  }),
  actions: {
    /** 存储头像 */
    SET_AVATAR(avatar: string) {
      this.avatar = avatar;
    },
    /** 存储用户名 */
    SET_USERNAME(username: string) {
      this.username = username;
    },
    /** 存储昵称 */
    SET_NICKNAME(nickname: string) {
      this.nickname = nickname;
    },
    /** 存储角色 */
    SET_ROLES(roles: Array<string>) {
      this.roles = roles;
    },
    /** 存储按钮级别权限 */
    SET_PERMS(permissions: Array<string>) {
      this.permissions = permissions;
    },
    /** 存储是否勾选了登录页的免登录 */
    SET_ISREMEMBERED(bool: boolean) {
      this.isRemembered = bool;
    },
    /** 设置登录页的免登录存储几天 */
    SET_LOGINDAY(value: number) {
      this.loginDay = Number(value);
    },
    /** 登入 */
    async loginByUsername(data) {
      this.isRemembered = data.rememberMe === true;
      return new Promise<LoginSuccessResult>((resolve, reject) => {
        getLogin(data)
          .then(res => {
            if (res?.data) setToken(res.data);
            resolve(res);
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    /** 登出；refresh 失败时可传 false，仅清理本地状态，避免递归请求 */
    logOut(revokeRemoteSession = true) {
      if (logoutPromise) return logoutPromise;

      const operation = (async () => {
        try {
          if (revokeRemoteSession) await logoutApi();
        } catch {
          // 无论服务端会话是否已经失效，本地都必须完成退出。
        } finally {
          this.username = "";
          this.roles = [];
          this.permissions = [];
          removeToken();
          useMultiTagsStoreHook().handleTags("equal", [...routerArrays]);
          resetRouter();

          if (router.currentRoute.value.path !== "/login") {
            await router.push("/login");
          }
        }
      })();

      logoutPromise = operation;
      return operation.finally(() => {
        if (logoutPromise === operation) logoutPromise = null;
      });
    },
    /** 刷新`token` */
    async handRefreshToken() {
      return new Promise<RefreshTokenResult>((resolve, reject) => {
        refreshTokenApi()
          .then(res => {
            if (res?.data) {
              setToken(res.data);
              resolve(res);
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    }
  }
});

export function useUserStoreHook() {
  return useUserStore(store);
}
