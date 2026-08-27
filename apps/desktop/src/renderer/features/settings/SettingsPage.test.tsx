import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { resetAppStore } from "../../stores/appStore";
import { resetSettingsStore, useSettingsStore } from "../../stores/settingsStore";
import { SettingsPage } from "./SettingsPage";

describe("SettingsPage sidebar navigation", () => {
  beforeEach(() => {
    resetAppStore();
    resetSettingsStore();
  });

  it("keeps every English sidebar category clickable after changing the interface language", () => {
    render(<SettingsPage />);

    act(() => {
      useSettingsStore.getState().updateLocale("en-US");
    });

    const destinations = [
      ["Model connection", "Model connection"],
      ["Usage & fees", "Usage & fees"],
      ["Voice input", "Voice input"],
      ["Profile", "Profile"],
      ["Counseling continuity", "Counseling continuity"],
      ["Counselor extensions", "Counselor extensions"],
      ["Data & privacy", "Data & privacy"],
      ["Display & reading", "Display & reading"]
    ] as const;

    for (const [tabLabel, heading] of destinations) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(tabLabel) }));
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
  });

  it("keeps every Chinese sidebar category clickable", () => {
    render(<SettingsPage />);

    const destinations = ["模型接入", "用量与费用", "语音输入", "个人资料", "咨询连续性", "咨询师扩展", "数据与隐私", "界面与阅读"];

    for (const label of destinations) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(label) }));
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }
  });

  it("uses only the top-right close action and leaves the full sidebar to navigation", () => {
    const { container } = render(<SettingsPage />);

    expect(screen.getAllByRole("button", { name: "关闭系统设置" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "关闭设置" })).not.toBeInTheDocument();
    expect(container.querySelector(".settings-sidebar-footer")).not.toBeInTheDocument();
    expect(container.querySelector(".settings-sidebar-navigation")).toContainElement(
      screen.getByRole("navigation", { name: "Ling 设置分类" })
    );
  });

  it("keeps the sidebar navigation constrained to a real scrollable grid track", () => {
    const globalCss = readFileSync(resolve(process.cwd(), "apps/desktop/src/renderer/styles/global.css"), "utf8");
    const navigationRule = globalCss.match(/\.settings-sidebar-navigation\s*\{([^}]+)\}/)?.[1] ?? "";

    expect(globalCss).toContain("grid-template-rows: auto minmax(0, 1fr)");
    expect(navigationRule).toContain("align-self: stretch");
    expect(navigationRule).toContain("overflow-y: auto");
    expect(navigationRule).toContain("scrollbar-gutter: stable");
  });
});
