import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CounselingSession, SessionMessage } from "@shared/index";
import { resetSettingsStore, useSettingsStore } from "../../../../stores/settingsStore";
import { resetSessionStore } from "../../../../stores/sessionStore";
import { ConsultationRecordsFeature } from "./ConsultationRecordsFeature";

const sessions: CounselingSession[] = [
  { id: "session-fatigue", title: "我自己命名的疲惫", counselorId: "chengling", roomThemeId: "warm-study", teamId: "one-way-mirror", modelName: "deepseek-v4-pro", status: "ended", createdAt: "2026-07-12T08:00:00.000Z", startedAt: "2026-07-12T08:00:00.000Z", updatedAt: "2026-07-12T09:00:00.000Z", endedAt: "2026-07-12T09:00:00.000Z" },
  { id: "session-goodbye", title: "一次没有说完的告别", counselorId: "zhouzhou", roomThemeId: "warm-study", teamId: "one-way-mirror", modelName: "deepseek-v4-pro", status: "ended", createdAt: "2026-07-09T08:00:00.000Z", startedAt: "2026-07-09T08:00:00.000Z", updatedAt: "2026-07-09T09:00:00.000Z", endedAt: "2026-07-09T09:00:00.000Z" }
];

const messages: SessionMessage[] = [
  { id: "message-user", sessionId: "session-fatigue", role: "user", content: "最近总是觉得很累。", createdAt: "2026-07-12T08:05:00.000Z", status: "sent" },
  { id: "message-counselor", sessionId: "session-fatigue", role: "assistant", content: "听起来，这种累已经陪着你一段时间了。", createdAt: "2026-07-12T08:06:00.000Z", status: "sent" }
];

describe("ConsultationRecordsFeature", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.unstubAllGlobals();
    resetSessionStore();
    resetSettingsStore();
    useSettingsStore.setState({ profile: { displayName: "小满", background: "" } });
  });

  it("shows ended sessions with their user-provided titles and mirrored participant metadata", async () => {
    stubDesktop();
    render(<ConsultationRecordsFeature />);

    expect((await screen.findAllByText("我自己命名的疲惫")).length).toBeGreaterThan(0);
    expect(screen.getByRole("navigation", { name: "按记录与咨询师筛选会谈" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "会谈列表" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "会谈记录预览" })).toBeInTheDocument();
    expect(await screen.findByText("小满")).toBeInTheDocument();
    expect(screen.getAllByText("程灵").length).toBeGreaterThan(0);
    expect(screen.getByText("群心心理工作室")).toBeInTheDocument();
    expect(screen.getByText("CONSULTATION ARCHIVE")).toBeInTheDocument();
  });

  it("shows one unified empty state when there are no records", async () => {
    vi.stubGlobal("lingDesktop", {
      sessions: { list: vi.fn(async () => ({ ok: true as const, data: [] })) }
    });
    render(<ConsultationRecordsFeature />);

    expect(await screen.findByText("还没有会谈记录")).toBeInTheDocument();
    expect(screen.queryByText("选择一场会谈")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "会谈记录状态" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "会谈列表" })).not.toBeInTheDocument();
  });

  it("filters records by counselor and search without changing the original titles", async () => {
    stubDesktop();
    render(<ConsultationRecordsFeature />);
    await screen.findAllByText("我自己命名的疲惫");
    await screen.findByText("听起来，这种累已经陪着你一段时间了。");

    fireEvent.click(screen.getByRole("button", { name: "周舟" }));
    expect(screen.queryByText("我自己命名的疲惫")).not.toBeInTheDocument();
    expect(screen.getAllByText("一次没有说完的告别").length).toBeGreaterThan(0);
    await screen.findByText("这场会谈还没有可回看的消息");

    fireEvent.click(screen.getByRole("button", { name: "所有记录" }));
    fireEvent.change(screen.getByPlaceholderText("搜索会谈或咨询师"), { target: { value: "疲惫" } });
    expect(screen.getAllByText("我自己命名的疲惫").length).toBeGreaterThan(0);
  });

  it("renames and deletes a selected record through app-owned dialogs", async () => {
    const { update, remove } = stubDesktop();
    render(<ConsultationRecordsFeature />);
    await screen.findAllByText("我自己命名的疲惫");

    fireEvent.click(screen.getByRole("button", { name: "打开“我自己命名的疲惫”的操作" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "重命名" }));
    const dialog = screen.getByRole("dialog", { name: "重命名会谈" });
    fireEvent.change(within(dialog).getByDisplayValue("我自己命名的疲惫"), { target: { value: "新的会谈名称" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));
    await waitFor(() => {
      expect(update).toHaveBeenCalledWith("session-fatigue", expect.objectContaining({ title: "新的会谈名称" }));
      expect(screen.getAllByText("新的会谈名称").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "打开“新的会谈名称”的操作" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "删除" }));
    expect(screen.getByRole("dialog", { name: "删除会谈确认" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("session-fatigue"));
    expect(screen.queryByText("新的会谈名称")).not.toBeInTheDocument();
  });

  it("opens the complete scrollable transcript when a record is double-clicked", async () => {
    stubDesktop();
    render(<ConsultationRecordsFeature />);
    const record = await screen.findByRole("button", { name: "我自己命名的疲惫 程灵 2026年7月12日" });

    fireEvent.doubleClick(record);

    const dialog = screen.getByRole("dialog", { name: "我自己命名的疲惫完整会谈记录" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "← 返回会谈列表" })).toBeInTheDocument();
    expect(await within(dialog).findByText("听起来，这种累已经陪着你一段时间了。")).toBeInTheDocument();
  });

  it("opens the complete reader from the preview action", async () => {
    stubDesktop();
    render(<ConsultationRecordsFeature />);
    const openReader = await screen.findByRole("button", { name: "打开完整记录" });

    fireEvent.click(openReader);

    expect(screen.getByRole("dialog", { name: "我自己命名的疲惫完整会谈记录" })).toBeInTheDocument();
  });
});

function stubDesktop() {
  const update = vi.fn(async () => ({ ok: true as const, data: undefined }));
  const remove = vi.fn(async () => ({ ok: true as const, data: undefined }));
  vi.stubGlobal("lingDesktop", {
    sessions: { list: vi.fn(async () => ({ ok: true as const, data: sessions })), update, delete: remove },
    messages: { listBySessionId: vi.fn(async (sessionId: string) => ({ ok: true as const, data: sessionId === "session-fatigue" ? messages : [] })) }
  });
  return { update, remove };
}
