import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetConsultationDraftStore, useConsultationDraftStore } from "../../flows/consultation/consultationDraftStore";
import { resetConsultationFlowStore, useConsultationFlowStore } from "../../flows/consultation/consultationFlowStore";
import { resetAppStore, useAppStore } from "../../stores/appStore";
import { resetSessionStore, useSessionStore, type PrototypeSession } from "../../stores/sessionStore";
import { SessionList } from "./SessionList";

describe("SessionList", () => {
  beforeEach(() => {
    resetAppStore();
    resetSessionStore();
    resetConsultationFlowStore();
    resetConsultationDraftStore();
  });

  it("只显示当前咨询师，当前会谈独立，历史默认折叠", () => {
    useSessionStore.setState({
      currentCounselorId: "chengling",
      activeSessionId: "current",
      sessions: [
        session({ id: "current", title: "当前会谈", counselorId: "chengling", status: "active", updatedAt: "2026-07-12T12:00:00.000Z" }),
        session({ id: "old", title: "程灵旧会谈", counselorId: "chengling", status: "ended", updatedAt: "2026-07-11T12:00:00.000Z" }),
        session({ id: "draft", title: "程灵未开始", counselorId: "chengling", status: "draft", updatedAt: "2026-07-10T12:00:00.000Z" }),
        session({ id: "other", title: "周舟旧会谈", counselorId: "zhouzhou", status: "ended", updatedAt: "2026-07-12T13:00:00.000Z" })
      ]
    });

    render(<SessionList onOpenSettings={vi.fn()} onRequestNewConsultation={vi.fn()} />);

    expect(screen.getByRole("button", { name: "会谈记录" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { name: "新建会谈 结束当前咨询并开始新咨询" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { name: "会谈记录 查看当前与历史会谈" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { name: "设置 调整模型与使用偏好" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "会谈记录" }));

    expect(screen.getByRole("complementary", { name: "会谈导航" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "会谈记录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭会谈记录" })).toBeInTheDocument();

    expect(screen.getByText("当前会谈", { selector: ".session-title" })).toBeInTheDocument();
    expect(screen.getByText("程灵 · 进行中")).toBeInTheDocument();
    expect(screen.queryByText("程灵旧会谈")).not.toBeInTheDocument();
    expect(screen.queryByText("程灵未开始")).not.toBeInTheDocument();
    expect(screen.queryByText("周舟旧会谈")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /历史会谈（1）/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "删除会谈 当前会谈" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "会谈操作 当前会谈" }));
    expect(screen.getByRole("menuitem", { name: "重命名" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /历史会谈（1）/ }));
    expect(screen.getByText("程灵旧会谈")).toBeInTheDocument();
    expect(screen.getByText("程灵 · 已结束")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除会谈 程灵旧会谈" })).toBeInTheDocument();
    expect(screen.queryByText("周舟旧会谈")).not.toBeInTheDocument();
  });

  it("侧栏新建交给咨询室统一判断是否需要确认", () => {
    const current = session({ id: "current", title: "当前会谈", counselorId: "chengling", status: "active" });
    useSessionStore.setState({
      currentCounselorId: "chengling",
      activeSessionId: current.id,
      sessions: [current]
    });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: current.id });
    useConsultationDraftStore.getState().setDraft(current.id, "还没发出去");
    const onRequestNewConsultation = vi.fn();

    render(<SessionList onOpenSettings={vi.fn()} onRequestNewConsultation={onRequestNewConsultation} />);
    fireEvent.click(screen.getByRole("button", { name: "结束当前咨询并与这位咨询师开始新会谈" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onRequestNewConsultation).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().activePage).toBe("room");
  });

  it("重命名在本地保存成功后才关闭输入框", async () => {
    const current = session({ id: "current", title: "原会谈名称", counselorId: "chengling", status: "active" });
    useSessionStore.setState({
      currentCounselorId: "chengling",
      activeSessionId: current.id,
      isSidebarCollapsed: false,
      sessions: [current]
    });

    render(<SessionList onOpenSettings={vi.fn()} onRequestNewConsultation={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "会谈操作 原会谈名称" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "重命名" }));
    fireEvent.change(screen.getByRole("textbox", { name: "重命名会谈" }), { target: { value: "更新后的会谈名称" } });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "重命名会谈" }), { key: "Enter" });

    await waitFor(() => expect(screen.getByText("更新后的会谈名称", { selector: ".session-title" })).toBeInTheDocument());
    expect(screen.queryByRole("textbox", { name: "重命名会谈" })).not.toBeInTheDocument();
  });

  it("侧栏设置把离开判断交给咨询室统一处理，不调用浏览器确认框", () => {
    const current = session({ id: "current", title: "当前会谈", counselorId: "chengling", status: "active" });
    useSessionStore.setState({ currentCounselorId: "chengling", activeSessionId: current.id, sessions: [current] });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: current.id });
    useConsultationDraftStore.getState().setDraft(current.id, "还没发出去");
    const onOpenSettings = vi.fn();
    const confirm = vi.spyOn(window, "confirm");

    render(<SessionList onOpenSettings={onOpenSettings} onRequestNewConsultation={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "设置" }));

    expect(confirm).not.toHaveBeenCalled();
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().activePage).toBe("room");
  });

  it("咨询室操作在默认收起与展开后的侧栏中都保持可用", () => {
    const roomActions = <button type="button">返回等待室</button>;

    render(<SessionList onOpenSettings={vi.fn()} onRequestNewConsultation={vi.fn()} roomActions={roomActions} />);

    expect(screen.getByRole("button", { name: "返回等待室" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "会谈记录" }));
    expect(screen.getByRole("button", { name: "返回等待室" })).toBeInTheDocument();
  });

  it("历史会谈展开状态在侧栏重建后仍保留，并在切换咨询师时隔离", () => {
    const histories = Array.from({ length: 5 }, (_, index) => session({
      id: `old-${index + 1}`,
      title: `程灵旧会谈 ${index + 1}`,
      counselorId: "chengling",
      status: "ended"
    }));
    useSessionStore.setState({
      currentCounselorId: "chengling",
      activeSessionId: "current",
      isSidebarCollapsed: false,
      sessions: [
        session({ id: "current", title: "当前会谈", counselorId: "chengling", status: "active" }),
        ...histories,
        session({ id: "zhouzhou-old", title: "周舟旧会谈", counselorId: "zhouzhou", status: "ended" })
      ]
    });

    const { unmount } = render(<SessionList onOpenSettings={vi.fn()} onRequestNewConsultation={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /历史会谈（5）/ }));
    expect(screen.getByText("程灵旧会谈 5")).toBeInTheDocument();

    unmount();
    render(<SessionList onOpenSettings={vi.fn()} onRequestNewConsultation={vi.fn()} />);
    expect(screen.getByRole("button", { name: /历史会谈（5）/ })).toHaveAttribute("aria-expanded", "true");

    act(() => useSessionStore.setState({ currentCounselorId: "zhouzhou", activeSessionId: "zhouzhou-old" }));
    expect(screen.getByRole("button", { name: /历史会谈（0）/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("浏览旧历史时侧栏新建不会跳转到预约入口", () => {
    const active = session({ id: "active", title: "进行中的咨询", counselorId: "chengling", status: "active" });
    const archived = session({ id: "archived", title: "旧历史", counselorId: "chengling", status: "ended" });
    useSessionStore.setState({
      currentCounselorId: "chengling",
      activeSessionId: archived.id,
      sessions: [active, archived]
    });
    useConsultationFlowStore.getState().openPersistedSession({
      counselorId: "chengling",
      sessionId: archived.id,
      status: "ended"
    });

    render(<SessionList onOpenSettings={vi.fn()} onRequestNewConsultation={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "结束当前咨询并与这位咨询师开始新会谈" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(useConsultationFlowStore.getState().flow).toMatchObject({ sessionId: archived.id });
    expect(useAppStore.getState().activePage).toBe("room");
  });
});

function session(overrides: Partial<PrototypeSession> & Pick<PrototypeSession, "id" | "title" | "counselorId" | "status">): PrototypeSession {
  return {
    time: "刚刚",
    preview: "",
    roomThemeId: "warm-study",
    modelName: "test",
    messages: [],
    ...overrides
  };
}
