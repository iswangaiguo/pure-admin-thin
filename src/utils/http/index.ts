import Axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type CustomParamsSerializer
} from "axios";
import type {
  PureHttpError,
  RequestMethods,
  PureHttpResponse,
  PureHttpRequestConfig
} from "./types.d";
import { stringify } from "qs";
import { getToken, formatToken } from "@/utils/auth";
import { useUserStoreHook } from "@/store/modules/user";
import { message } from "@/utils/message";

// 相关配置请参考：www.axios-js.com/zh-cn/docs/#axios-request-config-1
const defaultConfig: AxiosRequestConfig = {
  // 请求超时时间
  timeout: 10000,
  // Refresh token 由同源 HttpOnly Cookie 自动携带。
  withCredentials: true,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  },
  // 数组格式参数序列化（https://github.com/axios/axios/issues/5142）
  paramsSerializer: {
    serialize: stringify as unknown as CustomParamsSerializer
  }
};

class PureHttp {
  constructor() {
    this.httpInterceptorsRequest();
    this.httpInterceptorsResponse();
  }

  /** 同一页面内所有待恢复请求共用一次刷新。 */
  private static refreshPromise: Promise<string> | null = null;

  /** 会话失效后的本地清理只执行一次，直到新的有效 token 被使用。 */
  private static sessionInvalidationPromise: Promise<void> | null = null;

  /** 初始化配置对象 */
  private static initConfig: PureHttpRequestConfig = {};

  /** 保存当前`Axios`实例对象 */
  private static axiosInstance: AxiosInstance = Axios.create(defaultConfig);

  /** 无需 access token 的接口。 */
  private static publicAuthPaths = [
    "/api/v1/auth/refresh",
    "/api/v1/auth/login",
    "/api/v1/auth/captcha"
  ];

  /** 401 不应触发 refresh 的认证接口，防止递归或覆盖登录错误。 */
  private static authRecoveryExcludedPaths = [
    ...PureHttp.publicAuthPaths,
    "/api/v1/auth/logout"
  ];

  private static requestMatchesPath(
    config: PureHttpRequestConfig,
    paths: string[]
  ) {
    const requestUrl = config.url || "";
    let pathname = requestUrl.split(/[?#]/, 1)[0];

    try {
      pathname = new URL(requestUrl, "http://localhost").pathname;
    } catch {
      // 非标准 URL 保留上面的无查询参数版本进行匹配。
    }

    return paths.some(path => pathname.endsWith(path));
  }

  private static setAuthorization(
    config: PureHttpRequestConfig,
    token: string
  ) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = formatToken(token);
  }

  private static performRefresh() {
    const refresh = () => useUserStoreHook().handRefreshToken();

    // 同一浏览器的多个标签页共用 refresh cookie。Web Locks 将轮换串行化，
    // 避免两个标签页同时使用同一个一次性 refresh token。
    if (typeof navigator !== "undefined" && navigator.locks) {
      return navigator.locks.request("elixadmin-refresh-token", refresh);
    }

    return refresh();
  }

  private static hasLocalSession() {
    const userStore = useUserStoreHook();
    return Boolean(getToken() || userStore.username);
  }

  private static invalidateSession(notify: boolean) {
    if (!PureHttp.sessionInvalidationPromise) {
      if (notify) {
        message("登录状态已失效，请重新登录", {
          type: "warning",
          grouping: true
        });
      }

      PureHttp.sessionInvalidationPromise = useUserStoreHook()
        .logOut(false)
        .catch(() => undefined);
    }

    return PureHttp.sessionInvalidationPromise;
  }

  private static refreshAccessToken(): Promise<string> {
    if (!PureHttp.refreshPromise) {
      const notifyOnFailure = PureHttp.hasLocalSession();
      const trackedRefresh = PureHttp.performRefresh()
        .then(res => {
          const token = res?.data?.accessToken;
          if (!token)
            throw new Error("Refresh response did not include an access token");

          PureHttp.sessionInvalidationPromise = null;
          return token;
        })
        .catch(error => {
          // 不等待路由跳转完成，避免主动 logout 的请求正在等待 refresh 时互相等待。
          void PureHttp.invalidateSession(notifyOnFailure);
          throw error;
        })
        .finally(() => {
          if (PureHttp.refreshPromise === trackedRefresh) {
            PureHttp.refreshPromise = null;
          }
        });

      PureHttp.refreshPromise = trackedRefresh;
    }

    return PureHttp.refreshPromise;
  }

  private static async withFreshToken(config: PureHttpRequestConfig) {
    if (PureHttp.refreshPromise) {
      const token = await PureHttp.refreshPromise;
      PureHttp.setAuthorization(config, token);
      return config;
    }

    const data = getToken();
    if (data?.accessToken && Number(data.expires) > Date.now()) {
      PureHttp.sessionInvalidationPromise = null;
      PureHttp.setAuthorization(config, data.accessToken);
      return config;
    }

    // 页面刷新、access token 到期时，使用 HttpOnly Cookie 静默刷新。
    const token = await PureHttp.refreshAccessToken();
    PureHttp.setAuthorization(config, token);
    return config;
  }

  /** 请求拦截 */
  private httpInterceptorsRequest(): void {
    PureHttp.axiosInstance.interceptors.request.use(
      async (config: PureHttpRequestConfig): Promise<any> => {
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof config.beforeRequestCallback === "function") {
          config.beforeRequestCallback(config);
          return config;
        }
        if (PureHttp.initConfig.beforeRequestCallback) {
          PureHttp.initConfig.beforeRequestCallback(config);
          return config;
        }
        return PureHttp.requestMatchesPath(config, PureHttp.publicAuthPaths)
          ? config
          : PureHttp.withFreshToken(config);
      },
      error => {
        return Promise.reject(error);
      }
    );
  }

  /** 响应拦截 */
  private httpInterceptorsResponse(): void {
    const instance = PureHttp.axiosInstance;
    instance.interceptors.response.use(
      (response: PureHttpResponse) => {
        const $config = response.config;
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof $config.beforeResponseCallback === "function") {
          $config.beforeResponseCallback(response);
          return response.data;
        }
        if (PureHttp.initConfig.beforeResponseCallback) {
          PureHttp.initConfig.beforeResponseCallback(response);
          return response.data;
        }
        return response.data;
      },
      async (error: PureHttpError) => {
        const $error = error;
        $error.isCancelRequest = Axios.isCancel($error);
        const $config = $error.config as PureHttpRequestConfig | undefined;

        if (
          $error.isCancelRequest ||
          $error.response?.status !== 401 ||
          !$config ||
          PureHttp.requestMatchesPath(
            $config,
            PureHttp.authRecoveryExcludedPaths
          )
        ) {
          return Promise.reject($error);
        }

        // 每个请求最多重放一次，避免服务端持续返回 401 时形成死循环。
        if ($config.authRetry) {
          await PureHttp.invalidateSession(PureHttp.hasLocalSession());
          return Promise.reject($error);
        }

        $config.authRetry = true;

        try {
          const token = await PureHttp.refreshAccessToken();
          PureHttp.setAuthorization($config, token);
          return instance.request($config);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
    );
  }

  /** 通用请求工具函数 */
  public request<T>(
    method: RequestMethods,
    url: string,
    param?: AxiosRequestConfig,
    axiosConfig?: PureHttpRequestConfig
  ): Promise<T> {
    const config = {
      method,
      url,
      ...param,
      ...axiosConfig
    } as PureHttpRequestConfig;

    // 单独处理自定义请求/响应回调
    return new Promise((resolve, reject) => {
      PureHttp.axiosInstance
        .request(config)
        .then((response: undefined) => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  /** 单独抽离的`post`工具函数 */
  public post<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("post", url, params, config);
  }

  /** 单独抽离的`get`工具函数 */
  public get<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("get", url, params, config);
  }
}

export const http = new PureHttp();
