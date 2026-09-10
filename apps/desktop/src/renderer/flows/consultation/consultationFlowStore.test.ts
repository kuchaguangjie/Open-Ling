import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetConsultationDraftStore, useConsultationDraftStore } from "./consultationDraftStore";
import { useAppStore } from "../../stores/appStore";
import { resetSessionStore, type SessionLetterReadResult, useSessionStore } from "../../stores/sessionStore";
import {
  activeConsultationFlowStorageKey,
  readActiveConsultationFlow
} from "./consultationFlowStorage";
import { resetConsultationFlowStore, useConsultationFlowStore } from "./consultationFlowStore";

describe("consultationFlowStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetSessionStore();
    resetConsultationFlowStore();
    resetConsultationDraftStore();
    useAppStore.setState({ activePage: "lobby" });
  });

  it("records the room-arrival title card before navigating to the opening dialogue", () => {
    useConsultationFlowStore.getState().openDraftSession({
      counselorId: "chengling",
      sessionId: "session-draft",
      script: "first"
    });

    expect(useAppStore.getState().activePage).toBe("room");
    expect(useConsultationFlowStore.getState().flow?.surface).toEqual({ kind: "arrival" });
    expect(readActiveConsultationFlow()?.sessionId).toBe("session-draft");
    useConsultationFlowStore.getState().finishArrival();
    expect(useConsultationFlowStore.getState().flow?.surface).toEqual({ kind: "opening", lineIndex: 0 });
  });

  it("shows the formal session only after draft activation succeeds", async () => {
    const activateDraftSession = vi.fn(async () => ({ ok: true as const }));
    useSessionStore.setState({ activateDraftSession });
    useConsultationFlowStore.getState().openDraftSession({
      counselorId: "zhouzhou",
      sessionId: "session-draft",
      script: "returning"
    });
    useConsultationFlowStore.getState().finishArrival();

    await useConsultationFlowStore.getState().startSession();

    expect(activateDraftSession).toHaveBeenCalledWith("session-draft");
    expect(useConsultationFlowStore.getState().flow?.surface.kind).toBe("session");
  });

  it("keeps opening recoverable when activation fails", async () => {
    useSessionStore.setState({
      activateDraftSession: vi.fn(async () => ({ ok: false as const, message: "保存失败" }))
    });
    useConsultationFlowStore.getState().openDraftSession({
      counselorId: "linleshui",
      sessionId: "session-draft",
      script: "first"
    });
    useConsultationFlowStore.getState().finishArrival();

    await useConsultationFlowStore.getState().startSession();

    expect(useConsultationFlowStore.getState().flow?.surface.kind).toBe("opening");
    expect(useConsultationFlowStore.getState().error).toBe("保存失败");
    expect(window.localStorage.getItem(activeConsultationFlowStorageKey)).not.toBeNull();
  });

  it("reads back a successful end before entering closing and the three-choice menu", async () => {
    useSessionStore.setState({
      endSession: vi.fn(async () => ({ ok: true as const, state: "ended" as const, endedAt: "2026-07-12T12:00:00.000Z" }))
    });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: "session-active" });

    await useConsultationFlowStore.getState().requestEnd();
    expect(useConsultationFlowStore.getState().flow?.surface).toEqual({ kind: "closing", lineIndex: 0 });
    useConsultationFlowStore.getState().skipClosing();
    expect(useConsultationFlowStore.getState().flow?.surface.kind).toBe("closing-menu");
    useConsultationFlowStore.getState().openClosingHistory();
    expect(useConsultationFlowStore.getState().flow?.surface).toEqual({ kind: "history", origin: "closing" });
    useConsultationFlowStore.getState().returnToClosingMenu();
    expect(useConsultationFlowStore.getState().flow?.surface.kind).toBe("closing-menu");
  });

  it("empty session ending returns to the lobby without entering the closing flow", async () => {
    useSessionStore.setState({
      endSession: vi.fn(async () => ({ ok: true as const, state: "discarded" as const }))
    });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: "session-empty" });

    await useConsultationFlowStore.getState().requestEnd();

    expect(useConsultationFlowStore.getState().flow).toBeNull();
    expect(useAppStore.getState().activePage).toBe("lobby");
  });

  it("starts a new consultation by atomically ending the current session", async () => {
    const createDraftSession = vi.fn(async () => ({ ok: true as const, sessionId: "session-new" }));
    const getCounselorVisitCount = vi.fn(async () => 1);
    useSessionStore.setState({ createDraftSession, getCounselorVisitCount });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: "session-current" });
    useConsultationDraftStore.getState().setDraft("session-current", "这段话还没有发送");

    await useConsultationFlowStore.getState().startNewConsultation();

    expect(createDraftSession).toHaveBeenCalledWith({
      counselorId: "chengling",
      reportErrorInStore: false,
      replaceUnfinishedSessionId: "session-current"
    });
    expect(useConsultationFlowStore.getState().flow).toMatchObject({
      sessionId: "session-new",
      script: "second",
      surface: { kind: "arrival" }
    });
    expect(useAppStore.getState().activePage).toBe("room");
    expect(useConsultationDraftStore.getState().draftsBySessionId["session-current"]).toBeUndefined();
  });

  it("可以从结束后回看直接继续同一次咨询", async () => {
    const resumeSession = vi.fn(async () => ({ ok: true as const }));
    useSessionStore.setState({ resumeSession });
    useConsultationFlowStore.setState({
      flow: {
        counselorId: "chengling",
        sessionId: "session-ended",
        script: "returning",
        surface: { kind: "history", origin: "closing" }
      }
    });

    await useConsultationFlowStore.getState().resumeSessionFromHistory();

    expect(resumeSession).toHaveBeenCalledWith("session-ended");
    expect(useConsultationFlowStore.getState().flow?.surface).toEqual({ kind: "session" });
  });

  it("也可以在收尾页直接继续同一次咨询", async () => {
    const resumeSession = vi.fn(async () => ({ ok: true as const }));
    useSessionStore.setState({ resumeSession });
    useConsultationFlowStore.setState({
      flow: {
        counselorId: "chengling",
        sessionId: "session-ended",
        script: "returning",
        surface: { kind: "closing-notice", reason: "letter-pending" }
      }
    });

    await useConsultationFlowStore.getState().resumeSessionFromHistory();

    expect(resumeSession).toHaveBeenCalledWith("session-ended");
    expect(useConsultationFlowStore.getState().flow?.surface).toEqual({ kind: "session" });
    // The closing cycle belongs to the ending that just got undone.
    expect(useConsultationFlowStore.getState().flow?.closingCycle).toBeUndefined();
  });

  it("keeps the three choices available after a pending-letter notice", async () => {
    const loadSessionLetter = vi.fn<(id: string) => Promise<SessionLetterReadResult>>(async () => ({ ok: true, availability: "pending", letter: null }));
    useSessionStore.setState({
      loadSessionLetter
    });
    useConsultationFlowStore.setState({
      flow: {
        counselorId: "zhouzhou",
        sessionId: "session-ended",
        script: "returning",
        surface: { kind: "closing-menu" }
      }
    });

    await useConsultationFlowStore.getState().readLetter();
    expect(useConsultationFlowStore.getState().flow?.surface).toEqual({ kind: "closing-notice", reason: "letter-pending" });
    useConsultationFlowStore.getState().openClosingHistory();
    expect(useConsultationFlowStore.getState().flow?.surface).toEqual({ kind: "history", origin: "closing" });
    useConsultationFlowStore.getState().returnToClosingMenu();
    expect(useConsultationFlowStore.getState().flow?.surface.kind).toBe("closing-menu");

    await useConsultationFlowStore.getState().readLetter();
    loadSessionLetter.mockResolvedValueOnce({ ok: true as const, availability: "ready" as const, letter: null });
    await useConsultationFlowStore.getState().readLetter();
    expect(useConsultationFlowStore.getState().flow?.surface).toEqual({ kind: "letter", origin: "closing" });
  });

  it("reconciles a saved starting surface with the persisted active status without starting twice", () => {
    useSessionStore.setState({
      sessions: [
        {
          id: "session-restored",
          title: "恢复会谈",
          time: "刚刚",
          preview: "",
          counselorId: "linleshui",
          roomThemeId: "warm-study",
          modelName: "test",
          status: "active",
          messages: []
        }
      ]
    });
    useConsultationFlowStore.getState().setFlow({
      counselorId: "chengling",
      sessionId: "session-restored",
      script: "first",
      surface: { kind: "starting", lineIndex: 1 }
    });
    useConsultationFlowStore.setState({ flow: null });

    const restored = useConsultationFlowStore.getState().restoreAndReconcile();

    expect(restored?.surface.kind).toBe("session");
    expect(restored?.counselorId).toBe("linleshui");
    expect(useAppStore.getState().activePage).toBe("room");
  });

  it("keeps an unknown end result in ending until a readback confirms ended", async () => {
    useSessionStore.setState({
      endSession: vi.fn(async () => ({
        ok: false as const,
        state: "unknown" as const,
        message: "暂时无法确认"
      })),
      readSessionStatus: vi.fn(async () => ({
        ok: true as const,
        status: "ended" as const,
        endedAt: "2026-07-12T13:00:00.000Z"
      }))
    });
    useConsultationFlowStore.getState().openActiveSession({ counselorId: "chengling", sessionId: "session-unknown" });

    await useConsultationFlowStore.getState().requestEnd();
    expect(useConsultationFlowStore.getState().flow?.surface.kind).toBe("ending");
    expect(useConsultationFlowStore.getState().error).toBe("暂时无法确认");

    await useConsultationFlowStore.getState().recheckEndStatus();
    expect(useConsultationFlowStore.getState().flow?.surface).toEqual({ kind: "closing", lineIndex: 0 });
  });
});
