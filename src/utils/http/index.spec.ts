import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig
} from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  token: null as { accessToken: string; expires: number } | null,
  username: "",
  refresh: vi.fn(),
  logout: vi.fn(),
  message: vi.fn()
}));

vi.mock("@/utils/auth", () => ({
  getToken: () => mocks.token,
  formatToken: (token: string) => `Bearer ${token}`
}));

vi.mock("@/store/modules/user", () => ({
  useUserStoreHook: () => ({
    username: mocks.username,
    handRefreshToken: mocks.refresh,
    logOut: mocks.logout
  })
}));

vi.mock("@/utils/message", () => ({
  message: mocks.message
}));

function authorization(config: InternalAxiosRequestConfig) {
  const value = AxiosHeaders.from(config.headers).get("Authorization");
  return value == null ? null : String(value);
}

function rejectResponse(config: InternalAxiosRequestConfig, status: number) {
  return Promise.reject(
    new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_REQUEST,
      config,
      undefined,
      {
        config,
        data: { errors: { code: status === 401 ? "unauthorized" : "error" } },
        headers: new AxiosHeaders(),
        status,
        statusText: String(status)
      }
    )
  );
}

function resolveResponse(config: InternalAxiosRequestConfig, data: unknown) {
  return Promise.resolve({
    config,
    data,
    headers: new AxiosHeaders(),
    status: 200,
    statusText: "OK"
  });
}

async function loadHttp() {
  vi.resetModules();
  return (await import("./index")).http;
}

function useValidToken(token = "old-access-token") {
  mocks.token = {
    accessToken: token,
    expires: Date.now() + 60_000
  };
  mocks.username = "alice";
}

function refreshSuccessfully(token = "new-access-token") {
  mocks.refresh.mockImplementation(async () => {
    mocks.token = {
      accessToken: token,
      expires: Date.now() + 60_000
    };

    return { data: { accessToken: token } };
  });
}

beforeEach(() => {
  mocks.token = null;
  mocks.username = "";
  mocks.refresh.mockReset();
  mocks.logout.mockReset().mockResolvedValue(undefined);
  mocks.message.mockReset();
});

describe("HTTP authentication recovery", () => {
  it("refreshes and retries a protected request once after a 401", async () => {
    useValidToken();
    refreshSuccessfully();
    const http = await loadHttp();
    const seenTokens: Array<string | null> = [];
    const adapter: AxiosAdapter = config => {
      const token = authorization(config);
      seenTokens.push(token);

      return token === "Bearer old-access-token"
        ? rejectResponse(config, 401)
        : resolveResponse(config, { ok: true });
    };

    await expect(
      http.get("/api/v1/protected", undefined, { adapter })
    ).resolves.toEqual({ ok: true });
    expect(seenTokens).toEqual([
      "Bearer old-access-token",
      "Bearer new-access-token"
    ]);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.logout).not.toHaveBeenCalled();
  });

  it("shares one refresh across concurrent 401 responses", async () => {
    useValidToken();
    let completeRefresh: (() => void) | undefined;
    mocks.refresh.mockImplementation(
      () =>
        new Promise(resolve => {
          completeRefresh = () => {
            mocks.token = {
              accessToken: "new-access-token",
              expires: Date.now() + 60_000
            };
            resolve({ data: { accessToken: "new-access-token" } });
          };
        })
    );
    const http = await loadHttp();
    const adapter: AxiosAdapter = config =>
      authorization(config) === "Bearer old-access-token"
        ? rejectResponse(config, 401)
        : resolveResponse(config, { url: config.url });

    const requests = [
      http.get("/api/v1/first", undefined, { adapter }),
      http.get("/api/v1/second", undefined, { adapter })
    ];

    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    completeRefresh?.();

    await expect(Promise.all(requests)).resolves.toEqual([
      { url: "/api/v1/first" },
      { url: "/api/v1/second" }
    ]);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.logout).not.toHaveBeenCalled();
  });

  it("clears the local session once when refresh fails", async () => {
    useValidToken();
    const refreshError = new Error("refresh failed");
    mocks.refresh.mockRejectedValue(refreshError);
    // 模拟主动登出仍在等待当前请求；401 恢复不能反过来等待登出完成。
    mocks.logout.mockReturnValue(new Promise(() => undefined));
    const http = await loadHttp();
    const adapter: AxiosAdapter = config => rejectResponse(config, 401);

    await expect(
      Promise.allSettled([
        http.get("/api/v1/first", undefined, { adapter }),
        http.get("/api/v1/second", undefined, { adapter })
      ])
    ).resolves.toEqual([
      { status: "rejected", reason: refreshError },
      { status: "rejected", reason: refreshError }
    ]);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.logout).toHaveBeenCalledWith(false);
    expect(mocks.message).toHaveBeenCalledTimes(1);
  });

  it("clears the shared refresh after an empty response and allows a later retry", async () => {
    mocks.token = {
      accessToken: "expired-access-token",
      expires: Date.now() - 1
    };
    mocks.username = "alice";
    mocks.refresh.mockResolvedValueOnce({});
    const http = await loadHttp();
    const adapter: AxiosAdapter = config =>
      resolveResponse(config, { authorization: authorization(config) });

    await expect(
      http.get("/api/v1/protected", undefined, { adapter })
    ).rejects.toThrow("Refresh response did not include an access token");

    refreshSuccessfully("recovered-access-token");

    await expect(
      http.get("/api/v1/protected", undefined, { adapter })
    ).resolves.toEqual({ authorization: "Bearer recovered-access-token" });
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });

  it("does not retry forever when the replay also returns 401", async () => {
    useValidToken();
    refreshSuccessfully();
    const http = await loadHttp();
    const adapter = vi.fn<AxiosAdapter>(config => rejectResponse(config, 401));

    await expect(
      http.get("/api/v1/protected", undefined, { adapter })
    ).rejects.toMatchObject({ response: { status: 401 } });
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });

  it.each([
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
    "/api/v1/auth/logout"
  ])("does not recover a 401 returned by %s", async url => {
    useValidToken();
    const http = await loadHttp();
    const adapter: AxiosAdapter = config => rejectResponse(config, 401);

    await expect(http.post(url, undefined, { adapter })).rejects.toMatchObject({
      response: { status: 401 }
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.logout).not.toHaveBeenCalled();
  });

  it("leaves non-401 errors unchanged", async () => {
    useValidToken();
    const http = await loadHttp();
    const adapter: AxiosAdapter = config => rejectResponse(config, 403);

    await expect(
      http.get("/api/v1/protected", undefined, { adapter })
    ).rejects.toMatchObject({ response: { status: 403 } });
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.logout).not.toHaveBeenCalled();
  });

  it("refreshes before sending a request when the local token expired", async () => {
    mocks.token = {
      accessToken: "expired-access-token",
      expires: Date.now() - 1
    };
    mocks.username = "alice";
    refreshSuccessfully();
    const http = await loadHttp();
    const adapter: AxiosAdapter = config =>
      resolveResponse(config, { authorization: authorization(config) });

    await expect(
      http.get("/api/v1/protected", undefined, { adapter })
    ).resolves.toEqual({ authorization: "Bearer new-access-token" });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
