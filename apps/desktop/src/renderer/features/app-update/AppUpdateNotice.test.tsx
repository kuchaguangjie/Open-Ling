import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetSettingsStore } from "../../stores/settingsStore";
import { AppUpdateNotice } from "./AppUpdateNotice";

describe("AppUpdateNotice", () => {
  beforeEach(() => {
    resetSettingsStore();
    vi.unstubAllGlobals();
  });

  it("shows a non-blocking notice and opens the official download page", async () => {
    const openDownloadPage = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", {
      updates: {
        getStatus: vi.fn(async () => ({
          ok: true,
          data: { state: "available", currentVersion: "1.0.0", availableVersion: "1.0.1" }
        })),
        openDownloadPage,
        onStatusChanged: vi.fn(() => () => undefined)
      }
    });

    render(<AppUpdateNotice />);

    fireEvent.click(await screen.findByRole("button", { name: "前往官网下载" }));
    await waitFor(() => expect(openDownloadPage).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "暂时关闭新版本提示" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
