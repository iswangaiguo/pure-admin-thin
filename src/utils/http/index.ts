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

// 相关配置请参考：www.axios-js.com/zh-cn/docs/#axios-request-config-1
const defaultConfig: AxiosRequestConfig = {
  // 请求超时时间
  timeout: 10000,
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

type PendingRequest = {
  config: PureHttpRequestConfig;
  resolve: (config: PureHttpRequestConfig) => void;
  reject: (error: unknown) => void;
};

class PureHttp {
  constructor() {
    this.httpInterceptorsRequest();
    this.httpInterceptorsResponse();
  }

  /** `token`过期后，暂存待执行的请求 */
  private static requests: PendingRequest[] = [];

  /** 防止重复刷新`token` */
  private static isRefreshing = false;

  /** 初始化配置对象 */
  private static initConfig: PureHttpRequestConfig = {};

  /** 保存当前`Axios`实例对象 */
  private static axiosInstance: AxiosInstance = Axios.create(defaultConfig);

  /** 重连原始请求 */
  private static retryOriginalRequest(config: PureHttpRequestConfig) {
    return new Promise<PureHttpRequestConfig>((resolve, reject) => {
      PureHttp.requests.push({
        config,
        resolve,
        reject
      });
    });
  }

  private static setAuthorization(
    config: PureHttpRequestConfig,
    token: string
  ) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = formatToken(token);
  }

  private static resolvePendingRequests(token: string) {
    PureHttp.requests.forEach(({ config, resolve }) => {
      PureHttp.setAuthorization(config, token);
      resolve(config);
    });
    PureHttp.requests = [];
  }

  private static rejectPendingRequests(error: unknown) {
    PureHttp.requests.forEach(({ reject }) => {
      reject(error);
    });
    PureHttp.requests = [];
  }

  private static refreshAccessToken(refreshToken: string) {
    if (!PureHttp.isRefreshing) {
      PureHttp.isRefreshing = true;
      useUserStoreHook()
        .handRefreshToken({ refreshToken })
        .then(res => {
          const token = res.data.accessToken;
          PureHttp.resolvePendingRequests(token);
        })
        .catch(error => {
          PureHttp.rejectPendingRequests(error);
          useUserStoreHook().logOut(false);
        })
        .finally(() => {
          PureHttp.isRefreshing = false;
        });
    }
  }

  private static withFreshToken(config: PureHttpRequestConfig) {
    return new Promise<PureHttpRequestConfig>((resolve, reject) => {
      const data = getToken();
      if (data) {
        const now = new Date().getTime();
        const expired = parseInt(data.expires) - now <= 0;
        if (expired) {
          PureHttp.refreshAccessToken(data.refreshToken);
          PureHttp.retryOriginalRequest(config).then(resolve).catch(reject);
        } else {
          PureHttp.setAuthorization(config, data.accessToken);
          resolve(config);
        }
      } else {
        resolve(config);
      }
    });
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
        /** 请求白名单，放置一些不需要`token`的接口（通过设置请求白名单，防止`token`过期后再请求造成的死循环问题） */
        const whiteList = [
          "/api/v1/auth/refresh",
          "/api/v1/auth/login",
          "/api/v1/auth/captcha"
        ];
        const requestUrl = config.url || "";
        return whiteList.some(url => requestUrl.endsWith(url))
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
      (error: PureHttpError) => {
        const $error = error;
        $error.isCancelRequest = Axios.isCancel($error);
        // 所有的响应异常 区分来源为取消请求/非取消请求
        return Promise.reject($error);
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
