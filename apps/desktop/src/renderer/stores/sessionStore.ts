import { create } from "zustand";
import {
  defaultCounselors,
  defaultRoomThemes,
  getDefaultCounselors,
  type CounselingSession,
  type CounselingStreamEvent,
  type CounselingStreamRequest,
  type ConsultationPreparation,
  type ImportedDocument,
  type ModelImageInput,
  type SessionLetter,
  type SessionMessage,
  type UserSettings
} from "@shared/index";
import { useSettingsStore } from "./settingsStore";
import { cancelDevCounselingStream, streamDevCounselingMessage } from "./devCounselingStream";
import { compareEndedSessionsNewestFirst } from "../flows/consultation/sessionLifecycleOrdering";
import {
  buildDefaultSessionTitle,
  buildSessionListMetadata,
  formatSessionTime,
  metadataFromCounselingSession,
  metadataFromPrototypeSession,
  normalizeListText,
  nowLabel,
  previewFromMessages,
  toPrototypeSession
} from "./session/presentation";
import {
  buildBoundedContext,
  buildMessageMetadata,
  buildUserAuthoredMessageContent,
  buildUserMessagePreview,
  normalizeMessageContentForTransport,
  upsertMessages
} from "./session/messageUtils";
import type { MessageAttachmentReference, PrototypeSession } from "./session/types";
import { translate } from "../localization";

export type { MessageAttachmentReference, PrototypeSession } from "./session/types";

export type CounselorStatus = "idle" | "listening" | "connecting" | "thinking" | "streaming" | "error";

interface SessionState {
  currentCounselorId: string;
  currentTeamId: string;
  currentRoomThemeId: string;
  currentModelName: string;
  activeSessionId: string;
  activeStreamRequestId?: string;
  activeStreamSessionId?: string;
  bookedCounselorId?: string;
  counselorStatus: CounselorStatus;
  sessions: PrototypeSession[];
  sessionLettersBySessionId: Record<string, SessionLetter | undefined>;
  consultationPreparationsBySessionId: Record<string, ConsultationPreparation | undefined>;
  newSessionError?: string;
  hasLoadedPersistedSessions: boolean;
  sessionsLoadState: "idle" | "loading" | "ready" | "error";
  sessionsLoadError?: string;
  searchQuery: string;
  expandedHistoryCounselorId?: string;
  isSidebarCollapsed: boolean;
  bookCounselor: (id: string) => void;
  openBookedCounselorSession: () => Promise<void>;
  setTeam: (id: string) => void;
  setRoomTheme: (id: string) => void;
  applyUserSettings: (settings: UserSettings) => void;
  setSearchQuery: (query: string) => void;
  toggleHistoryForCounselor: (counselorId: string) => void;
  setActiveSession: (id: string) => void;
  createSession: (options?: CreateSessionOptions) => Promise<boolean>;
  createDraftSession: (options?: CreateSessionOptions) => Promise<CreateDraftSessionResult>;
  activateDraftSession: (id: string) => Promise<SessionCommandResult>;
  deleteDraftSession: (id: string) => Promise<SessionCommandResult>;
  renameSession: (id: string, title: string) => Promise<SessionCommandResult>;
  deleteSession: (id: string) => Promise<SessionCommandResult>;
  endSession: (id: string) => Promise<EndSessionResult>;
  resumeSession: (id: string) => Promise<SessionCommandResult>;
  loadConsultationPreparation: (id: string) => Promise<void>;
  retryConsultationPreparation: (id: string) => Promise<void>;
  loadSessionLetter: (id: string) => Promise<SessionLetterReadResult>;
  regenerateSessionLetter: (id: string) => Promise<void>;
  refreshSessionFromDesktop: (id: string) => Promise<void>;
  readSessionStatus: (id: string) => Promise<SessionStatusReadResult>;
  loadPersistedSessions: (preferredSessionId?: string) => Promise<SessionCommandResult>;
  loadMessagesForSession: (id: string) => Promise<boolean>;
  getCounselorVisitCount: (counselorId: string) => Promise<number>;
  hasMetCounselor: (counselorId: string) => Promise<boolean>;
  toggleSidebar: () => void;
  sendPrototypeMessage: (content: string, options?: SendPrototypeMessageOptions) => boolean;
  retryMessage: (messageId: string) => void;
  cancelStreamingResponse: () => void;
}


interface CreateSessionOptions {
  counselorId?: string;
  reportErrorInStore?: boolean;
  replaceUnfinishedSessionId?: string;
}

export type SessionCommandResult = { ok: true } | { ok: false; message: string };
export type CreateDraftSessionResult =
  | { ok: true; sessionId: string }
  | { ok: false; message: string };
export type EndSessionResult =
  | { ok: true; state: "ended"; endedAt: string }
  | { ok: true; state: "discarded" }
  | { ok: false; state: "active" | "missing" | "unknown"; message: string };
export type SessionLetterReadResult =
  | { ok: true; availability: "ready" | "pending" | "failed"; letter: SessionLetter | null }
  | { ok: false; message: string };
export type SessionStatusReadResult =
  | { ok: true; status: CounselingSession["status"]; endedAt?: string }
  | { ok: false; state: "missing" | "unknown"; message: string };

export interface SendPrototypeMessageOptions {
  importedDocuments?: ImportedDocument[];
  attachments?: MessageAttachmentReference[];
  imageInputs?: ModelImageInput[];
}

const initialSessions: PrototypeSession[] = [];
let pendingDraftCreation: { counselorId: string; promise: Promise<CreateDraftSessionResult> } | null = null;
let pendingPersistedSessionsLoad: Promise<SessionCommandResult> | null = null;
const pendingMessageLoads = new Map<string, Promise<boolean>>();
const pendingStreamStarts = new Map<string, {
  assistantMessage: SessionMessage;
  preflightPromise: Promise<void>;
  sessionId: string;
  userMessage: SessionMessage;
}>();
const pendingStreamCancellations = new Set<string>();
const pendingStreamSettlements = new Set<string>();
const transientImageInputsByMessageId = new Map<string, ModelImageInput[]>();
let activeStreamPollTimer: number | null = null;
let activeStreamPollPromise: Promise<void> | null = null;

export const useSessionStore = create<SessionState>((set, get) => ({
  currentCounselorId: defaultCounselors[0].id,
  currentTeamId: "one-way-mirror",
  currentRoomThemeId: defaultRoomThemes[0].id,
  currentModelName: localize("尚未配置模型", "Model not configured"),
  activeSessionId: "",
  activeStreamRequestId: undefined,
  activeStreamSessionId: undefined,
  bookedCounselorId: undefined,
  counselorStatus: "idle",
  sessions: initialSessions,
  sessionLettersBySessionId: {},
  consultationPreparationsBySessionId: {},
  newSessionError: undefined,
  hasLoadedPersistedSessions: false,
  sessionsLoadState: "idle",
  sessionsLoadError: undefined,
  searchQuery: "",
  expandedHistoryCounselorId: undefined,
  isSidebarCollapsed: true,
  bookCounselor: (id) => set({ bookedCounselorId: id }),
  openBookedCounselorSession: async () => {
    const bookedCounselorId = get().bookedCounselorId;
    if (!bookedCounselorId) return;
    const activeSession = get().sessions.find((session) => session.id === get().activeSessionId);
    if (activeSession?.counselorId === bookedCounselorId) {
      set({ bookedCounselorId: undefined });
      return;
    }
    await get().createSession({ counselorId: bookedCounselorId });
    set({ bookedCounselorId: undefined });
  },
  setTeam: (id) => set({ currentTeamId: id }),
  setRoomTheme: (id) => set({ currentRoomThemeId: id }),
  applyUserSettings: (settings) => {
    if (get().hasLoadedPersistedSessions) return;
    set({
      currentCounselorId: settings.defaultCounselorId,
      currentRoomThemeId: settings.defaultRoomThemeId,
      currentModelName: settings.api.modelName
    });
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleHistoryForCounselor: (counselorId) => set((state) => ({
    expandedHistoryCounselorId: state.expandedHistoryCounselorId === counselorId ? undefined : counselorId,
    searchQuery: state.expandedHistoryCounselorId === counselorId ? "" : state.searchQuery
  })),
  setActiveSession: (id) => {
    const session = get().sessions.find((item) => item.id === id);
    set({
      activeSessionId: id,
      counselorStatus: get().activeStreamRequestId ? get().counselorStatus : "idle",
      ...(session ? metadataFromPrototypeSession(session) : {})
    });
    if (session?.messagesLoaded === false) void get().loadMessagesForSession(id);
    if (session?.status === "ended") void get().loadSessionLetter(id);
  },
  createSession: async (options = {}) => {
    const locale = useSettingsStore.getState().locale;
    const id = `session-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const counselorId = options.counselorId ?? get().currentCounselorId;
    const session: PrototypeSession = {
      id,
      title: buildDefaultSessionTitle({
        counselorId,
        createdAt,
        sessions: get().sessions,
        locale
      }),
      time: localize("刚刚", "Just now"),
      preview: localize("可以从此刻最想说的地方开始。", "Begin with whatever feels most important right now."),
      counselorId,
      roomThemeId: get().currentRoomThemeId,
      teamId: get().currentTeamId,
      modelName: useSettingsStore.getState().api.modelName,
      status: "active",
      createdAt,
      startedAt: createdAt,
      updatedAt: createdAt,
      messages: [
        {
          id: `${id}-welcome`,
          sessionId: id,
          role: "assistant",
          content: localize("我在这里。你可以慢慢说。", "I'm here. Take your time."),
          createdAt,
          status: "sent"
        }
      ]
    };
    set({ newSessionError: undefined });
    if (typeof window.lingDesktop?.sessions?.create === "function") {
      const persistedSession = toCounselingSession(session, get());
      const result = await window.lingDesktop.sessions.create(persistedSession);
      if (!result.ok) {
        set({ newSessionError: result.error.message });
        return false;
      }
    }
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: id,
      ...metadataFromPrototypeSession(session),
      counselorStatus: "idle",
      searchQuery: "",
      newSessionError: undefined
    }));
    if (typeof window.lingDesktop?.messages?.append === "function") {
      void window.lingDesktop.messages.append(session.messages[0]);
    }
    return true;
  },
  createDraftSession: (options = {}) => {
    const locale = useSettingsStore.getState().locale;
    const counselorId = options.counselorId ?? get().currentCounselorId;
    if (pendingDraftCreation) {
      return pendingDraftCreation.counselorId === counselorId
        ? pendingDraftCreation.promise
        : Promise.resolve({ ok: false, message: localize("另一场咨询正在创建，请稍后重试。", "Another session is being created. Please try again shortly.") });
    }
    const promise = (async (): Promise<CreateDraftSessionResult> => {
      const reportCreationError = (message: string) => {
        if (options.reportErrorInStore !== false) set({ newSessionError: message });
      };
      const id = createSessionId();
      const createdAt = new Date().toISOString();
      const session: PrototypeSession = {
        id,
        title: buildDefaultSessionTitle({ counselorId, createdAt, sessions: get().sessions, locale }),
        time: localize("刚刚", "Just now"),
        preview: localize("尚未开始", "Not started"),
        counselorId,
        roomThemeId: get().currentRoomThemeId,
        teamId: get().currentTeamId,
        modelName: useSettingsStore.getState().api.modelName,
        status: "draft",
        createdAt,
        startedAt: createdAt,
        updatedAt: createdAt,
        messages: [],
        messagesLoaded: true
      };
      set({ newSessionError: undefined });
      try {
        if (typeof window.lingDesktop?.sessions?.create === "function") {
          const persistedSession = toCounselingSession(session, get());
          const result = options.replaceUnfinishedSessionId
            ? await window.lingDesktop.sessions.create(persistedSession, {
                replaceUnfinishedSessionId: options.replaceUnfinishedSessionId
              })
            : await window.lingDesktop.sessions.create(persistedSession);
          if (!result.ok) {
            const readback = typeof window.lingDesktop.sessions.get === "function"
              ? await window.lingDesktop.sessions.get(id)
              : undefined;
            if (!readback?.ok || !readback.data || readback.data.status !== "draft") {
              reportCreationError(result.error.message);
              return { ok: false, message: result.error.message };
            }
          }
        }
      } catch (error) {
        try {
          const readback = typeof window.lingDesktop?.sessions?.get === "function"
            ? await window.lingDesktop.sessions.get(id)
            : undefined;
          if (!readback?.ok || !readback.data || readback.data.status !== "draft") {
            const message = commandErrorMessage(error, translate(locale, "booking.createError"));
            reportCreationError(message);
            return { ok: false, message };
          }
        } catch {
          const message = commandErrorMessage(error, translate(locale, "booking.createError"));
          reportCreationError(message);
          return { ok: false, message };
        }
      }
      let replacedSessionReconciled = false;
      if (options.replaceUnfinishedSessionId && typeof window.lingDesktop?.sessions?.get === "function") {
        try {
          const replaced = await window.lingDesktop.sessions.get(options.replaceUnfinishedSessionId);
          if (replaced.ok && replaced.data?.status === "ended") {
            applyPersistedSession(replaced.data);
            replacedSessionReconciled = true;
            void get().loadSessionLetter(options.replaceUnfinishedSessionId);
            void get().loadConsultationPreparation(options.replaceUnfinishedSessionId);
          }
        } catch {
          // The new draft is authoritative; the session list will reconcile the old
          // record on the next persisted reload if this best-effort readback fails.
        }
      }
      if (options.replaceUnfinishedSessionId && !replacedSessionReconciled) {
        const replaced = get().sessions.find((item) => item.id === options.replaceUnfinishedSessionId);
        if (replaced?.status === "active") {
          applyLocalEndedState(replaced, new Date().toISOString());
        }
      }
      set((state) => ({
        sessions: state.sessions.some((item) => item.id === id) ? state.sessions : [session, ...state.sessions],
        activeSessionId: id,
        ...metadataFromPrototypeSession(session),
        counselorStatus: "idle",
        searchQuery: "",
        newSessionError: undefined
      }));
      return { ok: true, sessionId: id };
    })();
    pendingDraftCreation = { counselorId, promise };
    void promise.then(
      () => {
        if (pendingDraftCreation?.promise === promise) pendingDraftCreation = null;
      },
      () => {
        if (pendingDraftCreation?.promise === promise) pendingDraftCreation = null;
      }
    );
    return promise;
  },
  activateDraftSession: async (id) => {
    const session = get().sessions.find((item) => item.id === id);
    if (!session || session.status !== "draft") return { ok: false, message: localize("这次咨询的状态已经改变，请重新进入后再试。", "This session's status has changed. Re-enter it and try again.") };
    const startedAt = new Date().toISOString();
    try {
      if (typeof window.lingDesktop?.sessions?.activateDraft === "function") {
        const result = await window.lingDesktop.sessions.activateDraft(id);
        const readback = typeof window.lingDesktop.sessions.get === "function"
          ? await window.lingDesktop.sessions.get(id)
          : undefined;
        if (readback?.ok && readback.data?.status === "active") {
          applyPersistedSession(readback.data);
          return { ok: true };
        }
        if (!result.ok) return { ok: false, message: result.error.message };
      } else if (window.lingDesktop?.sessions) {
        return { ok: false, message: localize("当前版本无法开始咨询。请更新 Ling 后重试。", "This version of Ling cannot begin the session. Update Ling and try again.") };
      }
    } catch (error) {
      try {
        const readback = typeof window.lingDesktop?.sessions?.get === "function"
          ? await window.lingDesktop.sessions.get(id)
          : undefined;
        if (readback?.ok && readback.data?.status === "active") {
          applyPersistedSession(readback.data);
          return { ok: true };
        }
      } catch {
        // The command result remains unknown and is reported below.
      }
      return { ok: false, message: commandErrorMessage(error, localize("没有开始这次咨询。请确认模型配置后重试；如果仍失败，可以返回等待室。", "The session did not begin. Check the model connection and try again; if it still fails, return to the waiting room.")) };
    }
    set((state) => ({
      sessions: state.sessions.map((item) =>
        item.id === id ? { ...item, status: "active", startedAt, updatedAt: startedAt, time: nowLabel } : item
      )
    }));
    return { ok: true };
  },
  deleteDraftSession: async (id) => {
    const session = get().sessions.find((item) => item.id === id);
    if (!session || session.status !== "draft") return { ok: false, message: localize("这次咨询已经开始，不能作为未开始记录取消。你可以返回咨询室继续，或结束咨询。", "This session has already begun and cannot be canceled as a draft. Return to the room to continue, or end the session.") };
    try {
      if (typeof window.lingDesktop?.sessions?.cancelDraft === "function") {
        const result = await window.lingDesktop.sessions.cancelDraft(id);
        if (!result.ok && result.error.code !== "NOT_FOUND") return { ok: false, message: result.error.message };
      } else if (typeof window.lingDesktop?.sessions?.delete === "function") {
        const result = await window.lingDesktop.sessions.delete(id);
        if (!result.ok && result.error.code !== "NOT_FOUND") return { ok: false, message: result.error.message };
      }
    } catch (error) {
      try {
        const readback = typeof window.lingDesktop?.sessions?.get === "function"
          ? await window.lingDesktop.sessions.get(id)
          : undefined;
        if (readback?.ok && readback.data) {
          return { ok: false, message: commandErrorMessage(error, localize("暂时无法确认这次咨询是否已取消。请重新读取状态，不要重复创建。", "Ling cannot confirm whether the session was canceled. Reload its status and do not create a duplicate.")) };
        }
        if (readback && ((!readback.ok && readback.error.code === "NOT_FOUND") || (readback.ok && !readback.data))) {
          removeSessionLocally(id);
          return { ok: true };
        }
      } catch {
        // NOT_FOUND/rejected readback is treated as an unknown result below.
      }
      return { ok: false, message: commandErrorMessage(error, localize("暂时无法确认这次咨询是否已取消。请重新读取状态，不要重复创建。", "Ling cannot confirm whether the session was canceled. Reload its status and do not create a duplicate.")) };
    }
    removeSessionLocally(id);
    return { ok: true };
  },
  renameSession: async (id, title) => {
    const nextTitle = title.trim();
    if (!nextTitle) return { ok: false, message: localize("会谈名称不能为空。", "The session title cannot be empty.") };
    if (!get().sessions.some((session) => session.id === id)) {
      return { ok: false, message: localize("没有找到这场会谈，请重新读取记录后再试。", "This session was not found. Reload the records and try again.") };
    }
    const updatedAt = new Date().toISOString();
    if (typeof window.lingDesktop?.sessions?.update === "function") {
      try {
        const result = await window.lingDesktop.sessions.update(id, { title: nextTitle, updatedAt });
        if (!result.ok) {
          set({ newSessionError: result.error.message });
          return { ok: false, message: result.error.message };
        }
      } catch (error) {
        const message = commandErrorMessage(error, localize("没有保存新的会谈名称，现有名称保持不变。请重试。", "The new session title was not saved. The existing title is unchanged. Please try again."));
        set({ newSessionError: message });
        return { ok: false, message };
      }
    }
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              title: nextTitle,
              time: nowLabel,
              updatedAt
            }
          : session
      ),
      newSessionError: undefined
    }));
    return { ok: true };
  },
  deleteSession: async (id) => {
    const state = get();
    if (state.activeStreamSessionId === id) return { ok: false, message: localize("这场会谈正在生成回应。请先停止生成，再删除。", "A response is being generated in this session. Stop it before deleting the session.") };
    if (state.activeSessionId === id) return { ok: false, message: localize("当前进行中的会谈不能直接删除。请先结束咨询，再切换到其他会谈后删除。", "The active session cannot be deleted directly. End it, switch to another session, then delete it.") };
    if (!state.sessions.some((session) => session.id === id)) return { ok: false, message: localize("没有找到这场会谈，可能已被删除。请重新读取会谈列表。", "This session was not found and may already have been deleted. Reload the session list.") };
    try {
      if (typeof window.lingDesktop?.sessions?.delete === "function") {
        const result = await window.lingDesktop.sessions.delete(id);
        if (!result.ok && result.error.code !== "NOT_FOUND") {
          set({ newSessionError: result.error.message });
          return { ok: false, message: result.error.message };
        }
      }
    } catch (error) {
      const message = commandErrorMessage(error, localize("没有删除这场会谈，现有记录保持不变。请重试。", "The session was not deleted and the existing record is unchanged. Please try again."));
      set({ newSessionError: message });
      return { ok: false, message };
    }
    const deletedActiveSession = get().activeSessionId === id;
    removeSessionLocally(id);
    const nextActiveSessionId = get().activeSessionId;
    if (deletedActiveSession && nextActiveSessionId) {
      void get().loadMessagesForSession(nextActiveSessionId);
    }
    return { ok: true };
  },
  endSession: async (id) => {
    const state = get();
    if (state.activeStreamSessionId === id) {
      return { ok: false, state: "active", message: localize("正在生成回应。请先停止生成，再结束咨询。", "A response is being generated. Stop it before ending the session.") };
    }
    const targetSession = state.sessions.find((session) => session.id === id);
    if (!targetSession) return { ok: false, state: "missing", message: localize("没有找到这场咨询，可能已被删除。请返回等待室。", "This session was not found and may have been deleted. Return to the waiting room.") };
    if (targetSession.status === "ended") {
      return { ok: true, state: "ended", endedAt: targetSession.endedAt ?? targetSession.updatedAt ?? new Date().toISOString() };
    }
    if (targetSession.status !== "active") {
      return { ok: false, state: "active", message: localize("这次咨询还没有正式开始。你可以取消并返回等待室。", "This session has not formally begun. You can cancel it and return to the waiting room.") };
    }
    const isEmptySession = !targetSession.messages.some((message) => message.role === "user");

    if (typeof window.lingDesktop?.sessions?.end === "function") {
      let commandFailure: string | undefined;
      let commandResultUnknown = false;
      try {
        const result = await window.lingDesktop.sessions.end(id);
        if (!result.ok) commandFailure = result.error.message;
      } catch (error) {
        commandResultUnknown = true;
        commandFailure = commandErrorMessage(error, localize("暂时无法确认咨询是否已经结束。请先不要重复操作，重新读取状态。", "Ling cannot confirm whether the session ended. Do not repeat the action; reload its status."));
      }
      if (typeof window.lingDesktop.sessions.get === "function") {
        try {
          const readback = await window.lingDesktop.sessions.get(id);
          if (!readback.ok) {
            if (isEmptySession && readback.error.code === "NOT_FOUND") {
              removeSessionLocally(id);
              return { ok: true, state: "discarded" };
            }
            return readback.error.code === "NOT_FOUND"
              ? { ok: false, state: "missing", message: localize("没有找到这场咨询，可能已被删除。请返回等待室。", "This session was not found and may have been deleted. Return to the waiting room.") }
              : { ok: false, state: "unknown", message: localize("暂时无法确认咨询是否已经结束，请重新检查状态。", "Ling cannot confirm whether the session ended. Check its status again.") };
          }
          if (!readback.data) {
            if (isEmptySession) {
              removeSessionLocally(id);
              return { ok: true, state: "discarded" };
            }
            return { ok: false, state: "missing", message: localize("没有找到这场咨询，可能已被删除。请返回等待室。", "This session was not found and may have been deleted. Return to the waiting room.") };
          }
          if (readback.data.status !== "ended") {
            return {
              ok: false,
              state: commandResultUnknown ? "unknown" : "active",
              message: commandFailure ?? localize("咨询仍未结束，请重试。", "The session has not ended. Please try again.")
            };
          }
          const endedAt = readback.data.endedAt ?? readback.data.updatedAt ?? new Date().toISOString();
          applyPersistedSession(readback.data);
          void get().loadSessionLetter(id);
          void get().loadConsultationPreparation(id);
          return { ok: true, state: "ended", endedAt };
        } catch {
          return { ok: false, state: "unknown", message: localize("暂时无法确认咨询是否已经结束，请重新检查状态。", "Ling cannot confirm whether the session ended. Check its status again.") };
        }
      }
      if (commandFailure) {
        return {
          ok: false,
          state: commandResultUnknown ? "unknown" : "active",
          message: commandFailure
        };
      }
      if (isEmptySession) {
        removeSessionLocally(id);
        return { ok: true, state: "discarded" };
      }
      const endedAt = new Date().toISOString();
      applyLocalEndedState(targetSession, endedAt);
      return { ok: true, state: "ended", endedAt };
    }

    const endedAt = new Date().toISOString();
    if (window.lingDesktop?.sessions) {
      return { ok: false, state: "active", message: localize("当前版本无法可靠保存结束状态。请更新 Ling 后再结束；在此之前不要删除会谈。", "This version of Ling cannot reliably save the ended state. Update Ling before ending the session, and do not delete it in the meantime.") };
    }

    applyLocalEndedState(targetSession, endedAt);
    schedulePreviewSessionLetter(targetSession, endedAt);
    return { ok: true, state: "ended", endedAt };
  },
  resumeSession: async (id) => {
    const state = get();
    const targetSession = state.sessions.find((session) => session.id === id);
    if (!targetSession) return { ok: false, message: localize("没有找到这场咨询，可能已被删除。请返回等待室。", "This session was not found and may have been deleted. Return to the waiting room.") };
    if (targetSession.status !== "ended") return { ok: false, message: localize("这场咨询仍在进行，无需重新继续。", "This session is still in progress and does not need to be reopened.") };
    const latestEndedForCounselor = state.sessions
      .filter((session) => session.counselorId === targetSession.counselorId && session.status === "ended")
      .sort(compareEndedSessionsNewestFirst)[0];
    if (latestEndedForCounselor?.id !== id) {
      return { ok: false, message: localize("只能继续与这位咨询师最近结束的会谈；更早的会谈仍可只读回看。", "Only the most recently ended session with this counselor can be continued. Earlier sessions remain available as read-only records.") };
    }
    const otherUnfinished = state.sessions.find(
      (session) =>
        session.id !== id &&
        session.counselorId === targetSession.counselorId &&
        (session.status === "active" || session.status === "draft")
    );
    if (otherUnfinished) {
      return { ok: false, message: localize("这位咨询师还有一次尚未完成的咨询，请先继续或结束它。", "There is another unfinished session with this counselor. Continue or end it first.") };
    }
    const updatedAt = new Date().toISOString();

    if (typeof window.lingDesktop?.sessions?.resume === "function") {
      let commandFailure: string | undefined;
      try {
        const result = await window.lingDesktop.sessions.resume(id);
        if (!result.ok) commandFailure = result.error.message;
      } catch (error) {
        commandFailure = commandErrorMessage(error, localize("没有重新打开这场咨询。现有会谈仍保持结束状态，请重试。", "The session was not reopened and remains ended. Please try again."));
      }
      if (typeof window.lingDesktop.sessions.get === "function") {
        try {
          const readback = await window.lingDesktop.sessions.get(id);
          if (readback.ok && readback.data?.status === "active") {
            applyPersistedSession(readback.data);
            removeSessionLetterFromState(id);
            return { ok: true };
          }
        } catch {
          // The command failure below remains the best available result.
        }
      }
      if (commandFailure) return { ok: false, message: commandFailure };
      applyLocalActiveState(id, updatedAt);
      return { ok: true };
    }

    if (window.lingDesktop?.sessions) {
      return { ok: false, message: localize("当前版本无法可靠恢复这场咨询。请更新 Ling 后重试。", "This version of Ling cannot reliably reopen the session. Update Ling and try again.") };
    }
    applyLocalActiveState(id, updatedAt);
    return { ok: true };
  },
  loadConsultationPreparation: async (id) => {
    if (typeof window.lingDesktop?.consultationPreparations?.getBySessionId !== "function") return;
    let result;
    try {
      result = await window.lingDesktop.consultationPreparations.getBySessionId(id);
    } catch {
      return;
    }
    if (!result.ok) return;
    set((state) => ({
      consultationPreparationsBySessionId: {
        ...state.consultationPreparationsBySessionId,
        [id]: result.data ?? undefined
      }
    }));
  },
  retryConsultationPreparation: async (id) => {
    if (!window.lingDesktop?.consultationPreparations) return;
    let result;
    try {
      result = await window.lingDesktop.consultationPreparations.retry(id);
    } catch {
      return;
    }
    if (!result.ok) return;
    set((state) => ({
      consultationPreparationsBySessionId: {
        ...state.consultationPreparationsBySessionId,
        [id]: result.data
      }
    }));
  },
  loadSessionLetter: async (id) => {
    if (typeof window.lingDesktop?.sessionLetters?.getBySessionId !== "function") {
      return resolveLetterAvailability(
        get().sessionLettersBySessionId[id] ?? null,
        get().consultationPreparationsBySessionId[id]
      );
    }
    let result;
    let preparationResult;
    try {
      [result, preparationResult] = await Promise.all([
        window.lingDesktop.sessionLetters.getBySessionId(id),
        typeof window.lingDesktop.consultationPreparations?.getBySessionId === "function"
          ? window.lingDesktop.consultationPreparations.getBySessionId(id)
          : undefined
      ]);
    } catch {
      return { ok: false, message: localize("暂时无法确认咨询师来信的状态，请稍后再试。", "Ling cannot confirm the counselor letter's status right now. Please try again later.") };
    }
    if (!result.ok || (preparationResult && !preparationResult.ok)) {
      return { ok: false, message: localize("暂时无法确认咨询师来信的状态，请稍后再试。", "Ling cannot confirm the counselor letter's status right now. Please try again later.") };
    }
    set((state) => {
      const nextLetters = { ...state.sessionLettersBySessionId };
      if (result.data) {
        nextLetters[id] = result.data;
      } else {
        delete nextLetters[id];
      }
      return {
        sessionLettersBySessionId: nextLetters,
        consultationPreparationsBySessionId:
          preparationResult?.ok && preparationResult.data
            ? { ...state.consultationPreparationsBySessionId, [id]: preparationResult.data }
            : state.consultationPreparationsBySessionId
      };
    });
    return resolveLetterAvailability(result.data, preparationResult?.ok ? preparationResult.data ?? undefined : undefined);
  },
  regenerateSessionLetter: async (id) => {
    const session = get().sessions.find((item) => item.id === id);
    if (!session) return;
    const now = new Date().toISOString();
    set((state) => ({
      sessionLettersBySessionId: {
        ...state.sessionLettersBySessionId,
        [id]: createPendingSessionLetter(session, now)
      }
    }));
    if (!window.lingDesktop?.sessionLetters) return;
    let result;
    try {
      result = await window.lingDesktop.sessionLetters.regenerate(id);
    } catch (error) {
      set((state) => ({
        sessionLettersBySessionId: {
          ...state.sessionLettersBySessionId,
          [id]: {
            ...createPendingSessionLetter(session, now),
            status: "failed",
            updatedAt: new Date().toISOString(),
            errorMessage: commandErrorMessage(error, localize("暂时无法重新生成这封信，请稍后再试。", "This letter cannot be regenerated right now. Please try again later."))
          }
        }
      }));
      return;
    }
    if (!result.ok) {
      set((state) => ({
        sessionLettersBySessionId: {
          ...state.sessionLettersBySessionId,
          [id]: {
            ...createPendingSessionLetter(session, now),
            status: "failed",
            updatedAt: new Date().toISOString(),
            errorMessage: result.error.message
          }
        }
      }));
      return;
    }
    if (result.data) {
      set((state) => ({
        sessionLettersBySessionId: {
          ...state.sessionLettersBySessionId,
          [id]: result.data ?? undefined
        }
      }));
    }
  },
  refreshSessionFromDesktop: async (id) => {
    if (typeof window.lingDesktop?.sessions?.get !== "function") return;
    let result;
    try {
      result = await window.lingDesktop.sessions.get(id);
    } catch {
      return;
    }
    if (!result.ok || !result.data) return;
    const persisted = result.data;
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              title: persisted.title,
              preview: persisted.summary ? normalizeListText(persisted.summary) : session.preview,
              time: formatSessionTime(persisted.updatedAt ?? persisted.startedAt ?? persisted.createdAt),
              counselorId: persisted.counselorId,
              roomThemeId: persisted.roomThemeId,
              teamId: persisted.teamId,
              modelName: persisted.modelName,
              promptSnapshot: persisted.promptSnapshot,
              status: persisted.status,
              endedAt: persisted.endedAt,
              updatedAt: persisted.updatedAt
            }
          : session
      ),
      ...(state.activeSessionId === id ? metadataFromCounselingSession(persisted) : {})
    }));
  },
  readSessionStatus: async (id) => {
    if (typeof window.lingDesktop?.sessions?.get !== "function") {
      const session = get().sessions.find((item) => item.id === id);
      return session
        ? { ok: true, status: session.status, endedAt: session.endedAt }
        : { ok: false, state: "missing", message: localize("没有找到这次咨询。", "This session was not found.") };
    }
    let result;
    try {
      result = await window.lingDesktop.sessions.get(id);
    } catch {
      return { ok: false, state: "unknown", message: localize("暂时无法确认这场咨询的状态。请重新读取后再操作。", "Ling cannot confirm this session's status. Reload it before taking another action.") };
    }
    if (!result.ok) {
      return result.error.code === "NOT_FOUND"
        ? { ok: false, state: "missing", message: result.error.message }
        : { ok: false, state: "unknown", message: localize("暂时无法确认这场咨询的状态。请重新读取后再操作。", "Ling cannot confirm this session's status. Reload it before taking another action.") };
    }
    if (!result.data) return { ok: false, state: "missing", message: localize("没有找到这次咨询。", "This session was not found.") };
    applyPersistedSession(result.data);
    return { ok: true, status: result.data.status, endedAt: result.data.endedAt };
  },
  loadPersistedSessions: (preferredSessionId) => {
    if (
      typeof window.lingDesktop?.sessions?.list !== "function" ||
      typeof window.lingDesktop?.messages?.listBySessionId !== "function"
    ) {
      set({ hasLoadedPersistedSessions: true, sessionsLoadState: "ready", sessionsLoadError: undefined });
      return Promise.resolve({ ok: true });
    }
    if (get().sessionsLoadState === "ready") return Promise.resolve({ ok: true });
    if (pendingPersistedSessionsLoad) return pendingPersistedSessionsLoad;
    set({ sessionsLoadState: "loading", sessionsLoadError: undefined });
    const loadPromise = (async (): Promise<SessionCommandResult> => {
      try {
        const result = await window.lingDesktop.sessions.list();
        if (!result.ok) {
          set({ sessionsLoadState: "error", sessionsLoadError: result.error.message });
          return { ok: false, message: result.error.message };
        }
        if (result.data.length === 0) {
          set({
            sessions: [],
            activeSessionId: "",
            hasLoadedPersistedSessions: true,
            sessionsLoadState: "ready",
            sessionsLoadError: undefined
          });
          return { ok: true };
        }
        const requestedSessionId = preferredSessionId ?? get().activeSessionId;
        const activeSessionId = result.data.some((session) => session.id === requestedSessionId)
          ? requestedSessionId
          : result.data[0].id;
        const activePersistedSession = result.data.find((session) => session.id === activeSessionId) ?? result.data[0];
        const messagesResult = await window.lingDesktop.messages.listBySessionId(activeSessionId);
        if (!messagesResult.ok) {
          set({ sessionsLoadState: "error", sessionsLoadError: messagesResult.error.message });
          return { ok: false, message: messagesResult.error.message };
        }
        const letterResult = typeof window.lingDesktop.sessionLetters?.getBySessionId === "function"
          ? await window.lingDesktop.sessionLetters.getBySessionId(activeSessionId)
          : undefined;
        const activeLetter = letterResult?.ok ? letterResult.data : null;
        set({
          activeSessionId,
          ...metadataFromCounselingSession(activePersistedSession),
          hasLoadedPersistedSessions: false,
          sessionsLoadState: "loading",
          sessions: result.data.map((session) =>
            toPrototypeSession(
              session,
              session.id === activeSessionId ? messagesResult.data : [],
              session.id === activeSessionId
            )
          ),
          sessionLettersBySessionId: activeLetter ? { [activeSessionId]: activeLetter } : {}
        });
        const streamRestore = await restoreActiveCounselingStream(activeSessionId);
        if (!streamRestore.ok) {
          set({ sessionsLoadState: "error", sessionsLoadError: streamRestore.message });
          return streamRestore;
        }
        set({ hasLoadedPersistedSessions: true, sessionsLoadState: "ready", sessionsLoadError: undefined });
        return { ok: true };
      } catch (error) {
        const message = commandErrorMessage(error, localize("没有成功读取本机会谈。现有资料没有被修改，请重新读取。", "Ling could not read the sessions on this device. Existing information was not changed. Please try again."));
        set({ sessionsLoadState: "error", sessionsLoadError: message });
        return { ok: false, message };
      }
    })();
    pendingPersistedSessionsLoad = loadPromise;
    void loadPromise.then(
      () => {
        if (pendingPersistedSessionsLoad === loadPromise) pendingPersistedSessionsLoad = null;
      },
      () => {
        if (pendingPersistedSessionsLoad === loadPromise) pendingPersistedSessionsLoad = null;
      }
    );
    return loadPromise;
  },
  loadMessagesForSession: (id) => {
    if (typeof window.lingDesktop?.messages?.listBySessionId !== "function") return Promise.resolve(true);
    const existingLoad = pendingMessageLoads.get(id);
    if (existingLoad) return existingLoad;
    const loadPromise = (async () => {
      try {
        const result = await window.lingDesktop.messages.listBySessionId(id);
        if (!result.ok) return false;
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id
              ? { ...session, messages: result.data, messagesLoaded: true, preview: previewFromMessages(result.data, session.preview) }
              : session
          )
        }));
        void get().loadSessionLetter(id);
        return true;
      } catch {
        return false;
      }
    })();
    pendingMessageLoads.set(id, loadPromise);
    void loadPromise.then(
      () => {
        if (pendingMessageLoads.get(id) === loadPromise) pendingMessageLoads.delete(id);
      },
      () => {
        if (pendingMessageLoads.get(id) === loadPromise) pendingMessageLoads.delete(id);
      }
    );
    return loadPromise;
  },
  getCounselorVisitCount: async (counselorId) => {
    const candidates = get().sessions.filter(
      (session) => session.counselorId === counselorId && session.status !== "draft"
    );
    let visitCount = candidates.filter((session) =>
      session.messages.some((message) => message.role === "user")
    ).length;
    if (typeof window.lingDesktop?.messages?.listBySessionId !== "function") return visitCount;
    for (const session of candidates.filter(
      (item) => item.messagesLoaded === false && !item.messages.some((message) => message.role === "user")
    )) {
      let result;
      try {
        result = await window.lingDesktop.messages.listBySessionId(session.id);
      } catch {
        // If history cannot be read, avoid replaying a first- or second-visit
        // greeting to someone who may already have an established history.
        return Math.max(visitCount, 2);
      }
      if (!result.ok) return Math.max(visitCount, 2);
      set((state) => ({
        sessions: state.sessions.map((item) =>
          item.id === session.id
            ? { ...item, messages: result.data, messagesLoaded: true, preview: previewFromMessages(result.data, item.preview) }
          : item
        )
      }));
      if (result.data.some((message) => message.role === "user")) visitCount += 1;
    }
    return visitCount;
  },
  hasMetCounselor: async (counselorId) => (await get().getCounselorVisitCount(counselorId)) > 0,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  sendPrototypeMessage: (content, options = {}) => {
    const trimmed = content.trim();
    const manualImportedDocuments = options.importedDocuments ?? [];
    const attachments = options.attachments ?? [];
    const imageInputs = options.imageInputs ?? [];
    if (!trimmed && manualImportedDocuments.length === 0 && attachments.length === 0) return false;
    if (get().activeStreamRequestId) return false;

    const activeSessionId = get().activeSessionId;
    const activeSession = get().sessions.find((session) => session.id === activeSessionId);
    if (!activeSession) return false;
    if (activeSession.status !== "active") return false;
    if (activeSession.messagesLoaded === false) return false;
    const requestId = `stream-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const messagesBeforeSend = activeSession.messages;
    const importedDocuments = manualImportedDocuments;
    const userMessageContent = buildUserAuthoredMessageContent(trimmed, { importedDocuments, attachments });
    const userMessage: SessionMessage = {
      id: `msg-user-${Date.now()}`,
      sessionId: activeSessionId,
      role: "user",
      content: userMessageContent,
      createdAt,
      status: "sent",
      metadata: buildMessageMetadata({
        importedDocuments,
        attachments,
        includeFullText: !window.lingDesktop?.documents
      })
    };
    const assistantMessage: SessionMessage = {
      id: `msg-assistant-${Date.now()}`,
      sessionId: activeSessionId,
      role: "assistant",
      content: "",
      createdAt,
      status: "sending"
    };
    if (imageInputs.length > 0) transientImageInputsByMessageId.set(userMessage.id, imageInputs);
    const locale = useSettingsStore.getState().locale;
    const listMetadata = buildSessionListMetadata(
      activeSession,
      buildUserMessagePreview(userMessageContent, attachments, locale),
      createdAt,
      locale
    );

    set((state) => ({
      counselorStatus: "connecting",
      activeStreamRequestId: requestId,
      activeStreamSessionId: activeSessionId,
      sessions: state.sessions.map((session) =>
        session.id === activeSessionId
          ? { ...session, ...listMetadata, messages: [...session.messages, userMessage, assistantMessage] }
          : session
      )
    }));
    persistSessionListMetadata(activeSessionId, listMetadata);

    startStreamRequest({
      requestId,
      sessionId: activeSessionId,
      userMessage,
      assistantMessage,
      contextMessages: messagesBeforeSend,
      importedDocuments,
      imageInputs,
      failUserOnStartFailure: true
    });
    return true;
  },
  retryMessage: (messageId) => {
    const state = get();
    if (state.activeStreamRequestId) return;
    const session = state.sessions.find((item) => item.id === state.activeSessionId);
    if (!session) return;
    if (session.status !== "active") return;
    const messageIndex = session.messages.findIndex((message) => message.id === messageId);
    const message = session.messages[messageIndex];
    if (!message || message.status !== "failed") return;

    const requestId = `stream-${Date.now()}`;
    const createdAt = new Date().toISOString();
    let userMessage: SessionMessage | undefined;
    let assistantMessage: SessionMessage | undefined;
    let contextMessages: SessionMessage[] = [];
    let failUserOnStartFailure = false;

    if (message.role === "user") {
      userMessage = { ...message, status: "sending" };
      const nextMessage = session.messages[messageIndex + 1];
      assistantMessage =
        nextMessage?.role === "assistant"
          ? { ...nextMessage, content: "", status: "sending" }
          : {
              id: `msg-assistant-${Date.now()}`,
              sessionId: session.id,
              role: "assistant",
              content: "",
              createdAt,
              status: "sending"
            };
      contextMessages = session.messages.slice(0, messageIndex);
      failUserOnStartFailure = true;
    } else if (message.role === "assistant") {
      const previousUser = [...session.messages.slice(0, messageIndex)].reverse().find((item) => item.role === "user");
      if (!previousUser) return;
      userMessage = { ...previousUser, status: "sent" };
      assistantMessage = { ...message, content: "", status: "sending" };
      contextMessages = session.messages.slice(0, messageIndex).filter((item) => item.id !== previousUser.id);
    }

    if (!userMessage || !assistantMessage) return;

    set((current) => ({
      counselorStatus: "connecting",
      activeStreamRequestId: requestId,
      activeStreamSessionId: session.id,
      sessions: current.sessions.map((item) =>
        item.id === session.id
          ? {
              ...item,
              preview: userMessage.content,
              time: nowLabel,
              messages: upsertMessages(item.messages, [userMessage, assistantMessage])
            }
          : item
      )
    }));

    startStreamRequest({
      requestId,
      sessionId: session.id,
      userMessage,
      assistantMessage,
      contextMessages,
      importedDocuments: [],
      imageInputs: transientImageInputsByMessageId.get(userMessage.id) ?? [],
      failUserOnStartFailure
    });
  },
  cancelStreamingResponse: () => {
    const requestId = get().activeStreamRequestId;
    const sessionId = get().activeStreamSessionId;
    if (!requestId) return;
    if (pendingStreamCancellations.has(requestId) || pendingStreamSettlements.has(requestId)) return;
    const pendingStart = pendingStreamStarts.get(requestId);
    if (pendingStart) {
      pendingStreamStarts.delete(requestId);
      pendingStreamCancellations.add(requestId);
      settleCancelledAssistantMessage(pendingStart.sessionId, pendingStart.assistantMessage.id);
      const cancelledMessages = [
        normalizeMessageContentForTransport({ ...pendingStart.userMessage, status: "sent" as const }),
        {
          ...pendingStart.assistantMessage,
          content: localize("已停止，可重试。", "Stopped. You can try again."),
          status: "failed" as const
        }
      ];
      void pendingStart.preflightPromise
        .then(() => persistMessageBatchForActiveSession(pendingStart.sessionId, cancelledMessages), () => false)
        .then(async (persisted) => {
          if (!persisted) await useSessionStore.getState().loadMessagesForSession(pendingStart.sessionId);
        })
        .finally(() => {
          pendingStreamCancellations.delete(requestId);
          if (useSessionStore.getState().activeStreamRequestId === requestId) {
            useSessionStore.setState({
              counselorStatus: "idle",
              activeStreamRequestId: undefined,
              activeStreamSessionId: undefined
            });
          }
        });
      return;
    }
    pendingStreamCancellations.add(requestId);
    if (sessionId) {
      const assistantMessageId = getActiveAssistantMessageId(sessionId);
      if (assistantMessageId) settleCancelledAssistantMessage(sessionId, assistantMessageId);
    }
    if (window.lingDesktop?.counseling) {
      void (async () => {
        let cancelFailed = false;
        try {
          try {
            const result = await window.lingDesktop!.counseling!.cancel(requestId);
            cancelFailed = !result.ok;
          } catch {
            cancelFailed = true;
          }
          if (sessionId && typeof window.lingDesktop?.counseling?.getActiveStream === "function") {
            try {
              const active = await window.lingDesktop.counseling.getActiveStream(sessionId);
              if (active.ok && !active.data) {
                await useSessionStore.getState().loadMessagesForSession(sessionId);
                if (useSessionStore.getState().activeStreamRequestId === requestId) {
                  useSessionStore.setState({
                    counselorStatus: "idle",
                    activeStreamRequestId: undefined,
                    activeStreamSessionId: undefined
                  });
                }
                return;
              }
            } catch {
              cancelFailed = true;
            }
          }
          if (cancelFailed && useSessionStore.getState().activeStreamRequestId === requestId) {
            useSessionStore.setState({ counselorStatus: "error" });
          }
        } finally {
          pendingStreamCancellations.delete(requestId);
        }
      })();
      return;
    } else {
      cancelDevCounselingStream(requestId);
    }
    set({ counselorStatus: "idle", activeStreamRequestId: undefined, activeStreamSessionId: undefined });
  }
}));

export function resetSessionStore() {
  pendingDraftCreation = null;
  pendingPersistedSessionsLoad = null;
  pendingMessageLoads.clear();
  pendingStreamStarts.clear();
  pendingStreamCancellations.clear();
  pendingStreamSettlements.clear();
  transientImageInputsByMessageId.clear();
  activeStreamPollPromise = null;
  if (activeStreamPollTimer !== null) {
    window.clearInterval(activeStreamPollTimer);
    activeStreamPollTimer = null;
  }
  useSessionStore.setState({
    currentCounselorId: defaultCounselors[0].id,
    currentTeamId: "one-way-mirror",
    currentRoomThemeId: defaultRoomThemes[0].id,
    currentModelName: localize("尚未配置模型", "Model not configured"),
    activeSessionId: "",
    activeStreamRequestId: undefined,
    activeStreamSessionId: undefined,
    bookedCounselorId: undefined,
    counselorStatus: "idle",
    sessions: initialSessions,
    sessionLettersBySessionId: {},
    consultationPreparationsBySessionId: {},
    newSessionError: undefined,
    hasLoadedPersistedSessions: false,
    sessionsLoadState: "idle",
    sessionsLoadError: undefined,
    searchQuery: "",
    expandedHistoryCounselorId: undefined,
    isSidebarCollapsed: true
  });
}

async function restoreActiveCounselingStream(preferredSessionId: string) {
  const getActiveStream = window.lingDesktop?.counseling?.getActiveStream;
  if (typeof getActiveStream !== "function") return { ok: true } as const;
  let result;
  try {
    result = await getActiveStream(preferredSessionId);
  } catch {
    return { ok: false as const, message: localize("暂时无法确认正在进行的回应，请重新读取。", "Ling cannot confirm the response in progress. Please reload.") };
  }
  if (!result.ok) return { ok: false as const, message: result.error.message };
  if (result.data) {
    useSessionStore.setState({
      activeStreamRequestId: result.data.requestId,
      activeStreamSessionId: preferredSessionId,
      counselorStatus: "streaming"
    });
    startActiveStreamPolling(preferredSessionId, result.data.requestId);
    return { ok: true } as const;
  }
  const loaded = await useSessionStore.getState().loadMessagesForSession(preferredSessionId);
  if (!loaded) return { ok: false as const, message: localize("暂时无法重新读取当前会谈，请重试。", "The current session could not be reloaded. Please try again.") };
  const settled = await settleInterruptedMessages(preferredSessionId);
  if (!settled) return { ok: false as const, message: localize("上次中断的回应没有恢复。请重新读取会谈，再决定是否重试该消息。", "The previously interrupted response could not be restored. Reload the session before deciding whether to retry the message.") };
  return { ok: true } as const;
}

function startActiveStreamPolling(sessionId: string, requestId: string) {
  if (activeStreamPollTimer !== null) window.clearInterval(activeStreamPollTimer);
  activeStreamPollTimer = window.setInterval(() => {
    if (activeStreamPollPromise) return;
    const pollPromise = pollActiveCounselingStream(sessionId, requestId);
    activeStreamPollPromise = pollPromise;
    void pollPromise.then(
      () => {
        if (activeStreamPollPromise === pollPromise) activeStreamPollPromise = null;
      },
      () => {
        if (activeStreamPollPromise === pollPromise) activeStreamPollPromise = null;
      }
    );
  }, 750);
}

async function pollActiveCounselingStream(sessionId: string, requestId: string) {
  const current = useSessionStore.getState();
  if (current.activeStreamRequestId !== requestId || current.activeStreamSessionId !== sessionId) {
    stopActiveStreamPolling();
    return;
  }
  await current.loadMessagesForSession(sessionId);
  const getActiveStream = window.lingDesktop?.counseling?.getActiveStream;
  if (typeof getActiveStream !== "function") return;
  const result = await getActiveStream(sessionId);
  if (!result.ok) return;
  if (result.data?.requestId === requestId) return;
  await useSessionStore.getState().loadMessagesForSession(sessionId);
  useSessionStore.setState({
    activeStreamRequestId: undefined,
    activeStreamSessionId: undefined,
    counselorStatus: "idle"
  });
  stopActiveStreamPolling();
}

function stopActiveStreamPolling() {
  if (activeStreamPollTimer === null) return;
  window.clearInterval(activeStreamPollTimer);
  activeStreamPollTimer = null;
  activeStreamPollPromise = null;
}

async function settleInterruptedMessages(sessionId: string) {
  const state = useSessionStore.getState();
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return true;
  const interrupted = session.messages.filter((message) => message.status === "sending");
  if (interrupted.length === 0) return true;
  const repaired = interrupted.map((message) => ({
    ...message,
    content:
      message.role === "assistant" && !message.content.trim()
        ? localize("上次回应因应用关闭而中断，可以重新尝试。", "The previous response was interrupted when the app closed. You can try again.")
        : message.content,
    status: "failed" as const
  }));
  if (window.lingDesktop?.messages) {
    const results = await Promise.all(repaired.map((message) => window.lingDesktop!.messages!.append(message)));
    if (results.some((result) => !result.ok)) return false;
  }
  useSessionStore.setState((current) => ({
    sessions: current.sessions.map((item) =>
      item.id === sessionId ? { ...item, messages: upsertMessages(item.messages, repaired) } : item
    )
  }));
  return true;
}

function createSessionId() {
  const value = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `session-${value}`;
}

function commandErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? `${fallback}（${error.message}）` : fallback;
}

function startStreamRequest({
  requestId,
  sessionId,
  userMessage,
  assistantMessage,
  contextMessages,
  importedDocuments,
  imageInputs,
  failUserOnStartFailure
}: {
  requestId: string;
  sessionId: string;
  userMessage: SessionMessage;
  assistantMessage: SessionMessage;
  contextMessages: SessionMessage[];
  importedDocuments: ImportedDocument[];
  imageInputs: ModelImageInput[];
  failUserOnStartFailure: boolean;
}) {
  const streamMessage = window.lingDesktop?.counseling ? window.lingDesktop.counseling.streamMessage : streamDevCounselingMessage;
  const transportUserMessage = normalizeMessageContentForTransport({ ...userMessage, status: "sent" as const });
  const streamRequest: CounselingStreamRequest = {
    requestId,
    sessionId,
    counselorId: getActiveSessionMetadata(sessionId).counselorId,
    teamId: getActiveSessionMetadata(sessionId).teamId,
    api: useSettingsStore.getState().api,
    message: transportUserMessage,
    assistantMessageId: assistantMessage.id,
    contextMessages: buildBoundedContext(contextMessages, userMessage),
    ...(imageInputs.length > 0 ? { imageInputs } : {})
  };
  const streamHandlers = {
    onEvent: (event: CounselingStreamEvent) => handleStreamEvent(event, sessionId, userMessage.id, assistantMessage.id)
  };
  const preflightPromise = importedDocuments.length > 0
    ? prepareImportedDocuments(importedDocuments)
    : Promise.resolve();
  pendingStreamStarts.set(requestId, { assistantMessage, preflightPromise, sessionId, userMessage });
  const invokeStream = () => {
    const pendingStart = pendingStreamStarts.get(requestId);
    if (!pendingStart || useSessionStore.getState().activeStreamRequestId !== requestId) {
      return Promise.resolve({ ok: true as const, data: { requestId } });
    }
    pendingStreamStarts.delete(requestId);
    return streamMessage(streamRequest, streamHandlers);
  };
  const streamPromise = importedDocuments.length > 0 ? preflightPromise.then(invokeStream) : invokeStream();

  const failStreamStart = (message: string) => {
    if (pendingStreamCancellations.has(requestId)) return;
    pendingStreamStarts.delete(requestId);
    if (useSessionStore.getState().activeStreamRequestId !== requestId) return;
    if (failUserOnStartFailure) setMessageStatus(sessionId, userMessage.id, "failed");
    setAssistantMessage(sessionId, assistantMessage.id, message, "failed");
    pendingStreamSettlements.add(requestId);
    const failedMessages: SessionMessage[] = [
      ...(failUserOnStartFailure
        ? [normalizeMessageContentForTransport({ ...userMessage, status: "failed" as const })]
        : []),
      { ...assistantMessage, content: message, status: "failed" }
    ];
    void persistMessageBatchForActiveSession(sessionId, failedMessages)
      .then(async (persisted) => {
        if (!persisted) await useSessionStore.getState().loadMessagesForSession(sessionId);
      })
      .finally(() => {
        pendingStreamSettlements.delete(requestId);
        if (useSessionStore.getState().activeStreamRequestId === requestId) {
          useSessionStore.setState({
            counselorStatus: "error",
            activeStreamRequestId: undefined,
            activeStreamSessionId: undefined
          });
        }
      });
  };

  void streamPromise.then(
    (result) => {
      if (!result.ok) failStreamStart(result.error.message);
    },
    () => failStreamStart(localize("没有开始生成回应。请检查模型连接后重试。", "The response did not start. Check the model connection and try again."))
  );
}

async function prepareImportedDocuments(documents: ImportedDocument[]) {
  if (!window.lingDesktop?.documents || documents.length === 0) return;
  for (const document of documents) {
    const result = await window.lingDesktop.documents.create(document);
    if (!result.ok) throw new Error(result.error.message);
  }
}

async function persistMessageBatchForActiveSession(sessionId: string, messages: SessionMessage[]) {
  if (messages.length === 0 || messages.some((message) => message.sessionId !== sessionId)) return false;
  const bridge = window.lingDesktop?.messages;
  if (!bridge) return true;
  try {
    if (typeof bridge.appendMany === "function") {
      const result = await bridge.appendMany(messages);
      return result.ok;
    }
    const results = await Promise.all(messages.map((message) => bridge.append(message)));
    return results.every((result) => result.ok);
  } catch {
    // Re-read below removes any optimistic cancellation messages that did not
    // commit as one complete batch.
    return false;
  }
}

function handleStreamEvent(event: CounselingStreamEvent, sessionId: string, userMessageId: string, assistantMessageId: string) {
  const state = useSessionStore.getState();
  if (event.type === "status") {
    if (event.status === "cancelled") {
      transientImageInputsByMessageId.delete(userMessageId);
      settleCancelledAssistantMessage(sessionId, assistantMessageId);
      pendingStreamCancellations.delete(event.requestId);
      useSessionStore.setState({ counselorStatus: "idle", activeStreamRequestId: undefined, activeStreamSessionId: undefined });
      return;
    }
    if (state.activeStreamRequestId !== event.requestId) return;
    const nextStatus =
      event.status === "connecting"
        ? "connecting"
        : event.status === "thinking"
          ? "thinking"
          : event.status === "streaming"
            ? "streaming"
            : "idle";
    useSessionStore.setState({ counselorStatus: nextStatus, activeStreamRequestId: event.requestId });
    return;
  }

  if (pendingStreamCancellations.has(event.requestId)) return;
  if (state.activeStreamRequestId !== event.requestId) return;

  if (event.type === "chunk") {
    appendAssistantChunk(sessionId, assistantMessageId, event.content);
    return;
  }

  if (event.type === "done") {
    transientImageInputsByMessageId.delete(userMessageId);
    setMessageStatus(sessionId, userMessageId, "sent");
    setAssistantMessage(sessionId, assistantMessageId, event.content, "sent");
    useSessionStore.setState({ counselorStatus: "idle", activeStreamRequestId: undefined, activeStreamSessionId: undefined });
    return;
  }

  if (event.failedUserMessageId) {
    setMessageStatus(sessionId, event.failedUserMessageId, "failed");
  } else {
    setMessageStatus(sessionId, userMessageId, "sent");
  }
  setAssistantMessage(sessionId, assistantMessageId, event.message, "failed");
  useSessionStore.setState({ counselorStatus: "error", activeStreamRequestId: undefined, activeStreamSessionId: undefined });
}

function toCounselingSession(session: PrototypeSession, state: SessionState): CounselingSession {
  const timestamp = new Date().toISOString();
  return {
    id: session.id,
    title: session.title,
    counselorId: session.counselorId || state.currentCounselorId,
    roomThemeId: session.roomThemeId || state.currentRoomThemeId,
    teamId: session.teamId ?? state.currentTeamId,
    modelName: session.modelName || useSettingsStore.getState().api.modelName,
    promptSnapshot: session.promptSnapshot,
    createdAt: session.createdAt ?? timestamp,
    updatedAt: session.updatedAt ?? timestamp,
    startedAt: session.startedAt ?? session.createdAt ?? timestamp,
    endedAt: session.endedAt,
    status: session.status
  };
}

function createPendingSessionLetter(session: PrototypeSession, now: string): SessionLetter {
  return {
    id: `session-letter-${session.id}`,
    sessionId: session.id,
    counselorId: session.counselorId,
    modelName: localize("正在准备", "Preparing"),
    letterMd: "",
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
}

function createPreviewSessionLetter(session: PrototypeSession, now: string): SessionLetter {
  const locale = useSettingsStore.getState().locale;
  const counselorName =
    getDefaultCounselors(locale).find((counselor) => counselor.id === session.counselorId)?.name ??
    localize("咨询师", "Counselor");
  const clientDisplayName = useSettingsStore.getState().profile.displayName.trim();
  const userMessages = session.messages.filter((message) => message.role === "user").map((message) => message.content.trim()).filter(Boolean);
  const rememberedLine =
    userMessages.at(-1) ??
    localize(
      "你愿意把这一小段时间交给会谈，本身就已经是一种很认真地照顾自己。",
      "Choosing to spend this time in a counseling conversation can itself be a way of attending carefully to what you need."
    );

  return {
    id: `session-letter-${session.id}`,
    sessionId: session.id,
    counselorId: session.counselorId,
    modelName: localize("网页预览", "Web preview"),
    letterMd: locale === "en-US"
      ? `${clientDisplayName ? `${clientDisplayName},\n\n` : ""}I remember the place where you paused in this session: “${rememberedLine}”\n\nThis is a local example used only to preview the letter's presentation and interaction. In the desktop app, the counselor's letter is written from the complete session.\n\nIf it feels useful, you might simply notice one word from the session that stays with you—without needing to explain or change it now.\n\n${counselorName}`
      : `${clientDisplayName ? `${clientDisplayName}：\n\n` : ""}我还记得你在这次会谈里停留过的地方：“${rememberedLine}”\n\n这封信只是网页预览里的本地示例，用来让你检查来信的样式与交互。真正的桌面端会由咨询师的来信 Agent 根据完整会谈来写。\n\n如果此刻你愿意，可以先把这次会谈里最触动你的一个词留下来，不急着解释，也不急着改变。\n\n${counselorName}`,
    status: "ready",
    createdAt: now,
    updatedAt: now
  };
}

function schedulePreviewSessionLetter(session: PrototypeSession, endedAt: string) {
  window.setTimeout(() => {
    useSessionStore.setState((state) => {
      const currentSession = state.sessions.find((item) => item.id === session.id);
      const currentLetter = state.sessionLettersBySessionId[session.id];
      if (!currentSession || currentSession.status !== "ended" || currentLetter?.status !== "pending") return state;
      const now = new Date().toISOString();
      return {
        sessionLettersBySessionId: {
          ...state.sessionLettersBySessionId,
          [session.id]: createPreviewSessionLetter(session, now || endedAt)
        }
      };
    });
  }, 1600);
}

function applyPersistedSession(persisted: CounselingSession) {
  useSessionStore.setState((state) => ({
    sessions: state.sessions.map((session) =>
      session.id === persisted.id
        ? {
            ...session,
            status: persisted.status,
            startedAt: persisted.startedAt,
            endedAt: persisted.endedAt,
            updatedAt: persisted.updatedAt,
            time: formatSessionTime(persisted.updatedAt ?? persisted.endedAt ?? persisted.startedAt)
          }
        : session
    ),
    ...(state.activeSessionId === persisted.id ? metadataFromCounselingSession(persisted) : {})
  }));
}

function applyLocalEndedState(session: PrototypeSession, endedAt: string) {
  useSessionStore.setState((state) => ({
    sessionLettersBySessionId: {
      ...state.sessionLettersBySessionId,
      [session.id]: createPendingSessionLetter(session, endedAt)
    },
    sessions: state.sessions.map((item) =>
      item.id === session.id
        ? { ...item, status: "ended", endedAt, updatedAt: endedAt, time: nowLabel }
        : item
    )
  }));
}

function applyLocalActiveState(sessionId: string, updatedAt: string) {
  useSessionStore.setState((state) => {
    const nextLetters = { ...state.sessionLettersBySessionId };
    delete nextLetters[sessionId];
    return {
      sessionLettersBySessionId: nextLetters,
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? { ...session, status: "active", endedAt: undefined, updatedAt, time: nowLabel }
          : session
      )
    };
  });
}

function resolveLetterAvailability(
  letter: SessionLetter | null,
  preparation?: ConsultationPreparation
): SessionLetterReadResult {
  if (letter?.status === "failed" || preparation?.status === "failed" || preparation?.status === "stale") {
    return { ok: true, availability: "failed", letter };
  }
  if (letter?.status === "ready" && letter.letterMd.trim()) {
    return { ok: true, availability: "ready", letter };
  }
  return { ok: true, availability: "pending", letter };
}

function removeSessionLetterFromState(sessionId: string) {
  useSessionStore.setState((state) => {
    const nextLetters = { ...state.sessionLettersBySessionId };
    delete nextLetters[sessionId];
    return { sessionLettersBySessionId: nextLetters };
  });
}

function removeSessionLocally(sessionId: string) {
  useSessionStore.setState((state) => {
    const nextSessions = state.sessions.filter((session) => session.id !== sessionId);
    const nextLetters = { ...state.sessionLettersBySessionId };
    delete nextLetters[sessionId];
    const nextActiveSession =
      state.activeSessionId === sessionId
        ? nextSessions[0]
        : nextSessions.find((session) => session.id === state.activeSessionId);
    return {
      sessions: nextSessions,
      activeSessionId: nextActiveSession?.id ?? "",
      counselorStatus: state.activeStreamRequestId ? state.counselorStatus : "idle",
      sessionLettersBySessionId: nextLetters,
      searchQuery: "",
      ...(nextActiveSession ? metadataFromPrototypeSession(nextActiveSession) : {})
    };
  });
}

function getActiveSessionMetadata(sessionId: string) {
  const state = useSessionStore.getState();
  const session = state.sessions.find((item) => item.id === sessionId);
  return {
    counselorId: session?.counselorId ?? state.currentCounselorId,
    teamId: session?.teamId ?? state.currentTeamId,
    roomThemeId: session?.roomThemeId ?? state.currentRoomThemeId,
    modelName: session?.modelName ?? state.currentModelName
  };
}

function persistSessionListMetadata(
  sessionId: string,
  metadata: { title: string; preview: string; updatedAt: string }
) {
  if (typeof window.lingDesktop?.sessions?.update !== "function") return;
  void window.lingDesktop.sessions.update(sessionId, {
    title: metadata.title,
    summary: metadata.preview,
    updatedAt: metadata.updatedAt
  });
}

function persistSessionPreview(sessionId: string, preview: string, updatedAt: string) {
  const text = normalizeListText(preview);
  if (!text || typeof window.lingDesktop?.sessions?.update !== "function") return;
  void window.lingDesktop.sessions.update(sessionId, {
    summary: text,
    updatedAt
  });
}

function restoreSessionEndedState(
  sessionId: string,
  status: CounselingSession["status"],
  endedAt: string | undefined,
  updatedAt: string | undefined
) {
  useSessionStore.setState((state) => ({
    sessions: state.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            status,
            endedAt,
            updatedAt
          }
        : session
    )
  }));
}

function appendAssistantChunk(sessionId: string, messageId: string, chunk: string) {
  useSessionStore.setState((state) => ({
    sessions: state.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            preview: `${session.messages.find((message) => message.id === messageId)?.content ?? ""}${chunk}`,
            messages: session.messages.map((message) =>
              message.id === messageId ? { ...message, content: `${message.content}${chunk}`, status: "sending" } : message
            )
          }
        : session
    )
  }));
}

function setAssistantMessage(sessionId: string, messageId: string, content: string, status: SessionMessage["status"]) {
  const updatedAt = new Date().toISOString();
  useSessionStore.setState((state) => ({
    sessions: state.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            preview: content || session.preview,
            time: content ? nowLabel : session.time,
            messages: session.messages.map((message) => (message.id === messageId ? { ...message, content, status } : message))
          }
        : session
    )
  }));
  persistSessionPreview(sessionId, content, updatedAt);
}

function setMessageStatus(sessionId: string, messageId: string, status: SessionMessage["status"]) {
  useSessionStore.setState((state) => ({
    sessions: state.sessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            messages: session.messages.map((message) => (message.id === messageId ? { ...message, status } : message))
          }
        : session
    )
  }));
}

function settleCancelledAssistantMessage(sessionId: string, messageId: string) {
  useSessionStore.setState((state) => ({
    sessions: state.sessions.map((session) => {
      if (session.id !== sessionId) return session;
      return {
        ...session,
        messages: session.messages.map((message) => {
          if (message.id !== messageId) return message;
          return {
            ...message,
            content: localize("已停止，可重试。", "Stopped. You can try again."),
            status: "failed"
          };
        })
      };
    })
  }));
}

function getActiveAssistantMessageId(sessionId: string) {
  const session = useSessionStore.getState().sessions.find((item) => item.id === sessionId);
  if (!session) return undefined;
  return [...session.messages].reverse().find((message) => message.role === "assistant" && message.status === "sending")?.id;
}

function localize(zhCN: string, enUS: string) {
  return useSettingsStore.getState().locale === "en-US" ? enUS : zhCN;
}
