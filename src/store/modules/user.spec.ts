import { createPinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refreshTokenApi: vi.fn(),
  setToken: vi.fn()
}));

vi.mock("@/api/user", () => ({
  getLogin: vi.fn(),
  logoutApi: vi.fn(),
  refreshTokenApi: mocks.refreshTokenApi
}));

vi.mock("../utils", async () => {
  const { createPinia } = await import("pinia");

  return {
    store: createPinia(),
    router: {
      currentRoute: { value: { path: "/login" } },
      push: vi.fn()
    },
    resetRouter: vi.fn(),
    routerArrays: [],
    storageLocal: () => ({
      getItem: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn()
    })
  };
});

vi.mock("./multiTags", () => ({
  useMultiTagsStoreHook: () => ({ handleTags: vi.fn() })
}));

vi.mock("@/utils/auth", () => ({
  setToken: mocks.setToken,
  removeToken: vi.fn(),
  userKey: "user-info"
}));

import { useUserStore } from "./user";

beforeEach(() => {
  mocks.refreshTokenApi.mockReset();
  mocks.setToken.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("user token refresh", () => {
  it.each([undefined, {}, { data: null }, { data: {} }])(
    "rejects an invalid refresh response: %j",
    async response => {
      mocks.refreshTokenApi.mockResolvedValue(response);
      const userStore = useUserStore(createPinia());

      await expect(userStore.handRefreshToken()).rejects.toThrow(
        "Refresh response did not include an access token"
      );
      expect(mocks.setToken).not.toHaveBeenCalled();
    }
  );

  it("stores and returns a valid refresh response", async () => {
    const response = {
      data: {
        accessToken: "refreshed-access-token",
        expires: Date.now() + 60_000,
        username: "alice",
        roles: ["operator"],
        permissions: ["user:list"]
      }
    };
    mocks.refreshTokenApi.mockResolvedValue(response);
    const userStore = useUserStore(createPinia());

    await expect(userStore.handRefreshToken()).resolves.toBe(response);
    expect(mocks.setToken).toHaveBeenCalledWith(response.data);
  });

  it("shares one refresh across concurrent callers in the same tab", async () => {
    let completeRefresh: ((response: RefreshResponse) => void) | undefined;
    const response = validRefreshResponse("shared-access-token");
    mocks.refreshTokenApi.mockImplementation(
      () =>
        new Promise(resolve => {
          completeRefresh = resolve;
        })
    );
    const userStore = useUserStore(createPinia());

    const first = userStore.handRefreshToken();
    const second = userStore.handRefreshToken();

    expect(mocks.refreshTokenApi).toHaveBeenCalledTimes(1);
    completeRefresh?.(response);

    await expect(Promise.all([first, second])).resolves.toEqual([
      response,
      response
    ]);
    expect(mocks.setToken).toHaveBeenCalledTimes(1);
  });

  it("serializes the refresh operation with the cross-tab lock", async () => {
    const response = validRefreshResponse("locked-access-token");
    const request = vi.fn(async (_name: string, callback: () => unknown) =>
      callback()
    );
    vi.stubGlobal("navigator", { locks: { request } });
    mocks.refreshTokenApi.mockResolvedValue(response);
    const userStore = useUserStore(createPinia());

    await expect(userStore.handRefreshToken()).resolves.toBe(response);

    expect(request).toHaveBeenCalledWith(
      "elixadmin-refresh-token",
      expect.any(Function)
    );
    expect(mocks.refreshTokenApi).toHaveBeenCalledTimes(1);
  });

  it("clears a failed refresh so a later caller can retry", async () => {
    const response = validRefreshResponse("recovered-access-token");
    mocks.refreshTokenApi
      .mockRejectedValueOnce(new Error("refresh failed"))
      .mockResolvedValueOnce(response);
    const userStore = useUserStore(createPinia());

    await expect(userStore.handRefreshToken()).rejects.toThrow(
      "refresh failed"
    );
    await expect(userStore.handRefreshToken()).resolves.toBe(response);

    expect(mocks.refreshTokenApi).toHaveBeenCalledTimes(2);
    expect(mocks.setToken).toHaveBeenCalledTimes(1);
  });
});

type RefreshResponse = {
  data: {
    accessToken: string;
    expires: number;
    username: string;
    roles: string[];
    permissions: string[];
  };
};

function validRefreshResponse(accessToken: string): RefreshResponse {
  return {
    data: {
      accessToken,
      expires: Date.now() + 60_000,
      username: "alice",
      roles: ["operator"],
      permissions: ["user:list"]
    }
  };
}
