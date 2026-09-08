import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetSessionStore, useSessionStore } from "./sessionStore";
import { useSettingsStore } from "./settingsStore";

function createActiveTestSession() {
  useSessionStore.getState().createSession();
  return useSessionStore.getState().activeSessionId;
}

describe("sessionStore persistence", () => {
  beforeEach(() => {
    resetSessionStore();
    vi.unstubAllGlobals();
  });

  it("starts without prototype sessions when no persisted sessions have loaded", () => {
    expect(useSessionStore.getState().sessions).toEqual([]);
    expect(useSessionStore.getState().activeSessionId).toBe("");
  });

  it("does not send messages when there is no active persisted or newly created session", () => {
    const append = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", {
      messages: { append }
    });

    const accepted = useSessionStore.getState().sendPrototypeMessage("不应该产生孤儿消息");

    expect(accepted).toBe(false);
    expect(append).not.toHaveBeenCalled();
    expect(useSessionStore.getState().sessions).toEqual([]);
  });

  it("loads persisted sessions and active session messages from the desktop bridge", async () => {
    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({
          ok: true,
          data: [
            {
              id: "s-persisted",
              title: "持久化会谈",
              counselorId: "chengling",
              roomThemeId: "warm-study",
              teamId: "one-way-mirror",
              modelName: "deepseek-v4-flash",
              createdAt: "2026-07-03T10:00:00.000Z",
              updatedAt: "2026-07-03T10:01:00.000Z",
              status: "active"
            }
          ]
        }))
      },
      messages: {
        listBySessionId: vi.fn(async () => ({
          ok: true,
          data: [
            {
              id: "m1",
              sessionId: "s-persisted",
              role: "user",
              content: "这条消息来自 SQLite。",
              createdAt: "2026-07-03T10:01:00.000Z",
              status: "sent"
            }
          ]
        }))
      }
    });

    await useSessionStore.getState().loadPersistedSessions();

    expect(useSessionStore.getState().activeSessionId).toBe("s-persisted");
    expect(useSessionStore.getState().sessions[0].messages[0].content).toBe("这条消息来自 SQLite。");
  });

  it("syncs current counselor, team, room, and model from the active persisted session", async () => {
    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({
          ok: true,
          data: [
            {
              id: "s-active-zhou",
              title: "周舟会谈",
              counselorId: "zhouzhou",
              roomThemeId: "rain-night-room",
              teamId: "supervision",
              modelName: "deepseek-v4-flash",
              createdAt: "2026-07-03T10:00:00.000Z",
              updatedAt: "2026-07-03T10:01:00.000Z",
              status: "active"
            }
          ]
        }))
      },
      messages: {
        listBySessionId: vi.fn(async () => ({ ok: true, data: [] }))
      }
    });

    await useSessionStore.getState().loadPersistedSessions();

    expect(useSessionStore.getState()).toMatchObject({
      activeSessionId: "s-active-zhou",
      currentCounselorId: "zhouzhou",
      currentTeamId: "supervision",
      currentRoomThemeId: "rain-night-room",
      currentModelName: "deepseek-v4-flash"
    });
  });

  it("syncs current counselor metadata when switching between loaded sessions", () => {
    useSessionStore.setState({
      activeSessionId: "s-chengling",
      sessions: [
        {
          id: "s-chengling",
          title: "程灵会谈",
          time: "刚刚",
          preview: "",
          counselorId: "chengling",
          roomThemeId: "warm-study",
          teamId: "one-way-mirror",
          modelName: "deepseek-v4-flash",
          status: "active",
          messages: []
        },
        {
          id: "s-lin",
          title: "林乐水会谈",
          time: "刚刚",
          preview: "",
          counselorId: "linleshui",
          roomThemeId: "white-room",
          teamId: "integration",
          modelName: "deepseek-v4-flash",
          status: "active",
          messages: []
        }
      ]
    });

    useSessionStore.getState().setActiveSession("s-lin");

    expect(useSessionStore.getState()).toMatchObject({
      activeSessionId: "s-lin",
      currentCounselorId: "linleshui",
      currentTeamId: "integration",
      currentRoomThemeId: "white-room"
    });
  });

  it("books a counselor without mutating the active session metadata", () => {
    const update = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", {
      sessions: { update }
    });
    useSessionStore.setState({
      activeSessionId: "s-default-title",
      sessions: [
        {
          id: "s-default-title",
          title: "与程灵的会谈 · session 1",
          time: "刚刚",
          preview: "",
          counselorId: "chengling",
          roomThemeId: "warm-study",
          teamId: "one-way-mirror",
          modelName: "deepseek-v4-flash",
          status: "active",
          messages: []
        }
      ]
    });

    useSessionStore.getState().bookCounselor("linleshui");

    expect(useSessionStore.getState().sessions[0]).toMatchObject({
      title: "与程灵的会谈 · session 1",
      counselorId: "chengling"
    });
    expect(useSessionStore.getState().bookedCounselorId).toBe("linleshui");
    expect(update).not.toHaveBeenCalled();
  });

  it("opens a new session with the booked counselor while keeping the previous session as history", async () => {
    const create = vi.fn(async () => ({ ok: true as const, data: undefined }));
    const append = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", {
      sessions: { create },
      messages: { append }
    });
    vi.spyOn(Date, "now").mockReturnValue(100);
    useSessionStore.setState({
      activeSessionId: "s-custom-title",
      sessions: [
        {
          id: "s-custom-title",
          title: "工作压力",
          time: "刚刚",
          preview: "",
          counselorId: "chengling",
          roomThemeId: "warm-study",
          teamId: "one-way-mirror",
          modelName: "deepseek-v4-flash",
          status: "active",
          messages: []
        }
      ]
    });

    useSessionStore.getState().bookCounselor("zhouzhou");
    await useSessionStore.getState().openBookedCounselorSession();

    expect(useSessionStore.getState()).toMatchObject({
      activeSessionId: "session-100",
      currentCounselorId: "zhouzhou",
      bookedCounselorId: undefined
    });
    expect(useSessionStore.getState().sessions[0]).toMatchObject({
      id: "session-100",
      counselorId: "zhouzhou",
      title: expect.stringContaining("与周舟的会谈")
    });
    expect(useSessionStore.getState().sessions[1]).toMatchObject({
      title: "工作压力",
      counselorId: "chengling"
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ id: "session-100", counselorId: "zhouzhou" }));
    expect(append).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-100" }));
  });

  it("streams from the booked counselor session without mixing the previous counselor history", async () => {
    const create = vi.fn(async () => ({ ok: true as const, data: undefined }));
    const append = vi.fn(async () => ({ ok: true as const, data: undefined }));
    const streamMessage = vi.fn(async (_request, handlers) => {
      handlers.onEvent({ requestId: "stream-200", type: "done", content: "林乐水收到。" });
      return { ok: true as const, data: { requestId: "stream-200" } };
    });
    vi.stubGlobal("lingDesktop", {
      sessions: { create },
      messages: { append },
      counseling: { streamMessage }
    });
    vi.spyOn(Date, "now").mockReturnValue(200);
    useSettingsStore.setState({
      savedApi: { apiBaseUrl: "https://api.deepseek.com", apiKey: "", modelName: "deepseek-v4-flash" }
    });
    useSessionStore.setState({
      activeSessionId: "s-chengling-history",
      currentCounselorId: "chengling",
      sessions: [
        {
          id: "s-chengling-history",
          title: "程灵旧会谈",
          time: "刚刚",
          preview: "",
          counselorId: "chengling",
          roomThemeId: "warm-study",
          teamId: "one-way-mirror",
          modelName: "deepseek-v4-flash",
          status: "active",
          messages: [
            {
              id: "old-user",
              sessionId: "s-chengling-history",
              role: "user",
              content: "这句旧会谈历史不能进入新会谈上下文。",
              createdAt: "2026-07-07T00:00:00.000Z",
              status: "sent"
            }
          ]
        }
      ]
    });

    useSessionStore.getState().bookCounselor("linleshui");
    await useSessionStore.getState().openBookedCounselorSession();
    useSessionStore.getState().sendPrototypeMessage("我想和林乐水开始。");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(streamMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-200",
        counselorId: "linleshui",
        contextMessages: [expect.objectContaining({ sessionId: "session-200", role: "assistant" })]
      }),
      expect.anything()
    );
    expect(JSON.stringify(vi.mocked(streamMessage).mock.calls[0][0])).not.toContain("这句旧会谈历史不能进入新会谈上下文。");
  });

  it("rejects send while switched history is loading, then streams with the loaded session context", async () => {
    let resolveLinMessages: ((value: {
      ok: true;
      data: Array<{
        id: string;
        sessionId: string;
        role: "user" | "assistant";
        content: string;
        createdAt: string;
        status: "sent";
      }>;
    }) => void) | undefined;
    const streamMessage = vi.fn(async (_request, handlers) => {
      handlers.onEvent({ requestId: "stream-40", type: "done", content: "林乐水收到。" });
      return { ok: true, data: { requestId: "stream-40" } };
    });
    const listBySessionId = vi.fn(async (sessionId: string) => {
      if (sessionId === "s-chengling") {
        return {
          ok: true,
          data: [
            {
              id: "chengling-history",
              sessionId: "s-chengling",
              role: "user" as const,
              content: "程灵会谈历史",
              createdAt: "2026-07-04T00:00:00.000Z",
              status: "sent" as const
            }
          ]
        };
      }
      return new Promise((resolve) => {
        resolveLinMessages = resolve;
      });
    });

    vi.spyOn(Date, "now").mockReturnValue(40);
    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({
          ok: true,
          data: [
            {
              id: "s-chengling",
              title: "程灵会谈",
              counselorId: "chengling",
              roomThemeId: "warm-study",
              teamId: "one-way-mirror",
              modelName: "deepseek-v4-flash",
              createdAt: "2026-07-04T00:00:00.000Z",
              updatedAt: "2026-07-04T00:01:00.000Z",
              status: "active"
            },
            {
              id: "s-lin",
              title: "林乐水会谈",
              counselorId: "linleshui",
              roomThemeId: "white-room",
              teamId: "integration",
              modelName: "deepseek-v4-flash",
              createdAt: "2026-07-04T00:02:00.000Z",
              updatedAt: "2026-07-04T00:03:00.000Z",
              status: "active"
            }
          ]
        }))
      },
      messages: {
        listBySessionId,
        append: vi.fn(async () => ({ ok: true, data: undefined }))
      },
      counseling: { streamMessage }
    });

    await useSessionStore.getState().loadPersistedSessions();
    useSessionStore.getState().setActiveSession("s-lin");
    const acceptedWhileLoading = useSessionStore.getState().sendPrototypeMessage("切换后立即发送");

    expect(acceptedWhileLoading).toBe(false);
    expect(streamMessage).not.toHaveBeenCalled();

    resolveLinMessages?.({
      ok: true,
      data: [
        {
          id: "lin-history",
          sessionId: "s-lin",
          role: "user",
          content: "林乐水会谈历史",
          createdAt: "2026-07-04T00:02:00.000Z",
          status: "sent"
        }
      ]
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(useSessionStore.getState().sendPrototypeMessage("切换后立即发送")).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(streamMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "s-lin",
        counselorId: "linleshui",
        teamId: "integration",
        contextMessages: [expect.objectContaining({ id: "lin-history", content: "林乐水会谈历史" })]
      }),
      expect.anything()
    );
    expect(JSON.stringify(vi.mocked(streamMessage).mock.calls[0][0].contextMessages)).not.toContain("程灵会谈历史");
  });

  it("applies persisted user defaults before a new session is created", () => {
    useSessionStore.getState().applyUserSettings({
      api: {
        apiBaseUrl: "https://api.deepseek.com",
        apiKey: "",
        modelName: "deepseek-v4-flash"
      },
      defaultCounselorId: "linleshui",
      defaultRoomThemeId: "white-room"
    });

    expect(useSessionStore.getState()).toMatchObject({
      currentCounselorId: "linleshui",
      currentRoomThemeId: "white-room",
      currentModelName: "deepseek-v4-flash"
    });
  });

  it("ends and resumes the active session through the desktop bridge", async () => {
    const end = vi.fn(async () => ({ ok: true as const, data: undefined }));
    const resume = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", {
      sessions: { end, resume }
    });

    const sessionId = createActiveTestSession();
    useSessionStore.setState((state) => ({
      sessions: state.sessions.map((session) => session.id === sessionId
        ? {
            ...session,
            messages: [...session.messages, {
              id: `${sessionId}-user`,
              sessionId: session.id,
              role: "user",
              content: "这是一条已发送的用户消息。",
              createdAt: new Date().toISOString(),
              status: "sent"
            }]
          }
        : session)
    }));

    await useSessionStore.getState().endSession(sessionId);

    expect(end).toHaveBeenCalledWith(sessionId);
    expect(useSessionStore.getState().sessions.find((session) => session.id === sessionId)).toMatchObject({
      status: "ended"
    });

    const acceptedWhileEnded = useSessionStore.getState().sendPrototypeMessage("结束后不应继续发送");
    expect(acceptedWhileEnded).toBe(false);

    await useSessionStore.getState().resumeSession(sessionId);

    expect(resume).toHaveBeenCalledWith(sessionId);
    expect(useSessionStore.getState().sessions.find((session) => session.id === sessionId)).toMatchObject({
      status: "active"
    });
    expect(useSessionStore.getState().sessionLettersBySessionId[sessionId]).toBeUndefined();
  });

  it("treats a missing readback as a successful empty-session discard", async () => {
    const end = vi.fn(async () => ({ ok: true as const, data: undefined }));
    const get = vi.fn(async () => ({
      ok: false as const,
      error: { code: "NOT_FOUND" as const, message: "未找到该会谈" }
    }));
    vi.stubGlobal("lingDesktop", { sessions: { end, get } });
    const sessionId = createActiveTestSession();

    await expect(useSessionStore.getState().endSession(sessionId)).resolves.toEqual({
      ok: true,
      state: "discarded"
    });
    expect(useSessionStore.getState().sessions.find((session) => session.id === sessionId)).toBeUndefined();
  });

  it("does not resume old history while the same counselor has another unfinished session", async () => {
    const resume = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", { sessions: { resume } });
    const base = {
      title: "程灵会谈",
      time: "刚刚",
      preview: "",
      counselorId: "chengling",
      roomThemeId: "warm-study",
      teamId: "one-way-mirror",
      modelName: "deepseek-v4-flash",
      messages: []
    };
    useSessionStore.setState({
      activeSessionId: "session-active",
      sessions: [
        { ...base, id: "session-ended", status: "ended" },
        { ...base, id: "session-active", status: "active" }
      ]
    });

    const result = await useSessionStore.getState().resumeSession("session-ended");

    expect(result).toEqual({
      ok: false,
      message: "这位咨询师还有一次尚未完成的咨询，请先继续或结束它。"
    });
    expect(resume).not.toHaveBeenCalled();
  });

  it("does not resume an older ended session after a newer counselor session", async () => {
    const resume = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", { sessions: { resume } });
    const base = {
      title: "程灵会谈",
      time: "刚刚",
      preview: "",
      counselorId: "chengling",
      roomThemeId: "warm-study",
      modelName: "test",
      status: "ended" as const,
      messages: []
    };
    useSessionStore.setState({
      activeSessionId: "ended-older",
      sessions: [
        {
          ...base,
          id: "ended-older",
          createdAt: "2026-07-12T09:00:00.000Z",
          endedAt: "2026-07-12T12:00:00.000Z",
          updatedAt: "2026-07-12T13:00:00.000Z"
        },
        {
          ...base,
          id: "ended-newer",
          createdAt: "2026-07-12T10:00:00.000Z",
          endedAt: "2026-07-12T12:00:00.000Z",
          updatedAt: "2026-07-12T12:00:00.000Z"
        }
      ]
    });

    const result = await useSessionStore.getState().resumeSession("ended-older");

    expect(result).toEqual({
      ok: false,
      message: "只能继续与这位咨询师最近结束的会谈；更早的会谈仍可只读回看。"
    });
    expect(resume).not.toHaveBeenCalled();
  });

  it("loads and retries the consultation preparation for an ended session", async () => {
    const preparation = {
      id: "preparation-1",
      sessionId: "session-ended",
      counselorId: "chengling",
      sourceEndedAt: "2026-07-11T10:00:00.000Z",
      modelName: "deepseek-v4-pro",
      status: "failed" as const,
      phase: "supervision" as const,
      createdAt: "2026-07-11T10:00:00.000Z",
      updatedAt: "2026-07-11T10:01:00.000Z",
      errorMessage: "督导输出格式无效"
    };
    const getBySessionId = vi.fn(async () => ({ ok: true as const, data: preparation }));
    const retry = vi.fn(async () => ({
      ok: true as const,
      data: { ...preparation, id: "preparation-2", status: "pending" as const, errorMessage: undefined }
    }));
    vi.stubGlobal("lingDesktop", { consultationPreparations: { getBySessionId, retry } });

    await useSessionStore.getState().loadConsultationPreparation("session-ended");
    expect(useSessionStore.getState().consultationPreparationsBySessionId["session-ended"]).toEqual(preparation);

    await useSessionStore.getState().retryConsultationPreparation("session-ended");
    expect(retry).toHaveBeenCalledWith("session-ended");
    expect(useSessionStore.getState().consultationPreparationsBySessionId["session-ended"]).toMatchObject({
      id: "preparation-2",
      status: "pending"
    });
  });

  it("does not keep an optimistic session when the main process blocks creation", async () => {
    const create = vi.fn(async () => ({
      ok: false as const,
      error: { code: "VALIDATION_ERROR" as const, message: "咨询师正在进行内部督导复盘。" }
    }));
    vi.stubGlobal("lingDesktop", { sessions: { create } });

    await expect(useSessionStore.getState().createSession()).resolves.toBe(false);

    expect(useSessionStore.getState().sessions).toEqual([]);
    expect(useSessionStore.getState().newSessionError).toBe("咨询师正在进行内部督导复盘。");
  });

  it("lets the consultation flow own replacement errors without duplicating them in the sidebar", async () => {
    const create = vi.fn(async () => ({
      ok: false as const,
      error: { code: "BUSY" as const, message: "这次咨询正在执行其他操作，请稍后再试。" }
    }));
    vi.stubGlobal("lingDesktop", { sessions: { create } });

    await expect(useSessionStore.getState().createDraftSession({
      counselorId: "chengling",
      reportErrorInStore: false,
      replaceUnfinishedSessionId: "session-current"
    })).resolves.toEqual({
      ok: false,
      message: "这次咨询正在执行其他操作，请稍后再试。"
    });

    expect(useSessionStore.getState().newSessionError).toBeUndefined();
  });

  it("creates a ready preview letter after ending a session without the desktop bridge", async () => {
    vi.useFakeTimers();
    try {
      const sessionId = createActiveTestSession();

      await useSessionStore.getState().endSession(sessionId);

      expect(useSessionStore.getState().sessionLettersBySessionId[sessionId]).toMatchObject({
        status: "pending"
      });

      await vi.advanceTimersByTimeAsync(1700);

      expect(useSessionStore.getState().sessionLettersBySessionId[sessionId]).toMatchObject({
        status: "ready",
        modelName: "网页预览"
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not let delayed user defaults override restored persisted session metadata", async () => {
    vi.stubGlobal("lingDesktop", {
      sessions: {
        list: vi.fn(async () => ({
          ok: true,
          data: [
            {
              id: "s-restored-zhou",
              title: "周舟旧会谈",
              counselorId: "zhouzhou",
              roomThemeId: "rain-night-room",
              teamId: "supervision",
              modelName: "deepseek-v4-flash",
              createdAt: "2026-07-04T01:00:00.000Z",
              updatedAt: "2026-07-04T01:01:00.000Z",
              status: "active"
            }
          ]
        }))
      },
      messages: {
        listBySessionId: vi.fn(async () => ({ ok: true, data: [] }))
      }
    });

    await useSessionStore.getState().loadPersistedSessions();
    useSessionStore.getState().applyUserSettings({
      api: {
        apiBaseUrl: "https://api.deepseek.com",
        apiKey: "",
        modelName: "deepseek-v4-flash"
      },
      defaultCounselorId: "linleshui",
      defaultRoomThemeId: "white-room"
    });

    expect(useSessionStore.getState()).toMatchObject({
      activeSessionId: "s-restored-zhou",
      currentCounselorId: "zhouzhou",
      currentTeamId: "supervision",
      currentRoomThemeId: "rain-night-room"
    });
  });

  it("persists a newly created session and welcome message through the desktop bridge", async () => {
    const create = vi.fn(async () => ({ ok: true, data: undefined }));
    const append = vi.fn(async () => ({ ok: true, data: undefined }));
    vi.stubGlobal("lingDesktop", {
      sessions: { create },
      messages: { append }
    });

    await useSessionStore.getState().createSession();

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringContaining("与程灵的会谈") }));
    expect(append).toHaveBeenCalledWith(expect.objectContaining({ role: "assistant", content: "我在这里。你可以慢慢说。" }));
  });

  it("creates and streams a new session with the current counselor, team, room, and model", async () => {
    const create = vi.fn(async () => ({ ok: true, data: undefined }));
    const append = vi.fn(async () => ({ ok: true, data: undefined }));
    const streamMessage = vi.fn(async (_request, handlers) => {
      handlers.onEvent({ requestId: "stream-30", type: "done", content: "周舟收到。" });
      return { ok: true, data: { requestId: "stream-30" } };
    });
    vi.stubGlobal("lingDesktop", {
      sessions: { create },
      messages: { append },
      counseling: { streamMessage }
    });
    vi.spyOn(Date, "now").mockReturnValue(30);
    useSettingsStore.setState({
      savedApi: { apiBaseUrl: "https://api.deepseek.com", apiKey: "", modelName: "deepseek-v4-flash" }
    });
    useSessionStore.setState({
      currentCounselorId: "zhouzhou",
      currentTeamId: "supervision",
      currentRoomThemeId: "rain-night-room"
    });

    await useSessionStore.getState().createSession();
    useSessionStore.getState().sendPrototypeMessage("我想用周舟继续。");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "session-30",
        counselorId: "zhouzhou",
        teamId: "supervision",
        roomThemeId: "rain-night-room",
        modelName: "deepseek-v4-flash"
      })
    );
    expect(streamMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-30",
        counselorId: "zhouzhou",
        teamId: "supervision"
      }),
      expect.anything()
    );
  });

  it("keeps the default session title when persisting first-message list metadata", async () => {
    const create = vi.fn(async () => ({ ok: true, data: undefined }));
    const update = vi.fn(async () => ({ ok: true, data: undefined }));
    const append = vi.fn(async () => ({ ok: true, data: undefined }));
    const streamMessage = vi.fn(() => new Promise(() => undefined));
    vi.stubGlobal("lingDesktop", {
      sessions: { create, update },
      messages: { append },
      counseling: { streamMessage }
    });
    vi.spyOn(Date, "now").mockReturnValue(60);

    await useSessionStore.getState().createSession();
    useSessionStore.getState().sendPrototypeMessage("我想先说说最近关系里的疲惫和犹豫。");

    const session = useSessionStore.getState().sessions.find((item) => item.id === "session-60");
    expect(session).toMatchObject({
      title: expect.stringContaining("与程灵的会谈"),
      preview: "我想先说说最近关系里的疲惫和犹豫。",
      time: "刚刚"
    });
    expect(update).toHaveBeenCalledWith(
      "session-60",
      expect.objectContaining({
        title: expect.stringContaining("与程灵的会谈"),
        summary: "我想先说说最近关系里的疲惫和犹豫。",
        updatedAt: expect.any(String)
      })
    );
  });

  it("renames and deletes sessions through the desktop bridge", async () => {
    const update = vi.fn(async () => ({ ok: true, data: undefined }));
    const deleteSession = vi.fn(async () => ({ ok: true, data: undefined }));
    vi.stubGlobal("lingDesktop", {
      sessions: { update, delete: deleteSession }
    });
    const firstSessionId = "session-current";
    const secondSessionId = "session-to-delete";
    useSessionStore.setState(() => ({
      activeSessionId: firstSessionId,
      sessions: [
        {
          id: firstSessionId,
          title: "当前会谈",
          time: "刚刚",
          preview: "",
          counselorId: "chengling",
          roomThemeId: "warm-study",
          teamId: "one-way-mirror",
          modelName: "deepseek-v4-flash",
          status: "active",
          messages: []
        },
        {
          id: secondSessionId,
          title: "要删除的会谈",
          time: "刚刚",
          preview: "",
          counselorId: "chengling",
          roomThemeId: "warm-study",
          teamId: "one-way-mirror",
          modelName: "deepseek-v4-flash",
          status: "ended",
          messages: []
        }
      ]
    }));

    await useSessionStore.getState().renameSession(secondSessionId, "用户命名的标题");
    await useSessionStore.getState().deleteSession(secondSessionId);

    expect(update).toHaveBeenCalledWith(secondSessionId, expect.objectContaining({ title: "用户命名的标题" }));
    expect(deleteSession).toHaveBeenCalledWith(secondSessionId);
    expect(useSessionStore.getState().activeSessionId).toBe(firstSessionId);
    expect(useSessionStore.getState().sessions.some((session) => session.id === secondSessionId)).toBe(false);
  });

  it("keeps the visible title unchanged when persistence rejects a rename", async () => {
    const update = vi.fn(async () => ({ ok: false as const, error: { code: "IO_ERROR", message: "磁盘暂时不可写" } }));
    vi.stubGlobal("lingDesktop", { sessions: { update } });
    useSessionStore.setState({
      sessions: [{
        id: "session-rename-failure",
        title: "原来的名称",
        time: "刚刚",
        preview: "",
        counselorId: "chengling",
        roomThemeId: "warm-study",
        teamId: "one-way-mirror",
        modelName: "deepseek-v4-flash",
        status: "ended",
        messages: []
      }]
    });

    await expect(useSessionStore.getState().renameSession("session-rename-failure", "新的名称")).resolves.toEqual({
      ok: false,
      message: "磁盘暂时不可写"
    });
    expect(useSessionStore.getState().sessions[0]?.title).toBe("原来的名称");
    expect(useSessionStore.getState().newSessionError).toBe("磁盘暂时不可写");
  });

  it("refreshes a generated session title from the desktop bridge", async () => {
    const get = vi.fn(async () => ({
      ok: true,
      data: {
        id: "session-generated-title",
        title: "工作压力",
        counselorId: "chengling",
        roomThemeId: "warm-study",
        teamId: "one-way-mirror",
        modelName: "deepseek-v4-flash",
        createdAt: "2026-07-05T10:00:00.000Z",
        updatedAt: "2026-07-05T10:03:00.000Z",
        status: "active",
        summary: "最近在谈工作压力。"
      }
    }));
    vi.stubGlobal("lingDesktop", {
      sessions: { get }
    });
    useSessionStore.setState((state) => ({
      sessions: [
        {
          id: "session-generated-title",
          title: "与程灵的会谈 · session 1",
          time: "刚刚",
          preview: "最近在谈工作压力。",
          counselorId: "chengling",
          roomThemeId: "warm-study",
          teamId: "one-way-mirror",
          modelName: "deepseek-v4-flash",
          status: "active",
          messages: []
        },
        ...state.sessions
      ]
    }));

    await (useSessionStore.getState() as any).refreshSessionFromDesktop("session-generated-title");

    expect(get).toHaveBeenCalledWith("session-generated-title");
    expect(useSessionStore.getState().sessions[0]).toMatchObject({
      id: "session-generated-title",
      title: "工作压力",
      preview: "最近在谈工作压力。"
    });
  });

  it("persists the final assistant reply as the latest session preview", async () => {
    const update = vi.fn(async () => ({ ok: true, data: undefined }));
    const streamMessage = vi.fn(async (_request, handlers) => {
      handlers.onEvent({ requestId: "stream-70", type: "done", content: "这是最终回复，会成为新的预览。" });
      return { ok: true, data: { requestId: "stream-70" } };
    });
    vi.stubGlobal("lingDesktop", {
      sessions: { update },
      counseling: { streamMessage },
      messages: { append: vi.fn(async () => ({ ok: true, data: undefined })) }
    });
    vi.spyOn(Date, "now").mockReturnValue(70);

    createActiveTestSession();
    useSessionStore.getState().sendPrototypeMessage("先发送一条用户消息。");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(update).toHaveBeenLastCalledWith(
      useSessionStore.getState().activeSessionId,
      expect.objectContaining({
        summary: "这是最终回复，会成为新的预览。",
        updatedAt: expect.any(String)
      })
    );
  });

  it("streams through the local dev endpoint when the Electron bridge is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const encoder = new TextEncoder();
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  [
                    JSON.stringify({ requestId: "stream-0", type: "status", status: "streaming" }),
                    JSON.stringify({ requestId: "stream-0", type: "chunk", content: "网页可用" }),
                    JSON.stringify({ requestId: "stream-0", type: "done", content: "网页可用" })
                  ].join("\n")
                )
              );
              controller.close();
            }
          })
        );
      })
    );
    vi.spyOn(Date, "now").mockReturnValue(0);

    createActiveTestSession();
    useSessionStore.getState().sendPrototypeMessage("测试网页对话");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetch).toHaveBeenCalledWith(
      "/__ling_dev/counseling/stream",
      expect.objectContaining({ method: "POST" })
    );
    const [, requestInit] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      assistantMessageId: "msg-assistant-0",
      message: expect.objectContaining({ role: "user", content: "测试网页对话" }),
      contextMessages: expect.arrayContaining([
        expect.objectContaining({ role: "assistant", content: "我在这里。你可以慢慢说。" })
      ])
    });
    const requestBody = JSON.parse(String(requestInit?.body));
    expect(requestBody.contextMessages).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ content: "测试网页对话" })])
    );
    expect(JSON.stringify(useSessionStore.getState().sessions)).toContain("网页可用");
  });

  it("keeps very long naturally authored input as a normal message", async () => {
    const createDocument = vi.fn(async () => ({ ok: true, data: undefined }));
    const streamMessage = vi.fn(async (_request, handlers) => {
      handlers.onEvent({ requestId: "stream-20", type: "done", content: "我会结合资料继续。" });
      return { ok: true, data: { requestId: "stream-20" } };
    });
    vi.stubGlobal("lingDesktop", {
      documents: { create: createDocument },
      counseling: { streamMessage },
      messages: { append: vi.fn(async () => ({ ok: true, data: undefined })) }
    });
    vi.spyOn(Date, "now").mockReturnValue(20);
    const longText = "长文本资料内容".repeat(4000);

    createActiveTestSession();
    useSessionStore.getState().sendPrototypeMessage(longText);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createDocument).not.toHaveBeenCalled();
    expect(streamMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          id: "msg-user-20",
          content: longText,
          metadata: undefined
        })
      }),
      expect.anything()
    );
    const activeSession = useSessionStore.getState().sessions.find((session) => session.id === useSessionStore.getState().activeSessionId);
    expect(activeSession?.messages.find((message) => message.id === "msg-user-20")?.content).toBe(longText);
  });

  it("retries a failed user message without duplicating the user bubble", async () => {
    const streamMessage = vi.fn(async (_request, handlers) => {
      handlers.onEvent({ requestId: "stream-1", type: "done", content: "重试成功" });
      return { ok: true, data: { requestId: "stream-1" } };
    });
    vi.spyOn(Date, "now").mockReturnValue(1);
    vi.stubGlobal("lingDesktop", {
      counseling: { streamMessage },
      messages: { append: vi.fn(async () => ({ ok: true, data: undefined })) }
    });
    const activeSessionId = createActiveTestSession();
    useSessionStore.setState((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [
                ...session.messages,
                {
                  id: "failed-user",
                  sessionId: activeSessionId,
                  role: "user",
                  content: "请再试一次",
                  createdAt: "2026-07-04T00:00:00.000Z",
                  status: "failed"
                },
                {
                  id: "failed-assistant-after-user",
                  sessionId: activeSessionId,
                  role: "assistant",
                  content: "模型连接失败，请检查配置后重试。",
                  createdAt: "2026-07-04T00:00:01.000Z",
                  status: "failed"
                }
              ]
            }
          : session
      )
    }));

    useSessionStore.getState().retryMessage("failed-user");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const messages = useSessionStore.getState().sessions.find((session) => session.id === activeSessionId)?.messages ?? [];
    expect(messages.filter((message) => message.id === "failed-user")).toHaveLength(1);
    expect(messages.find((message) => message.id === "failed-user")?.status).toBe("sent");
    expect(messages.find((message) => message.id === "failed-assistant-after-user")?.content).toBe("重试成功");
  });

  it("normalizes attachment-only history before sending it as context", async () => {
    const streamMessage = vi.fn(async (_request, handlers) => {
      handlers.onEvent({ requestId: "stream-30", type: "done", content: "继续说。" });
      return { ok: true, data: { requestId: "stream-30" } };
    });
    vi.spyOn(Date, "now").mockReturnValue(30);
    vi.stubGlobal("lingDesktop", {
      counseling: { streamMessage },
      messages: { append: vi.fn(async () => ({ ok: true, data: undefined })) }
    });
    const activeSessionId = createActiveTestSession();
    useSessionStore.setState((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [
                ...session.messages,
                {
                  id: "attachment-only-user",
                  sessionId: activeSessionId,
                  role: "user",
                  content: "",
                  createdAt: "2026-07-04T00:02:00.000Z",
                  status: "failed",
                  metadata: {
                    attachments: [
                      {
                        id: "doc-empty",
                        title: "资料.md",
                        contentLength: 12,
                        kind: "text",
                        status: "context-ready"
                      }
                    ],
                    importedDocuments: [
                      {
                        id: "doc-empty",
                        title: "资料.md",
                        contentLength: 12
                      }
                    ]
                  }
                }
              ]
            }
          : session
      )
    }));

    useSessionStore.getState().sendPrototypeMessage("继续");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(streamMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({ content: "继续" }),
        contextMessages: expect.arrayContaining([
          expect.objectContaining({ id: "attachment-only-user", content: " " })
        ])
      }),
      expect.anything()
    );
  });

  it("retries a failed assistant message by reusing the previous user context", async () => {
    const streamMessage = vi.fn(async (_request, handlers) => {
      handlers.onEvent({ requestId: "stream-2", type: "done", content: "重新生成成功" });
      return { ok: true, data: { requestId: "stream-2" } };
    });
    vi.spyOn(Date, "now").mockReturnValue(2);
    vi.stubGlobal("lingDesktop", {
      counseling: { streamMessage },
      messages: { append: vi.fn(async () => ({ ok: true, data: undefined })) }
    });
    const activeSessionId = createActiveTestSession();
    useSessionStore.setState((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [
                ...session.messages,
                {
                  id: "retry-user",
                  sessionId: activeSessionId,
                  role: "user",
                  content: "上一条用户消息",
                  createdAt: "2026-07-04T00:01:00.000Z",
                  status: "sent"
                },
                {
                  id: "failed-assistant",
                  sessionId: activeSessionId,
                  role: "assistant",
                  content: "模型连接失败，请检查配置后重试。",
                  createdAt: "2026-07-04T00:01:01.000Z",
                  status: "failed"
                }
              ]
            }
          : session
      )
    }));

    useSessionStore.getState().retryMessage("failed-assistant");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(streamMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        assistantMessageId: "failed-assistant",
        message: expect.objectContaining({ id: "retry-user", content: "上一条用户消息" })
      }),
      expect.anything()
    );
    const messages = useSessionStore.getState().sessions.find((session) => session.id === activeSessionId)?.messages ?? [];
    expect(messages.find((message) => message.id === "failed-assistant")?.content).toBe("重新生成成功");
  });

  it("keeps failed user retry in sending state and ignores duplicate retry clicks while active", () => {
    const streamMessage = vi.fn(() => new Promise(() => undefined));
    vi.spyOn(Date, "now").mockReturnValue(3);
    vi.stubGlobal("lingDesktop", {
      counseling: { streamMessage },
      messages: { append: vi.fn(async () => ({ ok: true, data: undefined })) }
    });
    const activeSessionId = createActiveTestSession();
    useSessionStore.setState((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [
                ...session.messages,
                {
                  id: "failed-user-pending",
                  sessionId: activeSessionId,
                  role: "user",
                  content: "不要重复发送",
                  createdAt: "2026-07-04T00:02:00.000Z",
                  status: "failed"
                }
              ]
            }
          : session
      )
    }));

    useSessionStore.getState().retryMessage("failed-user-pending");
    useSessionStore.getState().retryMessage("failed-user-pending");

    const messages = useSessionStore.getState().sessions.find((session) => session.id === activeSessionId)?.messages ?? [];
    expect(streamMessage).toHaveBeenCalledTimes(1);
    expect(messages.find((message) => message.id === "failed-user-pending")?.status).toBe("sending");
  });

  it("marks user and assistant failed when stream start returns a validation error", async () => {
    const append = vi.fn(async () => ({ ok: true, data: undefined }));
    vi.stubGlobal("lingDesktop", {
      counseling: {
        streamMessage: vi.fn(async () => ({
          ok: false,
          error: { code: "VALIDATION_ERROR", message: "请求格式不正确" }
        }))
      },
      messages: { append }
    });
    vi.spyOn(Date, "now").mockReturnValue(10);

    createActiveTestSession();
    useSessionStore.getState().sendPrototypeMessage("这次请求会启动失败");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const activeSessionId = useSessionStore.getState().activeSessionId;
    const messages = useSessionStore.getState().sessions.find((session) => session.id === activeSessionId)?.messages ?? [];
    expect(messages.find((message) => message.id === "msg-user-10")?.status).toBe("failed");
    expect(messages.find((message) => message.id === "msg-assistant-10")).toMatchObject({
      content: "请求格式不正确",
      status: "failed"
    });
    expect(useSessionStore.getState().counselorStatus).toBe("error");
    expect(useSessionStore.getState().activeStreamRequestId).toBeUndefined();
    expect(append).toHaveBeenCalledWith(expect.objectContaining({ id: "msg-user-10", status: "failed" }));
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({ id: "msg-assistant-10", content: "请求格式不正确", status: "failed" })
    );
  });

  it("marks the user failed when the stream emits an error with failedUserMessageId", async () => {
    const streamMessage = vi.fn(async (_request, handlers) => {
      handlers.onEvent({
        requestId: "stream-11",
        type: "error",
        message: "请先到“设置 → 模型接入”保存 API Key，再开始咨询。",
        failedUserMessageId: "msg-user-11"
      });
      return { ok: true, data: { requestId: "stream-11" } };
    });
    vi.stubGlobal("lingDesktop", {
      counseling: { streamMessage },
      messages: { append: vi.fn(async () => ({ ok: true, data: undefined })) }
    });
    vi.spyOn(Date, "now").mockReturnValue(11);

    createActiveTestSession();
    useSessionStore.getState().sendPrototypeMessage("没有 API Key 的请求");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const activeSessionId = useSessionStore.getState().activeSessionId;
    const messages = useSessionStore.getState().sessions.find((session) => session.id === activeSessionId)?.messages ?? [];
    expect(messages.find((message) => message.id === "msg-user-11")?.status).toBe("failed");
    expect(messages.find((message) => message.id === "msg-assistant-11")).toMatchObject({
      content: "请先到“设置 → 模型接入”保存 API Key，再开始咨询。",
      status: "failed"
    });
    expect(useSessionStore.getState().counselorStatus).toBe("error");
    expect(useSessionStore.getState().activeStreamRequestId).toBeUndefined();
  });

  it("discards partial assistant content when cancellation arrives after chunks", async () => {
    const streamMessage = vi.fn(async (_request, handlers) => {
      handlers.onEvent({ requestId: "stream-12", type: "chunk", content: "已经生成一部分" });
      handlers.onEvent({ requestId: "stream-12", type: "status", status: "cancelled" });
      return { ok: true, data: { requestId: "stream-12" } };
    });
    vi.stubGlobal("lingDesktop", {
      counseling: { streamMessage },
      messages: { append: vi.fn(async () => ({ ok: true, data: undefined })) }
    });
    vi.spyOn(Date, "now").mockReturnValue(12);

    createActiveTestSession();
    useSessionStore.getState().sendPrototypeMessage("请开始生成后取消");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const activeSessionId = useSessionStore.getState().activeSessionId;
    const messages = useSessionStore.getState().sessions.find((session) => session.id === activeSessionId)?.messages ?? [];
    expect(messages.find((message) => message.id === "msg-assistant-12")).toMatchObject({
      content: "已停止，可重试。",
      status: "failed"
    });
    expect(useSessionStore.getState().counselorStatus).toBe("idle");
    expect(useSessionStore.getState().activeStreamRequestId).toBeUndefined();
  });

  it("marks an empty cancelled assistant as failed with a safe fallback", async () => {
    const streamMessage = vi.fn(async (_request, handlers) => {
      handlers.onEvent({ requestId: "stream-13", type: "status", status: "cancelled" });
      return { ok: true, data: { requestId: "stream-13" } };
    });
    vi.stubGlobal("lingDesktop", {
      counseling: { streamMessage },
      messages: { append: vi.fn(async () => ({ ok: true, data: undefined })) }
    });
    vi.spyOn(Date, "now").mockReturnValue(13);

    createActiveTestSession();
    useSessionStore.getState().sendPrototypeMessage("立刻取消");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const activeSessionId = useSessionStore.getState().activeSessionId;
    const messages = useSessionStore.getState().sessions.find((session) => session.id === activeSessionId)?.messages ?? [];
    expect(messages.find((message) => message.id === "msg-assistant-13")).toMatchObject({
      content: "已停止，可重试。",
      status: "failed"
    });
    expect(useSessionStore.getState().counselorStatus).toBe("idle");
    expect(useSessionStore.getState().activeStreamRequestId).toBeUndefined();
  });

  it("cancels document preflight without starting an unowned background stream", async () => {
    let resolveDocument!: (value: { ok: true; data: undefined }) => void;
    const createDocument = vi.fn(() => new Promise<{ ok: true; data: undefined }>((resolve) => {
      resolveDocument = resolve;
    }));
    const streamMessage = vi.fn(async () => ({ ok: true as const, data: { requestId: "stream-14" } }));
    const append = vi.fn(async () => ({ ok: true as const, data: undefined }));
    let resolveAppendMany!: (value: { ok: true; data: undefined }) => void;
    const appendMany = vi.fn(() => new Promise<{ ok: true; data: undefined }>((resolve) => {
      resolveAppendMany = resolve;
    }));
    const end = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", {
      documents: { create: createDocument },
      counseling: { streamMessage },
      messages: { append, appendMany },
      sessions: { end }
    });
    vi.spyOn(Date, "now").mockReturnValue(14);
    const sessionId = createActiveTestSession();

    expect(useSessionStore.getState().sendPrototypeMessage("请先看资料", {
      importedDocuments: [{
        id: "doc-preflight",
        sessionId,
        title: "待导入资料",
        kind: "pasted-text",
        content: "资料正文",
        contentLength: 4,
        createdAt: "2026-07-12T12:00:00.000Z",
        status: "ready"
      }]
    })).toBe(true);
    useSessionStore.getState().cancelStreamingResponse();
    expect(useSessionStore.getState().activeStreamRequestId).toBe("stream-14");
    await expect(useSessionStore.getState().endSession(sessionId)).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("先停止生成")
    });
    expect(end).not.toHaveBeenCalled();
    expect(appendMany).not.toHaveBeenCalled();
    resolveDocument({ ok: true, data: undefined });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(appendMany).toHaveBeenCalledWith([
      expect.objectContaining({ id: "msg-user-14", status: "sent" }),
      expect.objectContaining({ id: "msg-assistant-14", content: "已停止，可重试。", status: "failed" })
    ]);
    resolveAppendMany({ ok: true, data: undefined });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(streamMessage).not.toHaveBeenCalled();
    expect(useSessionStore.getState().activeStreamRequestId).toBeUndefined();
    const messages = useSessionStore.getState().sessions.find((session) => session.id === sessionId)?.messages ?? [];
    expect(messages.find((message) => message.id === "msg-user-14")?.content).toBe("请先看资料");
    expect(messages.find((message) => message.id === "msg-assistant-14")).toMatchObject({
      content: "已停止，可重试。",
      status: "failed"
    });
  });

  it("does not start a stream when document persistence is rejected", async () => {
    const streamMessage = vi.fn(async () => ({ ok: true as const, data: { requestId: "stream-15" } }));
    const appendMany = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", {
      documents: {
        create: vi.fn(async () => ({
          ok: false as const,
          error: { code: "VALIDATION_ERROR", message: "资料未能保存" }
        }))
      },
      counseling: { streamMessage },
      messages: { append: vi.fn(), appendMany }
    });
    vi.spyOn(Date, "now").mockReturnValue(15);
    const sessionId = createActiveTestSession();

    expect(useSessionStore.getState().sendPrototypeMessage("请看资料", {
      importedDocuments: [{
        id: "doc-rejected",
        sessionId,
        title: "被拒绝资料",
        kind: "pasted-text",
        content: "资料正文",
        contentLength: 4,
        createdAt: "2026-07-12T12:00:00.000Z",
        status: "ready"
      }]
    })).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(streamMessage).not.toHaveBeenCalled();
    expect(appendMany).toHaveBeenCalledWith([
      expect.objectContaining({ id: "msg-user-15", status: "failed" }),
      expect.objectContaining({ id: "msg-assistant-15", status: "failed" })
    ]);
    expect(useSessionStore.getState().activeStreamRequestId).toBeUndefined();
  });

  it("creates a zero-message draft session for the consultation opening", async () => {
    const create = vi.fn(async () => ({ ok: true as const, data: undefined }));
    const append = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", { sessions: { create }, messages: { append } });
    vi.spyOn(Date, "now").mockReturnValue(200);

    const result = await useSessionStore.getState().createDraftSession({ counselorId: "zhouzhou" });
    if (!result.ok) throw new Error(result.message);

    expect(result.sessionId).toMatch(/^session-/);
    expect(useSessionStore.getState().sessions[0]).toMatchObject({
      id: result.sessionId,
      counselorId: "zhouzhou",
      status: "draft",
      messages: []
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ id: result.sessionId, status: "draft" }));
    expect(append).not.toHaveBeenCalled();
    expect(useSessionStore.getState().sendPrototypeMessage("draft 不能发送")).toBe(false);
  });

  it("does not reuse a default session number after an earlier session was renamed", async () => {
    const create = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", { sessions: { create } });
    useSessionStore.setState({
      sessions: [
        historySession("s4", "未完成会谈回访测试"),
        historySession("s3", "与林乐水的会谈 · session 3"),
        historySession("s2", "与林乐水的会谈 · session 2"),
        historySession("s1", "与林乐水的会谈 · session 1")
      ]
    });

    const result = await useSessionStore.getState().createDraftSession({ counselorId: "linleshui" });

    expect(result).toMatchObject({ ok: true });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      title: "与林乐水的会谈 · session 5"
    }));
  });

  it("passes the replacement intent to main and reconciles the ended old session", async () => {
    const oldSessionId = createActiveTestSession();
    const create = vi.fn(async () => ({ ok: true as const, data: undefined }));
    const get = vi.fn(async (id: string) => ({
      ok: true as const,
      data: {
        ...persistedActiveSession(id),
        status: "ended" as const,
        endedAt: "2026-07-14T10:00:00.000Z",
        updatedAt: "2026-07-14T10:00:00.000Z"
      }
    }));
    vi.stubGlobal("lingDesktop", { sessions: { create, get } });

    const result = await useSessionStore.getState().createDraftSession({
      counselorId: "chengling",
      replaceUnfinishedSessionId: oldSessionId
    });

    expect(result).toMatchObject({ ok: true });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ counselorId: "chengling", status: "draft" }),
      { replaceUnfinishedSessionId: oldSessionId }
    );
    expect(useSessionStore.getState().sessions.find((session) => session.id === oldSessionId)).toMatchObject({
      status: "ended",
      endedAt: "2026-07-14T10:00:00.000Z"
    });
  });

  it("activates a draft only after the persisted update succeeds", async () => {
    const create = vi.fn(async () => ({ ok: true as const, data: undefined }));
    const activateDraft = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", { sessions: { create, activateDraft } });
    vi.spyOn(Date, "now").mockReturnValue(201);
    const created = await useSessionStore.getState().createDraftSession({ counselorId: "linleshui" });
    if (!created.ok) throw new Error(created.message);

    const activated = await useSessionStore.getState().activateDraftSession(created.sessionId);

    expect(activated).toEqual({ ok: true });
    expect(activateDraft).toHaveBeenCalledWith(created.sessionId);
    expect(useSessionStore.getState().sessions[0].status).toBe("active");
  });

  it("keeps a draft when activation or deletion fails", async () => {
    const create = vi.fn(async () => ({ ok: true as const, data: undefined }));
    const activateDraft = vi.fn(async () => ({ ok: false as const, error: { code: "IO_ERROR", message: "保存失败" } }));
    const cancelDraft = vi.fn(async () => ({ ok: false as const, error: { code: "IO_ERROR", message: "删除失败" } }));
    vi.stubGlobal("lingDesktop", { sessions: { create, activateDraft, cancelDraft } });
    vi.spyOn(Date, "now").mockReturnValue(202);
    const created = await useSessionStore.getState().createDraftSession({ counselorId: "chengling" });
    if (!created.ok) throw new Error(created.message);

    await expect(useSessionStore.getState().activateDraftSession(created.sessionId)).resolves.toEqual({
      ok: false,
      message: "保存失败"
    });
    await expect(useSessionStore.getState().deleteDraftSession(created.sessionId)).resolves.toEqual({
      ok: false,
      message: "删除失败"
    });
    expect(useSessionStore.getState().sessions[0]).toMatchObject({ id: created.sessionId, status: "draft" });
  });

  it("deduplicates simultaneous draft creation for the same counselor", async () => {
    let resolveCreate: ((value: { ok: true; data: undefined }) => void) | undefined;
    const create = vi.fn(
      () => new Promise<{ ok: true; data: undefined }>((resolve) => {
        resolveCreate = resolve;
      })
    );
    vi.stubGlobal("lingDesktop", { sessions: { create } });

    const first = useSessionStore.getState().createDraftSession({ counselorId: "chengling" });
    const second = useSessionStore.getState().createDraftSession({ counselorId: "chengling" });
    expect(create).toHaveBeenCalledTimes(1);
    resolveCreate?.({ ok: true, data: undefined });

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toEqual(secondResult);
    expect(useSessionStore.getState().sessions).toHaveLength(1);
  });

  it("restores a main-process stream after renderer reload", async () => {
    const getActiveStream = vi.fn(async () => ({
      ok: true as const,
      data: { requestId: "request-running", sessionId: "session-running" }
    }));
    vi.stubGlobal("lingDesktop", {
      sessions: { list: vi.fn(async () => ({ ok: true, data: [persistedActiveSession("session-running")] })) },
      messages: { listBySessionId: vi.fn(async () => ({ ok: true, data: [] })) },
      counseling: { getActiveStream }
    });

    await useSessionStore.getState().loadPersistedSessions();

    expect(useSessionStore.getState()).toMatchObject({
      activeStreamRequestId: "request-running",
      activeStreamSessionId: "session-running",
      counselorStatus: "streaming"
    });
  });

  it("settles orphaned sending messages only after main confirms there is no active stream", async () => {
    const append = vi.fn(async () => ({ ok: true as const, data: undefined }));
    vi.stubGlobal("lingDesktop", {
      sessions: { list: vi.fn(async () => ({ ok: true, data: [persistedActiveSession("session-interrupted")] })) },
      messages: {
        listBySessionId: vi.fn(async () => ({
          ok: true,
          data: [
            {
              id: "assistant-interrupted",
              sessionId: "session-interrupted",
              role: "assistant",
              content: "",
              createdAt: "2026-07-12T12:00:00.000Z",
              status: "sending"
            }
          ]
        })),
        append
      },
      counseling: { getActiveStream: vi.fn(async () => ({ ok: true, data: null })) }
    });

    await useSessionStore.getState().loadPersistedSessions();

    expect(useSessionStore.getState().sessions[0].messages[0]).toMatchObject({
      content: "上次回应因应用关闭而中断，可以重新尝试。",
      status: "failed"
    });
    expect(append).toHaveBeenCalledWith(expect.objectContaining({ id: "assistant-interrupted", status: "failed" }));
  });

  it("re-reads final persisted content after the main stream lock disappears", async () => {
    const append = vi.fn(async () => ({ ok: true as const, data: undefined }));
    const listBySessionId = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        data: [{
          id: "assistant-race",
          sessionId: "session-race",
          role: "assistant",
          content: "",
          createdAt: "2026-07-12T12:00:00.000Z",
          status: "sending"
        }]
      })
      .mockResolvedValueOnce({
        ok: true,
        data: [{
          id: "assistant-race",
          sessionId: "session-race",
          role: "assistant",
          content: "已经完整写入的最终回应",
          createdAt: "2026-07-12T12:00:00.000Z",
          status: "sent"
        }]
      });
    vi.stubGlobal("lingDesktop", {
      sessions: { list: vi.fn(async () => ({ ok: true, data: [persistedActiveSession("session-race")] })) },
      messages: { listBySessionId, append },
      counseling: { getActiveStream: vi.fn(async () => ({ ok: true, data: null })) }
    });

    await useSessionStore.getState().loadPersistedSessions();

    expect(useSessionStore.getState().sessions[0].messages[0]).toMatchObject({
      content: "已经完整写入的最终回应",
      status: "sent"
    });
    expect(append).not.toHaveBeenCalled();
  });

  it("checks unloaded same-counselor history for a real user message before choosing first or returning copy", async () => {
    useSessionStore.setState({
      sessions: [
        {
          id: "ended-unloaded",
          title: "旧会谈",
          time: "昨天",
          preview: "",
          counselorId: "zhouzhou",
          roomThemeId: "warm-study",
          modelName: "test",
          status: "ended",
          messages: [],
          messagesLoaded: false
        }
      ]
    });
    vi.stubGlobal("lingDesktop", {
      messages: {
        listBySessionId: vi.fn(async () => ({
          ok: true,
          data: [
            {
              id: "old-user",
              sessionId: "ended-unloaded",
              role: "user",
              content: "我以前来过。",
              createdAt: "2026-07-11T12:00:00.000Z",
              status: "sent"
            }
          ]
        }))
      }
    });

    await expect(useSessionStore.getState().hasMetCounselor("zhouzhou")).resolves.toBe(true);
  });

  it("conservatively uses returning copy when historical messages cannot be read", async () => {
    useSessionStore.setState({
      sessions: [{
        id: "ended-unavailable",
        title: "旧会谈",
        time: "昨天",
        preview: "",
        counselorId: "zhouzhou",
        roomThemeId: "warm-study",
        modelName: "test",
        status: "ended",
        messages: [],
        messagesLoaded: false
      }]
    });
    vi.stubGlobal("lingDesktop", {
      messages: { listBySessionId: vi.fn(async () => { throw new Error("transport unavailable"); }) }
    });

    await expect(useSessionStore.getState().hasMetCounselor("zhouzhou")).resolves.toBe(true);
  });
});

function persistedActiveSession(id: string) {
  return {
    id,
    title: "持久化会谈",
    counselorId: "chengling",
    roomThemeId: "warm-study",
    teamId: "one-way-mirror",
    modelName: "test",
    createdAt: "2026-07-12T12:00:00.000Z",
    startedAt: "2026-07-12T12:00:00.000Z",
    updatedAt: "2026-07-12T12:00:00.000Z",
    status: "active" as const
  };
}

function historySession(id: string, title: string) {
  return {
    id,
    title,
    time: "昨天",
    preview: "",
    counselorId: "linleshui",
    roomThemeId: "white-room",
    modelName: "test",
    status: "ended" as const,
    messages: []
  };
}
