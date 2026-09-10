import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetConsultationFlowStore, useConsultationFlowStore } from "../../flows/consultation/consultationFlowStore";
import { resetConsultationDraftStore, useConsultationDraftStore } from "../../flows/consultation/consultationDraftStore";
import { resetAppStore, useAppStore } from "../../stores/appStore";
import { resetSessionStore, useSessionStore, type PrototypeSession } from "../../stores/sessionStore";
import { CounselingRoomPage } from "../CounselingRoomPage";

vi.mock("../../media/imagePreload", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../media/imagePreload")>(),
  preloadDecodedImage: vi.fn(() => Promise.resolve())
}));

describe("咨询完整流程页面", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAppStore();
    resetSessionStore();
    resetConsultationFlowStore();
    resetConsultationDraftStore();
    vi.unstubAllGlobals();
  });

  it("draft 开场只挂载舞台，跳过并持久化 active 后才挂载正式输入", async () => {
    useSessionStore.setState({
      activeSessionId: "draft-1",
      currentCounselorId: "chengling",
      sessions: [session({ id: "draft-1", counselorId: "chengling", status: "draft" })]
    });
    useConsultationFlowStore.getState().openDraftSession({
      counselorId: "chengling",
      sessionId: "draft-1",
      script: "first"
    });

    render(<CounselingRoomPage />);

    expect(screen.getByRole("region", { name: "进入咨询室" })).toBeInTheDocument();
    expect(document.querySelector(".consultation-dialogue-portrait")).not.toBeInTheDocument();
    expect(document.querySelector(".consultation-dialogue-card")).not.toBeInTheDocument();
    act(() => useConsultationFlowStore.getState().finishArrival());

    expect(screen.getByRole("region", { name: "咨询开场" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "跳过开场" })).toBeInTheDocument();
    expect(document.querySelectorAll(".consultation-dialogue-panel-slice")).toHaveLength(9);
    expect(document.querySelector(".consultation-dialogue-nameplate")).toHaveTextContent("程灵心理咨询师");
    expect(document.querySelector(".consultation-dialogue-nameplate")).not.toHaveTextContent(/AI|工作室/);
    expect(screen.queryByText("继续")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "显示完整对白" })).toBeInTheDocument();
    expect(screen.queryByLabelText("会谈输入框")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "结束本次咨询" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("会谈列表")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "跳过开场" }));

    await waitFor(() => expect(useSessionStore.getState().sessions[0].status).toBe("active"));
    expect(await screen.findByLabelText("会谈输入框")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "结束本次咨询" })).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: "结束咨询说明" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "结束本次咨询" })).toHaveTextContent("结束");
  });

  it("咨询师立绘会在新画面解码后随会谈状态切换，且会话页不再显示右侧铭牌", async () => {
    const active = session({ id: "active-status", counselorId: "linleshui", status: "active" });
    useSessionStore.setState({
      activeSessionId: active.id,
      currentCounselorId: "linleshui",
      sessions: [active]
    });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "linleshui", sessionId: active.id });

    render(<CounselingRoomPage />);

    expect(document.querySelector(".portrait-person")).toHaveClass("portrait-motion-idle");
    expect(document.querySelector(".portrait-status-card")).not.toBeInTheDocument();

    act(() => useSessionStore.setState({
      activeStreamRequestId: "request-status",
      activeStreamSessionId: active.id,
      counselorStatus: "thinking"
    }));
    await waitFor(() => {
      expect(document.querySelector(".portrait-person")).toHaveClass("portrait-motion-thinking");
    });

    act(() => useSessionStore.setState({ counselorStatus: "streaming" }));
    await waitFor(() => {
      expect(document.querySelector(".portrait-person")).toHaveClass("portrait-motion-responding");
    });
  });

  it("模型思考或回应时，带咨询师姓名的提示每 3 秒轮换", () => {
    vi.useFakeTimers();
    const active = {
      ...session({ id: "active-response-activity", counselorId: "chengling", status: "active" }),
      messages: [{
        id: "assistant-sending",
        sessionId: "active-response-activity",
        role: "assistant" as const,
        content: "我听见了。",
        createdAt: "2026-07-12T12:00:00.000Z",
        status: "sending" as const
      }]
    };
    useSessionStore.setState({
      activeSessionId: active.id,
      activeStreamRequestId: "request-response-activity",
      activeStreamSessionId: active.id,
      counselorStatus: "thinking",
      currentCounselorId: "chengling",
      sessions: [active]
    });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: active.id });

    const view = render(<CounselingRoomPage />);
    try {
      expect(screen.getByText("程灵正在听你说")).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(3_000));
      expect(screen.getByText("程灵正在整理刚才的话")).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(3_000));
      expect(screen.getByText("程灵正在慢慢回应")).toBeInTheDocument();
    } finally {
      view.unmount();
      vi.useRealTimers();
    }
  });

  it("确认结束后播放收尾，并说明来信与历史记录的入口", async () => {
    useSessionStore.setState({
      activeSessionId: "active-1",
      currentCounselorId: "zhouzhou",
      sessions: [session({ id: "active-1", counselorId: "zhouzhou", status: "active" })]
    });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "zhouzhou", sessionId: "active-1" });

    const endSession = vi.fn(async () => ({ ok: true as const, state: "ended" as const, endedAt: "2026-07-12T12:00:00.000Z" }));
    useSessionStore.setState({ endSession });
    render(<CounselingRoomPage />);
    fireEvent.click(screen.getByRole("button", { name: "结束本次咨询" }));

    expect(screen.getByRole("dialog", { name: "结束本次咨询？" })).toBeInTheDocument();
    expect(screen.getByText(/转为只读，不能再继续发送消息/)).toBeInTheDocument();
    expect(screen.getByText(/准备咨询师来信/)).toBeInTheDocument();
    expect(endSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "继续当前咨询" }));
    expect(screen.queryByRole("dialog", { name: "结束本次咨询？" })).not.toBeInTheDocument();
    expect(endSession).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "结束本次咨询" }));
    fireEvent.click(screen.getByRole("button", { name: "确认结束" }));

    expect(await screen.findByRole("region", { name: "咨询收尾" })).toBeInTheDocument();
    expect(endSession).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("会谈输入框")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "显示完整对白" }));
    fireEvent.click(screen.getByRole("button", { name: "继续" }));

    expect(screen.getByRole("button", { name: "查看历史记录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "阅读咨询师的信" })).toBeInTheDocument();
    expect(screen.getByText(/沙发区的「历史记录」/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回等待室" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看历史记录" }));
    expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续咨询" })).toBeInTheDocument();
    expect(screen.queryByLabelText("咨询师的来信")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "返回" }));
    expect(screen.getByRole("button", { name: "返回等待室" })).toBeInTheDocument();
  });

  it("空输入时发送按钮禁用，超长粘贴转成可移除文本资料，自然输入不转换", () => {
    const active = session({ id: "active-long-input", counselorId: "chengling", status: "active" });
    useSessionStore.setState({
      activeSessionId: active.id,
      currentCounselorId: "chengling",
      sessions: [active]
    });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: active.id });
    render(<CounselingRoomPage />);

    const input = screen.getByLabelText("会谈输入框");
    const send = screen.getByRole("button", { name: "发送" });
    expect(send).toBeDisabled();

    const typedLongText = "慢慢输入".repeat(5_100);
    fireEvent.change(input, { target: { value: typedLongText } });
    expect(useConsultationDraftStore.getState().attachmentsBySessionId[active.id] ?? []).toHaveLength(0);
    expect(send).toBeEnabled();

    fireEvent.change(input, { target: { value: "" } });
    const pastedLongText = "一次粘贴的长文本".repeat(2_600);
    fireEvent.paste(input, { clipboardData: { getData: () => pastedLongText } });

    expect(screen.getByText("粘贴的长文本.txt")).toBeInTheDocument();
    expect(screen.getByText(/已将这次粘贴的约 .* 字转为文本资料/)).toBeInTheDocument();
    expect(useConsultationDraftStore.getState().draftsBySessionId[active.id] ?? "").toBe("");
    expect(useConsultationDraftStore.getState().attachmentsBySessionId[active.id]).toHaveLength(1);
    expect(send).toBeEnabled();
  });

  it("返回等待室不再需要确认", () => {
    const active = session({ id: "active-leave", counselorId: "chengling", status: "active" });
    useSessionStore.setState({
      activeSessionId: active.id,
      currentCounselorId: "chengling",
      sessions: [active]
    });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: active.id });
    render(<CounselingRoomPage />);
    fireEvent.click(screen.getByRole("button", { name: "返回等待室" }));

    expect(useConsultationFlowStore.getState().flow).toBeNull();
    expect(useAppStore.getState().activePage).toBe("lobby");
  });

  it("收尾页提供来信阅读入口，并能打开当前会谈的信", async () => {
    const endedSession = session({ id: "ended-ready", counselorId: "linleshui", status: "ended" });
    const now = "2026-07-12T12:00:00.000Z";
    useSessionStore.setState({
      activeSessionId: endedSession.id,
      currentCounselorId: "linleshui",
      sessions: [endedSession],
      sessionLettersBySessionId: {
        [endedSession.id]: {
          id: "letter-ready",
          sessionId: endedSession.id,
          counselorId: "linleshui",
          modelName: "test",
          letterMd: "亲爱的你：\n\n慢慢来。\n\n林乐水",
          status: "ready",
          createdAt: now,
          updatedAt: now
        }
      }
    });
    useConsultationFlowStore.getState().setFlow({
      counselorId: "linleshui",
      sessionId: endedSession.id,
      script: "returning",
      surface: { kind: "closing-menu" }
    });
    const loadSessionLetter = vi.fn(async () => ({ ok: true as const, availability: "ready" as const, letter: null }));
    useSessionStore.setState({ loadSessionLetter });

    render(<CounselingRoomPage />);
    expect(screen.getByRole("button", { name: "查看历史记录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回等待室" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "阅读咨询师的信" }));
    expect(loadSessionLetter).toHaveBeenCalledWith(endedSession.id);
    expect(await screen.findByRole("dialog", { name: "林乐水写给你的信" })).toBeInTheDocument();
  });

  it("来信仍在生成时保留收尾页和四个出口，不显示空白页面", () => {
    const endedSession = session({ id: "ended-pending", counselorId: "chengling", status: "ended" });
    useSessionStore.setState({
      activeSessionId: endedSession.id,
      currentCounselorId: "chengling",
      sessions: [endedSession]
    });
    useConsultationFlowStore.getState().setFlow({
      counselorId: "chengling",
      sessionId: endedSession.id,
      script: "returning",
      surface: { kind: "closing-notice", reason: "letter-pending" }
    });

    render(<CounselingRoomPage />);

    expect(screen.getByRole("region", { name: "咨询收尾" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("正在写");
    expect(screen.getByRole("button", { name: "查看历史记录" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "阅读咨询师的信" })).toBeInTheDocument();
    // The plain case — one ended session, nothing else unfinished — must be
    // clickable, not merely present.
    expect(screen.getByRole("button", { name: "继续咨询" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "返回等待室" })).toBeInTheDocument();
  });

  it("这位咨询师还有未完成会谈时，收尾页的「继续咨询」被拦下并说明原因", () => {
    const endedSession = session({ id: "ended-blocked", counselorId: "chengling", status: "ended" });
    const unfinished = session({ id: "still-open", counselorId: "chengling", status: "active" });
    useSessionStore.setState({
      activeSessionId: endedSession.id,
      currentCounselorId: "chengling",
      sessions: [endedSession, unfinished]
    });
    useConsultationFlowStore.getState().setFlow({
      counselorId: "chengling",
      sessionId: endedSession.id,
      script: "returning",
      surface: { kind: "closing-menu" }
    });

    render(<CounselingRoomPage />);

    // Same condition the database transaction refuses on, so the button says so
    // up front instead of failing on click.
    const resume = screen.getByRole("button", { name: "继续咨询" });
    expect(resume).toBeDisabled();
    expect(resume).toHaveAttribute("title", "这位咨询师还有一次尚未完成的咨询，请先继续或结束它。");
    expect(screen.getByRole("status")).toHaveTextContent("这位咨询师还有一次尚未完成的咨询");
  });

  it("不是最近结束的那一场时，收尾页的「继续咨询」被拦下并说明原因", () => {
    const endedSession = session({ id: "ended-older", counselorId: "chengling", status: "ended" });
    const newer = session({
      id: "ended-newer",
      counselorId: "chengling",
      status: "ended",
      endedAt: "2099-01-01T00:00:00.000Z"
    });
    useSessionStore.setState({
      activeSessionId: endedSession.id,
      currentCounselorId: "chengling",
      sessions: [endedSession, newer]
    });
    useConsultationFlowStore.getState().setFlow({
      counselorId: "chengling",
      sessionId: endedSession.id,
      script: "returning",
      surface: { kind: "closing-menu" }
    });

    render(<CounselingRoomPage />);

    expect(screen.getByRole("button", { name: "继续咨询" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("只能继续与这位咨询师最近结束的会谈");
  });

  it("从收尾页直接继续咨询，回到可继续说话的会谈页", async () => {
    const endedSession = session({ id: "ended-notice-resume", counselorId: "chengling", status: "ended" });
    const resumeSession = vi.fn(async () => ({ ok: true as const }));
    useSessionStore.setState({
      activeSessionId: endedSession.id,
      currentCounselorId: "chengling",
      sessions: [endedSession],
      resumeSession
    });
    useConsultationFlowStore.getState().setFlow({
      counselorId: "chengling",
      sessionId: endedSession.id,
      script: "returning",
      surface: { kind: "closing-notice", reason: "letter-pending" }
    });

    render(<CounselingRoomPage />);
    fireEvent.click(screen.getByRole("button", { name: "继续咨询" }));

    await waitFor(() => expect(resumeSession).toHaveBeenCalledWith(endedSession.id));
    expect(useConsultationFlowStore.getState().flow?.surface).toEqual({ kind: "session" });
  });

  it("恢复时落在普通会谈页的已结束会谈，侧栏仍能继续咨询", async () => {
    const endedSession = session({ id: "ended-sidebar-resume", counselorId: "zhouzhou", status: "ended" });
    const resumeSession = vi.fn(async () => ({ ok: true as const }));
    useSessionStore.setState({
      activeSessionId: endedSession.id,
      currentCounselorId: "zhouzhou",
      sessions: [endedSession],
      resumeSession
    });

    render(<CounselingRoomPage />);
    fireEvent.click(screen.getByRole("button", { name: "继续本次咨询" }));

    await waitFor(() => expect(resumeSession).toHaveBeenCalledWith(endedSession.id));
    expect(useConsultationFlowStore.getState().flow?.surface).toEqual({ kind: "session" });
  });

  it("当前咨询有未发送内容时 Cmd/Ctrl+N 先确认，取消后保留草稿", () => {
    const active = session({ id: "active-draft", counselorId: "chengling", status: "active" });
    useSessionStore.setState({
      activeSessionId: active.id,
      currentCounselorId: "chengling",
      sessions: [active]
    });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: active.id });
    useConsultationDraftStore.getState().setDraft(active.id, "还没有发送的话");
    const startNewConsultation = vi.fn();
    useConsultationFlowStore.setState({ startNewConsultation });
    render(<CounselingRoomPage />);
    fireEvent.keyDown(document, { key: "n", metaKey: true });

    expect(screen.getByRole("dialog", { name: "开始一场新咨询？" })).toBeInTheDocument();
    expect(screen.getByText(/当前空会谈不会保留/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "清除并开始新咨询" })).toBeInTheDocument();
    expect(startNewConsultation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "返回检查" }));

    expect(screen.queryByRole("dialog", { name: "开始一场新咨询？" })).not.toBeInTheDocument();
    expect(useConsultationDraftStore.getState().draftsBySessionId[active.id]).toBe("还没有发送的话");
    expect(startNewConsultation).not.toHaveBeenCalled();
  });

  it("确认新建后才结束有内容的当前咨询", () => {
    const active = {
      ...session({ id: "active-confirm-new", counselorId: "chengling", status: "active" }),
      messages: [{
        id: "message-user",
        sessionId: "active-confirm-new",
        role: "user" as const,
        content: "这是已经发送的内容",
        createdAt: "2026-07-12T12:01:00.000Z",
        status: "sent" as const
      }]
    };
    useSessionStore.setState({
      activeSessionId: active.id,
      currentCounselorId: "chengling",
      sessions: [active]
    });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: active.id });
    const startNewConsultation = vi.fn();
    useConsultationFlowStore.setState({ startNewConsultation });
    render(<CounselingRoomPage />);
    fireEvent.keyDown(document, { key: "n", ctrlKey: true });

    expect(screen.getByText(/已发送的会谈内容会保留/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续当前咨询" })).toBeInTheDocument();
    expect(startNewConsultation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "结束当前咨询并新建" }));

    expect(startNewConsultation).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().activePage).toBe("room");
  });

  it("空会谈没有消息和草稿时直接新建，不增加无意义确认", () => {
    const active = session({ id: "active-empty", counselorId: "chengling", status: "active" });
    useSessionStore.setState({
      activeSessionId: active.id,
      currentCounselorId: "chengling",
      sessions: [active]
    });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: active.id });
    const startNewConsultation = vi.fn();
    useConsultationFlowStore.setState({ startNewConsultation });
    render(<CounselingRoomPage />);
    fireEvent.keyDown(document, { key: "n", metaKey: true });

    expect(screen.queryByRole("dialog", { name: "开始一场新咨询？" })).not.toBeInTheDocument();
    expect(startNewConsultation).toHaveBeenCalledTimes(1);
  });

  it("归档历史中的整理失败提供可达的重新生成入口", async () => {
    const ended = session({ id: "ended-preparation-failed", counselorId: "chengling", status: "ended" });
    const failedPreparation = {
      id: "preparation-failed",
      sessionId: ended.id,
      counselorId: "chengling",
      sourceEndedAt: ended.endedAt!,
      modelName: "test",
      status: "failed" as const,
      phase: "supervision" as const,
      createdAt: ended.endedAt!,
      updatedAt: ended.endedAt!,
      errorMessage: "整理暂时失败"
    };
    const retry = vi.fn(async () => ({
      ok: true as const,
      data: { ...failedPreparation, status: "pending" as const, phase: "session-conceptualization" as const }
    }));
    vi.stubGlobal("lingDesktop", { consultationPreparations: { retry } });
    useSessionStore.setState({
      activeSessionId: ended.id,
      currentCounselorId: "chengling",
      sessions: [ended],
      consultationPreparationsBySessionId: { [ended.id]: failedPreparation }
    });
    useConsultationFlowStore.getState().openPersistedSession({
      counselorId: "chengling",
      sessionId: ended.id,
      status: "ended"
    });

    render(<CounselingRoomPage />);
    fireEvent.click(screen.getByRole("button", { name: "重新整理这次咨询" }));

    await waitFor(() => expect(retry).toHaveBeenCalledWith(ended.id));
  });

  it("归档历史读取失败时不伪装成空会谈，并可重新读取", async () => {
    const ended = { ...session({ id: "ended-load-retry", counselorId: "chengling", status: "ended" }), messagesLoaded: false };
    const listBySessionId = vi
      .fn()
      .mockResolvedValueOnce({ ok: false as const, error: { code: "IO_ERROR", message: "读取失败" } })
      .mockResolvedValueOnce({
        ok: true as const,
        data: [{
          id: "history-message",
          sessionId: ended.id,
          role: "user" as const,
          content: "这是重新读取到的历史内容。",
          createdAt: ended.endedAt!,
          status: "sent" as const
        }]
      });
    vi.stubGlobal("lingDesktop", { messages: { listBySessionId } });
    useSessionStore.setState({ activeSessionId: ended.id, currentCounselorId: "chengling", sessions: [ended] });
    useConsultationFlowStore.getState().openPersistedSession({
      counselorId: "chengling",
      sessionId: ended.id,
      status: "ended"
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    render(<CounselingRoomPage />);

    expect(screen.getByText(/正在读取这次会谈的完整记录/)).toBeInTheDocument();
    expect(screen.queryByText("这是重新读取到的历史内容。")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新读取会谈记录" }));

    expect(await screen.findByText("这是重新读取到的历史内容。")).toBeInTheDocument();
  });
});

function session(
  overrides: Partial<PrototypeSession> & Pick<PrototypeSession, "id" | "counselorId" | "status">
): PrototypeSession {
  const now = "2026-07-12T12:00:00.000Z";
  return {
    title: "测试会谈",
    time: "刚刚",
    preview: "",
    roomThemeId: "warm-study",
    teamId: "one-way-mirror",
    modelName: "test",
    createdAt: now,
    startedAt: now,
    updatedAt: now,
    endedAt: overrides.status === "ended" ? now : undefined,
    messages: [],
    ...overrides
  };
}
