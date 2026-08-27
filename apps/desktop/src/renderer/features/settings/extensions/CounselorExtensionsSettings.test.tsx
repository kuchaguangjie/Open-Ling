import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { builtinCounselorPackages, counselorPackageRegistry } from "@shared/index";
import { resetSettingsStore } from "../../../stores/settingsStore";
import { resetAppStore, useAppStore } from "../../../stores/appStore";
import { CounselorExtensionsSettings } from "./CounselorExtensionsSettings";

const manifest = structuredClone(builtinCounselorPackages[0]);
manifest.id = "settings-community-listener";
manifest.version = "0.2.0";
manifest.publisher = { name: "Community Studio" };
manifest.localizations["zh-CN"] = {
  ...manifest.localizations["zh-CN"],
  name: "社区倾听者",
  title: "社区整合取向咨询师"
};

describe("CounselorExtensionsSettings", () => {
  beforeEach(() => {
    resetSettingsStore();
    resetAppStore();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    if (counselorPackageRegistry.get(manifest.id)?.source.kind === "host") {
      counselorPackageRegistry.unregister(manifest.id);
    }
  });

  it("explains the local import boundary without exposing internal supervisor names", async () => {
    vi.stubGlobal("lingDesktop", {
      counselorPackages: {
        list: vi.fn(async () => ({ ok: true as const, data: [manifest] })),
        install: vi.fn(),
        remove: vi.fn()
      }
    });

    render(<CounselorExtensionsSettings />);

    expect(screen.getByRole("heading", { name: "咨询师扩展" })).toBeInTheDocument();
    expect(screen.getByText(/仍会接入 Ling 的基础安全、记忆和会后流程/)).toBeInTheDocument();
    expect(screen.getByText(/回应效果和安全表现也可能不及官方咨询师/)).toBeInTheDocument();
    expect(screen.getByText(/咨询师角色扩展规范与示例将在公开仓库开放后提供/)).toBeInTheDocument();
    expect(screen.queryByText(/github\.com\/Ling-Team\/Open-Ling/)).not.toBeInTheDocument();
    expect(screen.queryByText(/李艳云/)).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "社区倾听者" })).toBeInTheDocument();
    expect(screen.getByText("Community Studio · v0.2.0 · CC-BY-4.0")).toBeInTheDocument();
  });

  it("previews, imports, disables, enables and removes a package through the desktop bridge", async () => {
    const install = vi.fn(async (previewToken?: string) => previewToken ? ({
      ok: true as const,
      data: { status: "installed" as const, manifest }
    }) : ({
      ok: true as const,
      data: { status: "preview" as const, manifest, previewToken: "preview-1" }
    }));
    const remove = vi.fn(async () => ({
      ok: true as const,
      data: { status: "removed" as const, packageId: manifest.id }
    }));
    vi.stubGlobal("lingDesktop", {
      counselorPackages: {
        list: vi.fn(async () => ({ ok: true as const, data: [] })),
        install,
        remove
      }
    });

    render(<CounselorExtensionsSettings />);
    fireEvent.click(screen.getByRole("button", { name: "选择并预览" }));

    expect(await screen.findByRole("heading", { name: "社区倾听者" })).toBeInTheDocument();
    expect(screen.getByText("本地导入 · 未经 Ling 官方审核")).toBeInTheDocument();
    expect(screen.getByText("Community Studio")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认导入" }));

    await waitFor(() => expect(screen.queryByText("本地导入 · 未经 Ling 官方审核")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "社区倾听者" })).toBeInTheDocument();
    expect(screen.getByText("本地导入")).toBeInTheDocument();
    expect(install).toHaveBeenNthCalledWith(1);
    expect(install).toHaveBeenNthCalledWith(2, "preview-1");
    fireEvent.click(screen.getByRole("button", { name: "开始咨询" }));
    expect(useAppStore.getState().consultationRequest?.counselorId).toBe(manifest.id);
    fireEvent.click(screen.getByRole("button", { name: "停用" }));
    expect(await screen.findByRole("button", { name: "重新启用" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始咨询" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "重新启用" }));
    expect(await screen.findByRole("button", { name: "停用" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "移除" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "社区倾听者" })).not.toBeInTheDocument());
    expect(remove).toHaveBeenCalledWith(manifest.id);
  });

  it("shows a controlled update preview and replaces the hosted manifest", async () => {
    const updatedManifest = structuredClone(manifest);
    updatedManifest.version = "0.3.0";
    const install = vi.fn(async (previewToken?: string) => previewToken ? ({
      ok: true as const,
      data: {
        status: "updated" as const,
        manifest: updatedManifest,
        previousVersion: manifest.version
      }
    }) : ({
      ok: true as const,
      data: {
        status: "preview" as const,
        manifest: updatedManifest,
        previewToken: "update-preview",
        currentVersion: manifest.version
      }
    }));
    vi.stubGlobal("lingDesktop", {
      counselorPackages: {
        list: vi.fn(async () => ({ ok: true as const, data: [manifest] })),
        install,
        remove: vi.fn()
      }
    });

    render(<CounselorExtensionsSettings />);
    await screen.findByText(/v0.2.0/);
    fireEvent.click(screen.getByRole("button", { name: "选择并预览" }));

    expect(await screen.findByText("当前版本")).toBeInTheDocument();
    expect(screen.getByText("新版本")).toBeInTheDocument();
    expect(screen.getByText("0.2.0")).toBeInTheDocument();
    expect(screen.getByText("0.3.0")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认更新" }));

    expect(await screen.findByText(/已从 v0.2.0 更新到 v0.3.0/)).toBeInTheDocument();
    expect(screen.getAllByText(/v0.3.0/)).toHaveLength(2);
    expect(counselorPackageRegistry.require(manifest.id).manifest.version).toBe("0.3.0");
  });
});
