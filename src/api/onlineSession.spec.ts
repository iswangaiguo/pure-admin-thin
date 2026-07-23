import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  request: vi.fn()
}));

vi.mock("@/utils/http", () => ({
  http: {
    request: mocks.request
  }
}));

import {
  getOnlineSessionList,
  getUserOnlineSessions,
  revokeOnlineSession,
  revokeUserOnlineSessions
} from "./onlineSession";

beforeEach(() => {
  mocks.request.mockReset();
});

describe("online session API", () => {
  it("lists sessions with the selected filters and pagination", () => {
    const params = {
      page: 2,
      pageSize: 50,
      keyword: "alice",
      provider: "password" as const,
      status: "online" as const
    };

    getOnlineSessionList(params);

    expect(mocks.request).toHaveBeenCalledWith(
      "get",
      "/api/v1/online-sessions",
      { params }
    );
  });

  it("loads one user's active sessions", () => {
    getUserOnlineSessions(42, { page: 1, pageSize: 20 });

    expect(mocks.request).toHaveBeenCalledWith(
      "get",
      "/api/v1/users/42/sessions",
      { params: { page: 1, pageSize: 20 } }
    );
  });

  it("revokes either one session or all sessions of a user", () => {
    revokeOnlineSession("session-id");
    revokeUserOnlineSessions(42);

    expect(mocks.request).toHaveBeenNthCalledWith(
      1,
      "delete",
      "/api/v1/online-sessions/session-id"
    );
    expect(mocks.request).toHaveBeenNthCalledWith(
      2,
      "delete",
      "/api/v1/users/42/sessions"
    );
  });
});
