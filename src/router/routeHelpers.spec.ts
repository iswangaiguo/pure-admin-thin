import { describe, expect, it, vi } from "vitest";
import { createSingleFlight, resolveRouteComponent } from "./routeHelpers";

describe("createSingleFlight", () => {
  it("shares one in-flight operation between concurrent callers", async () => {
    let resolveOperation: (value: string) => void;
    const operation = vi.fn(
      () =>
        new Promise<string>(resolve => {
          resolveOperation = resolve;
        })
    );
    const run = createSingleFlight(operation);

    const first = run();
    const second = run();

    expect(first).toBe(second);
    expect(operation).toHaveBeenCalledTimes(1);

    resolveOperation!("ready");
    await expect(first).resolves.toBe("ready");
  });

  it("clears a rejected operation so a later call can retry", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("route request failed"))
      .mockResolvedValueOnce("recovered");
    const run = createSingleFlight(operation);

    await expect(run()).rejects.toThrow("route request failed");
    await expect(run()).resolves.toBe("recovered");
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe("resolveRouteComponent", () => {
  const userView = vi.fn();
  const userCopyView = vi.fn();
  const reportView = vi.fn();
  const modules = {
    "/src/views/system/user/index.vue": userView,
    "/src/views/system/user/index-copy.vue": userCopyView,
    "/src/views/report/index.tsx": reportView
  };

  it("resolves Vue and TSX components by their exact path", () => {
    expect(resolveRouteComponent("system/user/index", modules)).toBe(userView);
    expect(resolveRouteComponent("/src/views/report/index.tsx", modules)).toBe(
      reportView
    );
  });

  it("does not use a partial path match", () => {
    expect(() => resolveRouteComponent("system/user/ind", modules)).toThrow(
      "Route component not found"
    );
  });

  it.each([
    "",
    "../system/user/index",
    "system\\user\\index",
    "https://example.com/view",
    "system//user/index"
  ])("rejects an invalid component path: %s", component => {
    expect(() => resolveRouteComponent(component, modules)).toThrow(
      "Invalid route component"
    );
  });
});
