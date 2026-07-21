import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  values: new Map<string, unknown>()
}));

vi.mock("@/store/modules/user", () => ({
  useUserStoreHook: () => ({
    SET_AVATAR: vi.fn(),
    SET_USERNAME: vi.fn(),
    SET_NICKNAME: vi.fn(),
    SET_ROLES: vi.fn(),
    SET_PERMS: vi.fn(),
    logOut: mocks.logout
  })
}));

vi.mock("@pureadmin/utils", () => ({
  storageLocal: () => ({
    getItem: (key: string) => mocks.values.get(key) ?? null,
    setItem: (key: string, value: unknown) => mocks.values.set(key, value),
    removeItem: (key: string) => mocks.values.delete(key)
  }),
  isString: (value: unknown) => typeof value === "string",
  isIncludeAllChildren: (values: unknown[], permissions: unknown[]) =>
    values.every(value => permissions.includes(value))
}));

type StorageListener = (event: StorageEvent) => void;

async function loadAuth() {
  vi.resetModules();
  const listeners = new Map<string, StorageListener>();
  const localStorage = {} as Storage;

  vi.stubGlobal("document", { cookie: "" });
  vi.stubGlobal("window", {
    localStorage,
    addEventListener: vi.fn((name: string, listener: StorageListener) => {
      listeners.set(name, listener);
    }),
    removeEventListener: vi.fn((name: string) => {
      listeners.delete(name);
    })
  });

  return {
    auth: await import("./auth"),
    listeners,
    localStorage
  };
}

beforeEach(() => {
  mocks.logout.mockReset().mockResolvedValue(undefined);
  mocks.values.clear();
  vi.unstubAllGlobals();
});

describe("cross-tab authentication synchronization", () => {
  it("logs out locally when another tab removes the user information", async () => {
    const { auth, listeners, localStorage } = await loadAuth();
    auth.setToken({
      accessToken: "access-token",
      expires: Date.now() + 60_000,
      username: "alice",
      roles: [],
      permissions: []
    });
    const removeListener = auth.setupAuthSync();

    listeners.get("storage")?.({
      key: auth.userKey,
      newValue: null,
      storageArea: localStorage
    } as StorageEvent);

    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.logout).toHaveBeenCalledWith(false);
    removeListener();
    expect(listeners.has("storage")).toBe(false);
  });

  it("does not react to unrelated storage changes", async () => {
    const { auth, listeners, localStorage } = await loadAuth();
    auth.setToken({
      accessToken: "access-token",
      expires: Date.now() + 60_000,
      username: "alice",
      roles: [],
      permissions: []
    });
    auth.setupAuthSync();

    listeners.get("storage")?.({
      key: "another-key",
      newValue: null,
      storageArea: localStorage
    } as StorageEvent);

    expect(mocks.logout).not.toHaveBeenCalled();
  });
});
