import { create } from "zustand";
import { useAppStore } from "../../stores/appStore";
import { localize } from "../../localization";
import { useSessionStore } from "../../stores/sessionStore";
import { useSettingsStore } from "../../stores/settingsStore";
import {
  createOpeningFlow,
  reconcileConsultationFlow,
  transitionConsultationFlow,
  type ConsultationOpeningScript,
  type ConsultationFlowState
} from "./consultationFlowMachine";
import {
  clearActiveConsultationFlow,
  readActiveConsultationFlow,
  writeActiveConsultationFlow
} from "./consultationFlowStorage";
import { useConsultationDraftStore } from "./consultationDraftStore";

interface ConsultationFlowStoreState {
  error?: string;
  flow: ConsultationFlowState | null;
  isBusy: boolean;
  openDraftSession: (input: {
    counselorId: string;
    sessionId: string;
    script: ConsultationOpeningScript;
  }) => void;
  openActiveSession: (input: { counselorId: string; sessionId: string }) => void;
  restore: () => ConsultationFlowState | null;
  restoreAndReconcile: () => ConsultationFlowState | null;
  finishArrival: () => void;
  advanceOpening: (lineCount: number) => Promise<void>;
  skipOpening: () => Promise<void>;
  startSession: () => Promise<void>;
  cancelOpening: () => Promise<void>;
  startNewConsultation: () => Promise<void>;
  requestEnd: () => Promise<void>;
  recheckEndStatus: () => Promise<void>;
  advanceClosing: (lineCount: number) => void;
  skipClosing: () => void;
  openClosingHistory: () => void;
  returnToClosingMenu: () => void;
  readLetter: () => Promise<void>;
  finishLetterNotice: () => void;
  closeLetter: () => void;
  openPersistedSession: (input: {
    counselorId: string;
    sessionId: string;
    script?: ConsultationOpeningScript;
    status: "draft" | "active" | "ended";
  }) => void;
  resumeSessionFromHistory: () => Promise<void>;
  clearError: () => void;
  leaveForLobby: () => void;
  setFlow: (flow: ConsultationFlowState) => void;
}

function persist(flow: ConsultationFlowState | null) {
  if (flow) writeActiveConsultationFlow(flow);
  else clearActiveConsultationFlow();
}

function flowCopy(zhCN: string, enUS: string) {
  return localize(useSettingsStore.getState().locale, zhCN, enUS);
}

export const useConsultationFlowStore = create<ConsultationFlowStoreState>((set, get) => ({
  error: undefined,
  flow: null,
  isBusy: false,
  openDraftSession: (input) => {
    const flow = createOpeningFlow(input);
    persist(flow);
    set({ flow, error: undefined, isBusy: false });
    useSessionStore.getState().setActiveSession(input.sessionId);
    useAppStore.getState().setActivePage("room");
  },
  openActiveSession: ({ counselorId, sessionId }) => {
    const flow: ConsultationFlowState = {
      counselorId,
      sessionId,
      script: "returning",
      surface: { kind: "session" }
    };
    persist(flow);
    set({ flow, error: undefined, isBusy: false });
    useSessionStore.getState().setActiveSession(sessionId);
    useAppStore.getState().setActivePage("room");
  },
  restore: () => {
    const flow = readActiveConsultationFlow();
    set({ flow, error: undefined, isBusy: false });
    return flow;
  },
  restoreAndReconcile: () => {
    const stored = readActiveConsultationFlow();
    if (!stored) {
      set({ flow: null, error: undefined, isBusy: false });
      return null;
    }
    const session = useSessionStore.getState().sessions.find((item) => item.id === stored.sessionId);
    if (!session) {
      clearActiveConsultationFlow();
      set({ flow: null, error: undefined, isBusy: false });
      useAppStore.getState().setActivePage("lobby");
      return null;
    }
    const reconciled = reconcileConsultationFlow(
      { ...stored, counselorId: session.counselorId },
      { status: session.status, endedAt: session.endedAt }
    );
    const letter = useSessionStore.getState().sessionLettersBySessionId[session.id];
    const corrected = reconciled.surface.kind === "letter" && !(letter?.status === "ready" && letter.letterMd.trim())
      ? {
          ...reconciled,
          surface: reconciled.surface.origin === "closing"
            ? {
                kind: "closing-notice" as const,
                reason: letter?.status === "failed"
                  ? "letter-failed" as const
                  : letter?.status === "pending"
                    ? "letter-pending" as const
                    : "letter-unknown" as const
              }
            : { kind: "history" as const, origin: "archive" as const }
        }
      : reconciled;
    persist(corrected);
    set({ flow: corrected, error: undefined, isBusy: false });
    useSessionStore.getState().setActiveSession(session.id);
    useAppStore.getState().setActivePage("room");
    return corrected;
  },
  finishArrival: () => {
    const flow = get().flow;
    if (!flow || flow.surface.kind !== "arrival" || get().isBusy) return;
    const next = transitionConsultationFlow(flow, { type: "ARRIVAL_FINISHED" });
    persist(next);
    set({ flow: next, error: undefined });
  },
  advanceOpening: async (lineCount) => {
    const flow = get().flow;
    if (!flow || flow.surface.kind !== "opening" || get().isBusy) return;
    const next = transitionConsultationFlow(flow, { type: "OPENING_NEXT", lineCount });
    if (next.surface.kind === "starting") {
      set({ flow: next });
      persist(next);
      await get().startSession();
      return;
    }
    persist(next);
    set({ flow: next, error: undefined });
  },
  skipOpening: async () => {
    const flow = get().flow;
    if (!flow || flow.surface.kind !== "opening" || get().isBusy) return;
    const next = transitionConsultationFlow(flow, { type: "OPENING_SKIP" });
    persist(next);
    set({ flow: next, error: undefined });
    await get().startSession();
  },
  startSession: async () => {
    const flow = get().flow;
    if (!flow || (flow.surface.kind !== "opening" && flow.surface.kind !== "starting") || get().isBusy) return;
    const starting =
      flow.surface.kind === "starting"
        ? flow
        : transitionConsultationFlow(flow, { type: "OPENING_SKIP" });
    persist(starting);
    set({ flow: starting, error: undefined, isBusy: true });
    let result;
    try {
      result = await useSessionStore.getState().activateDraftSession(flow.sessionId);
    } catch {
      const current = get().flow;
      if (current?.sessionId === flow.sessionId) {
        const next = transitionConsultationFlow(current, { type: "START_FAILED" });
        persist(next);
        set({ flow: next, error: flowCopy("没有开始这次咨询。请确认模型配置后重试；如果仍失败，可以返回等待室。", "This session could not begin. Check the model configuration and try again; if it still fails, return to the waiting room."), isBusy: false });
      }
      return;
    }
    const current = get().flow;
    if (!current || current.sessionId !== flow.sessionId) return;
    const next = transitionConsultationFlow(current, { type: result.ok ? "START_SUCCEEDED" : "START_FAILED" });
    persist(next);
    set({ flow: next, error: result.ok ? undefined : result.message, isBusy: false });
  },
  cancelOpening: async () => {
    const flow = get().flow;
    if (!flow || (flow.surface.kind !== "opening" && flow.surface.kind !== "starting") || get().isBusy) return;
    const lineIndex = "lineIndex" in flow.surface ? flow.surface.lineIndex : 0;
    const cancelling: ConsultationFlowState = { ...flow, surface: { kind: "cancelling", lineIndex } };
    persist(cancelling);
    set({ flow: cancelling, error: undefined, isBusy: true });
    let result;
    try {
      result = await useSessionStore.getState().deleteDraftSession(flow.sessionId);
    } catch {
      const opening: ConsultationFlowState = { ...flow, surface: { kind: "opening", lineIndex } };
      persist(opening);
      set({ flow: opening, error: flowCopy("没有取消这次尚未开始的咨询。请重新读取状态后再试。", "This unstarted session could not be canceled. Reload its status and try again."), isBusy: false });
      return;
    }
    if (result.ok) {
      clearActiveConsultationFlow();
      set({ flow: null, error: undefined, isBusy: false });
      useAppStore.getState().setActivePage("lobby");
      return;
    }
    const opening: ConsultationFlowState = { ...flow, surface: { kind: "opening", lineIndex } };
    persist(opening);
    set({ flow: opening, error: result.message, isBusy: false });
  },
  startNewConsultation: async () => {
    const flow = get().flow;
    if (!flow || flow.surface.kind !== "session" || get().isBusy) return;
    set({ isBusy: true, error: undefined });
    // Count the current session before replacement. It becomes the immediately
    // preceding visit only after the atomic replacement succeeds.
    const visitCount = await useSessionStore.getState().getCounselorVisitCount(flow.counselorId).catch(() => 2);
    let result;
    try {
      result = await useSessionStore.getState().createDraftSession({
        counselorId: flow.counselorId,
        reportErrorInStore: false,
        replaceUnfinishedSessionId: flow.sessionId
      });
    } catch {
      const current = get().flow;
      if (current?.sessionId === flow.sessionId && current.surface.kind === "session") {
        set({ flow: current, error: flowCopy("没有开启新咨询。原会谈仍保留，请重试。", "A new session could not be started. The earlier session remains unchanged. Please try again."), isBusy: false });
      }
      return;
    }
    const current = get().flow;
    if (!current || current.sessionId !== flow.sessionId || current.surface.kind !== "session") return;
    if (!result.ok) {
      set({ flow: current, error: result.message, isBusy: false });
      return;
    }
    // A successful replacement has made the prior session read-only. Its unsent
    // draft never belongs to the new session, and must not reappear if history is
    // viewed later in this app run.
    useConsultationDraftStore.getState().clearSession(flow.sessionId);
    const next = createOpeningFlow({
      counselorId: flow.counselorId,
      sessionId: result.sessionId,
      script: visitCount === 0 ? "first" : visitCount === 1 ? "second" : "returning"
    });
    persist(next);
    set({ flow: next, error: undefined, isBusy: false });
    useSessionStore.getState().setActiveSession(result.sessionId);
    useAppStore.getState().setActivePage("room");
  },
  requestEnd: async () => {
    const flow = get().flow;
    if (!flow || flow.surface.kind !== "session" || get().isBusy) return;
    const ending = transitionConsultationFlow(flow, { type: "END_REQUESTED", cycleId: createOperationId("closing") });
    persist(ending);
    set({ flow: ending, error: undefined, isBusy: true });
    let result;
    try {
      result = await useSessionStore.getState().endSession(flow.sessionId);
    } catch {
      const current = get().flow;
      if (current?.sessionId === flow.sessionId && current.surface.kind === "ending") {
        set({ flow: current, error: flowCopy("暂时无法确认咨询是否已经结束，请重新检查状态。", "Ling cannot confirm whether the session ended. Check its status again."), isBusy: false });
      }
      return;
    }
    const current = get().flow;
    if (!current || current.sessionId !== flow.sessionId || current.surface.kind !== "ending") return;
    if (result.ok && result.state === "discarded") {
      useConsultationDraftStore.getState().clearSession(flow.sessionId);
      persist(null);
      set({ flow: null, error: undefined, isBusy: false });
      useAppStore.getState().setActivePage("lobby");
      return;
    }
    if (!result.ok && result.state !== "active") {
      set({ flow: current, error: result.message, isBusy: false });
      return;
    }
    const next = result.ok
      ? transitionConsultationFlow(current, { type: "END_SUCCEEDED", endedAt: result.endedAt })
      : transitionConsultationFlow(current, { type: "END_FAILED" });
    if (result.ok) useConsultationDraftStore.getState().clearSession(flow.sessionId);
    persist(next);
    set({ flow: next, error: result.ok ? undefined : result.message, isBusy: false });
  },
  recheckEndStatus: async () => {
    const flow = get().flow;
    if (!flow || flow.surface.kind !== "ending" || get().isBusy) return;
    set({ isBusy: true, error: undefined });
    let result;
    try {
      result = await useSessionStore.getState().readSessionStatus(flow.sessionId);
    } catch {
      set({ isBusy: false, error: flowCopy("暂时无法确认这场咨询的状态。请重新读取后再操作。", "Ling cannot confirm this session's status. Reload it before continuing.") });
      return;
    }
    const current = get().flow;
    if (!current || current.sessionId !== flow.sessionId || current.surface.kind !== "ending") return;
    if (!result.ok) {
      set({ flow: current, isBusy: false, error: result.message });
      return;
    }
    const next = result.status === "ended"
      ? transitionConsultationFlow(current, {
          type: "END_SUCCEEDED",
          endedAt: result.endedAt ?? new Date().toISOString()
        })
      : transitionConsultationFlow(current, { type: "END_FAILED" });
    if (result.status === "ended") useConsultationDraftStore.getState().clearSession(flow.sessionId);
    persist(next);
    set({ flow: next, isBusy: false, error: result.status === "draft" ? flowCopy("咨询尚未正式开始。", "This session has not formally begun.") : undefined });
  },
  advanceClosing: (lineCount) => {
    const flow = get().flow;
    if (!flow || flow.surface.kind !== "closing" || get().isBusy) return;
    const next = transitionConsultationFlow(flow, { type: "CLOSING_NEXT", lineCount });
    persist(next);
    set({ flow: next, error: undefined });
  },
  skipClosing: () => {
    const flow = get().flow;
    if (!flow || get().isBusy) return;
    const next = transitionConsultationFlow(flow, { type: "CLOSING_SKIP" });
    persist(next);
    set({ flow: next, error: undefined });
  },
  openClosingHistory: () => {
    const flow = get().flow;
    if (!flow || get().isBusy) return;
    const next = transitionConsultationFlow(flow, { type: "OPEN_HISTORY" });
    persist(next);
    set({ flow: next, error: undefined });
  },
  returnToClosingMenu: () => {
    const flow = get().flow;
    if (!flow || get().isBusy) return;
    const next = transitionConsultationFlow(flow, { type: "RETURN_TO_CLOSING" });
    persist(next);
    set({ flow: next, error: undefined });
  },
  readLetter: async () => {
    const flow = get().flow;
    if (!flow || (flow.surface.kind !== "closing-menu" && flow.surface.kind !== "closing-notice") || get().isBusy) return;
    set({ isBusy: true, error: undefined });
    let result;
    try {
      result = await useSessionStore.getState().loadSessionLetter(flow.sessionId);
    } catch {
      const current = get().flow;
      if (current?.sessionId === flow.sessionId && (current.surface.kind === "closing-menu" || current.surface.kind === "closing-notice")) {
        const next = transitionConsultationFlow(current, { type: "SHOW_LETTER_UNKNOWN" });
        persist(next);
        set({ flow: next, isBusy: false, error: flowCopy("暂时无法确认咨询师来信的状态，请稍后再试。", "Ling cannot confirm the counselor letter's status. Please try again later.") });
      }
      return;
    }
    const current = get().flow;
    if (!current || current.sessionId !== flow.sessionId || (current.surface.kind !== "closing-menu" && current.surface.kind !== "closing-notice")) return;
    const event = !result.ok
      ? { type: "SHOW_LETTER_UNKNOWN" as const }
      : result.availability === "ready"
        ? { type: "OPEN_LETTER_READY" as const }
        : result.availability === "failed"
          ? { type: "SHOW_LETTER_FAILED" as const }
          : { type: "SHOW_LETTER_PENDING" as const };
    const next = transitionConsultationFlow(current, event);
    persist(next);
    set({ flow: next, isBusy: false, error: result.ok ? undefined : result.message });
  },
  finishLetterNotice: () => {
    const flow = get().flow;
    if (!flow) return;
    const next = transitionConsultationFlow(flow, { type: "NOTICE_FINISHED" });
    persist(next);
    set({ flow: next, error: undefined, isBusy: false });
  },
  closeLetter: () => {
    const flow = get().flow;
    if (!flow) return;
    const next = transitionConsultationFlow(flow, { type: "CLOSE_LETTER" });
    persist(next);
    set({ flow: next, error: undefined, isBusy: false });
  },
  openPersistedSession: ({ counselorId, sessionId, script, status }) => {
    const activeStreamSessionId = useSessionStore.getState().activeStreamSessionId;
    if (activeStreamSessionId && activeStreamSessionId !== sessionId) {
      set({ error: flowCopy("这场会谈正在生成回应。请等待完成，或先停止生成，再切换会谈。", "This session is generating a response. Wait for it to finish, or stop generation before switching sessions.") });
      return;
    }
    const flow: ConsultationFlowState = {
      counselorId,
      sessionId,
      script: status === "draft" ? script ?? "first" : "returning",
      surface:
        status === "draft"
          ? { kind: "arrival" }
          : status === "active"
            ? { kind: "session" }
            : { kind: "history", origin: "archive" }
    };
    persist(flow);
    set({ flow, error: undefined, isBusy: false });
    useSessionStore.getState().setActiveSession(sessionId);
    useAppStore.getState().setActivePage("room");
  },
  resumeSessionFromHistory: async () => {
    const flow = get().flow;
    if (!flow || flow.surface.kind !== "history" || get().isBusy) return;
    set({ isBusy: true, error: undefined });
    let result;
    try {
      result = await useSessionStore.getState().resumeSession(flow.sessionId);
    } catch {
      set({ isBusy: false, error: flowCopy("暂时无法继续这次咨询，请重试。", "This session could not be continued. Please try again.") });
      return;
    }
    const current = get().flow;
    if (!current || current.sessionId !== flow.sessionId) return;
    if (!result.ok) {
      set({ isBusy: false, error: result.message });
      return;
    }
    const next: ConsultationFlowState = { ...current, surface: { kind: "session" }, closingCycle: undefined };
    persist(next);
    set({ flow: next, isBusy: false, error: undefined });
  },
  clearError: () => set({ error: undefined }),
  leaveForLobby: () => {
    if (clearActiveConsultationFlow() === "still-present") {
      set({ error: flowCopy("没有保存这次离开操作。会谈仍保持当前状态，请重试。", "Leaving the session was not saved. The session remains in its current state. Please try again."), isBusy: false });
      return;
    }
    set({ flow: null, error: undefined, isBusy: false });
    useAppStore.getState().setActivePage("lobby");
  },
  setFlow: (flow) => {
    persist(flow);
    set({ flow, error: undefined, isBusy: false });
  }
}));

function createOperationId(prefix: string) {
  const value = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${value}`;
}

export function resetConsultationFlowStore() {
  clearActiveConsultationFlow();
  useConsultationFlowStore.setState({ error: undefined, flow: null, isBusy: false });
}
