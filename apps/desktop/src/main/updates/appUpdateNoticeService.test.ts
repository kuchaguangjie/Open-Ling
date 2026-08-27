// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUpdateStatus } from "../../../../../packages/shared/src/index";

vi.mock("electron", () => ({
  app: { getVersion: () => "1.0.0" },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: vi.fn() },
  net: { fetch: vi.fn() },
  shell: { openExternal: vi.fn() }
}));

import { AppUpdateNoticeService, isNewerVersion } from "./appUpdateNoticeService";

describe("AppUpdateNoticeService", () => {
  let statuses: AppUpdateStatus[];

  beforeEach(() => {
    statuses = [];
  });

  it("reports a newer website version without downloading or installing anything", async () => {
    const openDownloadPage = vi.fn(async () => undefined);
    const service = new AppUpdateNoticeService({
      enabled: true,
      currentVersion: "1.0.0",
      fetchLatestRelease: async () => ({
        version: "1.0.1",
        downloadUrl: "https://ling.xiaoqunpsy.cn/downloads/1.0.1/Ling-1.0.1-win-x64.exe"
      }),
      openDownloadPage,
      now: () => new Date("2026-08-27T12:00:00.000Z"),
      broadcast: (status) => statuses.push(status)
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      state: "available",
      currentVersion: "1.0.0",
      availableVersion: "1.0.1",
      checkedAt: "2026-08-27T12:00:00.000Z"
    });
    expect(statuses[0]).toEqual({ state: "checking", currentVersion: "1.0.0" });

    await service.openDownloadPage();
    expect(openDownloadPage).toHaveBeenCalledWith(
      "https://ling.xiaoqunpsy.cn/downloads/1.0.1/Ling-1.0.1-win-x64.exe"
    );
  });

  it("keeps a failed check recoverable and leaves the app usable", async () => {
    const service = new AppUpdateNoticeService({
      enabled: true,
      currentVersion: "1.0.0",
      fetchLatestRelease: async () => { throw new Error("offline"); },
      broadcast: (status) => statuses.push(status)
    });

    await expect(service.checkForUpdates()).resolves.toEqual({
      state: "error",
      currentVersion: "1.0.0",
      message: "暂时无法检查新版本，请稍后重试。"
    });
  });

  it("does not make network requests in development or Ling Dev", async () => {
    const fetchLatestRelease = vi.fn(async () => ({
      version: "2.0.0",
      downloadUrl: "https://ling.xiaoqunpsy.cn/downloads/2.0.0/Ling-2.0.0-win-x64.exe"
    }));
    const service = new AppUpdateNoticeService({
      enabled: false,
      currentVersion: "1.0.0",
      fetchLatestRelease
    });

    await expect(service.checkForUpdates()).resolves.toEqual({ state: "disabled", currentVersion: "1.0.0" });
    expect(fetchLatestRelease).not.toHaveBeenCalled();
  });
});

describe("isNewerVersion", () => {
  it("compares stable semantic versions", () => {
    expect(isNewerVersion("1.0.13", "1.0.12")).toBe(true);
    expect(isNewerVersion("1.1.0", "1.0.99")).toBe(true);
    expect(isNewerVersion("1.0.12", "1.0.12")).toBe(false);
    expect(isNewerVersion("1.0.11", "1.0.12")).toBe(false);
  });
});
