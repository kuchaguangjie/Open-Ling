import { type ClipboardEvent, type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { type ImportedDocument, type ModelImageInput, type SessionLetter } from "@shared/index";
import {
  createImportedDocumentFromText,
  shouldAutoImportLongInput
} from "@core/counseling/documents/importedDocumentContext";
import { modelSupportsImageInput } from "@core/providers/modelCapabilities";
import { buildRotatingCounselorStatusQuote } from "../content/counselorStatusQuotes";
import {
  buildCounselorResponseActivity,
  counselorResponseActivityRotationMs
} from "../content/counselorResponseActivity";
import { getCounselorFlowAssets, preloadCounselorClosingAssets } from "../flows/consultation/counselorFlowAssets";
import { getCounselorFlowCopy, getLetterNotice, getOpeningPrivacyAssurance, splitDialogueSentences } from "../flows/consultation/counselorFlowContent";
import { type PendingConsultationAttachment, useConsultationDraftStore } from "../flows/consultation/consultationDraftStore";
import { useConsultationFlowStore } from "../flows/consultation/consultationFlowStore";
import { compareEndedSessionsNewestFirst } from "../flows/consultation/sessionLifecycleOrdering";
import {
  type CounselorStatus,
  type MessageAttachmentReference,
  type PrototypeSession,
  useSessionStore
} from "../stores/sessionStore";
import { CounselingRoomComposer } from "./counseling-room/composer/CounselingRoomComposer";
import { CounselingRoomHeader } from "./counseling-room/conversation/CounselingRoomHeader";
import { CounselingRoomMessageStream } from "./counseling-room/conversation/CounselingRoomMessageStream";
import { CounselingRoomReadOnlyHistory } from "./counseling-room/conversation/CounselingRoomReadOnlyHistory";
import { SessionLetterReader } from "./counseling-room/overlays/session-letter/SessionLetterReader";
import { CounselingRoomStage } from "./counseling-room/stage/CounselingRoomStage";
import { ClosingChoiceMenu } from "./counseling-room/transitions/ClosingChoiceMenu";
import { ConsultationArrivalStage } from "./counseling-room/transitions/ConsultationArrivalStage";
import { ConsultationConfirmDialog } from "./counseling-room/transitions/ConsultationConfirmDialog";
import { CounselorDialogueStage } from "./counseling-room/transitions/CounselorDialogueStage";
import { useCounselingRoomController } from "./counseling-room/controller/useCounselingRoomController";
import { CounselingRoomSidebar } from "./counseling-room/sidebar/CounselingRoomSidebar";
import { useLingua } from "../localization/useLingua";
import { useSettingsStore } from "../stores/settingsStore";

const acceptedAttachmentExtensions = new Set(["png", "jpg", "jpeg", "gif", "webp", "txt", "md", "pdf", "doc", "docx"]);
const attachmentAcceptValue = ".png,.jpg,.jpeg,.gif,.webp,.txt,.md,.pdf,.doc,.docx";
const maxAttachmentBytes = 50 * 1024 * 1024;
const maxImageAttachmentBytes = 32 * 1024 * 1024;
const composerThinkingHoldMs = 10_000;
const statusQuoteRotationMs = 10 * 60 * 1000;

function getClosingRotationIndex(sessions: PrototypeSession[], counselorId: string, sessionId: string) {
  const endedSessions = sessions
    .filter((session) => session.counselorId === counselorId && session.status === "ended")
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt ?? left.endedAt ?? "") || 0;
      const rightTime = Date.parse(right.createdAt ?? right.endedAt ?? "") || 0;
      return leftTime - rightTime || left.id.localeCompare(right.id);
    });
  const sessionIndex = endedSessions.findIndex((session) => session.id === sessionId);
  if (sessionIndex >= 0) return sessionIndex;
  return [...sessionId].reduce((total, character) => total + character.charCodeAt(0), 0);
}

export function CounselingRoomPage() {
  const { locale, t } = useLingua();
  const api = useSettingsStore((state) => state.savedApi);
  const {
    activeSessionId,
    activeStreamRequestId,
    activeStreamSessionId,
    counselorStatus,
    isSidebarCollapsed,
    cancelStreamingResponse,
    loadConsultationPreparation,
    loadMessagesForSession,
    loadSessionLetter,
    markSessionLetterRead,
    regenerateSessionLetter,
    retryConsultationPreparation,
    retryMessage,
    sendPrototypeMessage,
    activeSession,
    activeSessionLetter,
    activePreparation,
    clientDisplayName,
    counselor,
    setActivePage,
    userAvatarSrc,
    visualAssets
  } = useCounselingRoomController();
  const flow = useConsultationFlowStore((state) => state.flow);
  const flowError = useConsultationFlowStore((state) => state.error);
  const flowBusy = useConsultationFlowStore((state) => state.isBusy);
  const finishArrival = useConsultationFlowStore((state) => state.finishArrival);
  const advanceOpening = useConsultationFlowStore((state) => state.advanceOpening);
  const skipOpening = useConsultationFlowStore((state) => state.skipOpening);
  const cancelOpening = useConsultationFlowStore((state) => state.cancelOpening);
  const startNewConsultation = useConsultationFlowStore((state) => state.startNewConsultation);
  const requestEnd = useConsultationFlowStore((state) => state.requestEnd);
  const recheckEndStatus = useConsultationFlowStore((state) => state.recheckEndStatus);
  const advanceClosing = useConsultationFlowStore((state) => state.advanceClosing);
  const skipClosing = useConsultationFlowStore((state) => state.skipClosing);
  const openClosingHistory = useConsultationFlowStore((state) => state.openClosingHistory);
  const openActiveFlowSession = useConsultationFlowStore((state) => state.openActiveSession);
  const readFlowLetter = useConsultationFlowStore((state) => state.readLetter);
  const returnToClosingMenu = useConsultationFlowStore((state) => state.returnToClosingMenu);
  const closeFlowLetter = useConsultationFlowStore((state) => state.closeLetter);
  const leaveForLobby = useConsultationFlowStore((state) => state.leaveForLobby);
  const resumeSessionFromHistory = useConsultationFlowStore((state) => state.resumeSessionFromHistory);
  const clearFlowError = useConsultationFlowStore((state) => state.clearError);
  const sessions = useSessionStore((state) => state.sessions);
  const draftsBySessionId = useConsultationDraftStore((state) => state.draftsBySessionId);
  const attachmentsBySessionId = useConsultationDraftStore((state) => state.attachmentsBySessionId);
  const setSessionDraft = useConsultationDraftStore((state) => state.setDraft);
  const addSessionAttachments = useConsultationDraftStore((state) => state.addAttachments);
  const removeSessionAttachment = useConsultationDraftStore((state) => state.removeAttachment);
  const clearDraftAfterSend = useConsultationDraftStore((state) => state.clearAfterSend);
  const [attachmentError, setAttachmentError] = useState("");
  const [attachmentNotice, setAttachmentNotice] = useState("");
  const [isComposerActive, setIsComposerActive] = useState(false);
  const [isEndConfirmationOpen, setIsEndConfirmationOpen] = useState(false);
  const [openedLetter, setOpenedLetter] = useState<SessionLetter | null>(null);
  // Opening the full letter is the moment it counts as read. Selecting a letter
  // in the archive does not — there, selection is just preview.
  const openLetter = (letter: SessionLetter) => {
    setOpenedLetter(letter);
    void markSessionLetterRead(letter.sessionId);
  };
  const [newConsultationConfirmation, setNewConsultationConfirmation] = useState<
    "sent" | "sent-with-unsent" | "unsent-only" | null
  >(null);
  const [statusQuoteRotationBucket, setStatusQuoteRotationBucket] = useState(0);
  const [responseActivityRotationBucket, setResponseActivityRotationBucket] = useState(0);
  const statusQuoteRestartSeedRef = useRef(`${Date.now()}-${Math.random()}`);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const composerActivityTimeoutRef = useRef<number | null>(null);
  const hasActiveSession = Boolean(activeSession);
  const userDisplayName = clientDisplayName.trim() || t("room.you");
  const activeSessionTitle = activeSession?.title ?? t("room.noSession");
  const draft = draftsBySessionId[activeSessionId] ?? "";
  const pendingAttachments = attachmentsBySessionId[activeSessionId] ?? [];
  const isBusy = counselorStatus === "connecting" || counselorStatus === "thinking" || counselorStatus === "streaming";
  const shouldRotateResponseActivity = counselorStatus === "thinking" || counselorStatus === "streaming";
  const isActiveSessionStreaming = Boolean(activeStreamRequestId && activeStreamSessionId === activeSessionId && isBusy);
  const isBusyInAnotherSession = Boolean(activeStreamRequestId && activeStreamSessionId !== activeSessionId);
  const isSessionEnded = activeSession?.status === "ended";
  const latestEndedForActiveCounselor = activeSession
    ? sessions
        .filter((session) => session.counselorId === activeSession.counselorId && session.status === "ended")
        .sort(compareEndedSessionsNewestFirst)[0]
    : undefined;
  const archiveResumeBlockedReason = activeSession && sessions.some(
    (session) =>
      session.id !== activeSession.id &&
      session.counselorId === activeSession.counselorId &&
      (session.status === "active" || session.status === "draft")
  )
    ? t("room.unfinishedBlocked")
    : activeSession?.status === "ended" && latestEndedForActiveCounselor?.id !== activeSession.id
      ? t("room.olderReadOnly")
    : undefined;
  const areMessagesLoading = activeSession?.messagesLoaded === false;
  const isComposerDisabled = !hasActiveSession || isSessionEnded || isBusyInAnotherSession || areMessagesLoading;
  const isSendDisabled = isComposerDisabled || (!isActiveSessionStreaming && !draft.trim() && pendingAttachments.length === 0);
  const visibleCounselorStatus: CounselorStatus = isBusyInAnotherSession
    ? "streaming"
    : !isActiveSessionStreaming && isComposerActive
      ? "listening"
      : counselorStatus === "listening"
        ? "idle"
        : counselorStatus;
  const flowAssets = getCounselorFlowAssets(counselor.id);
  const flowSurfaceKind = flow?.surface.kind;
  const flowCopy = getCounselorFlowCopy(counselor.id, locale);
  const closingRotationIndex = getClosingRotationIndex(
    sessions,
    flow?.counselorId ?? counselor.id,
    flow?.sessionId ?? activeSessionId
  );
  const closingLine = flowCopy.closings[closingRotationIndex % flowCopy.closings.length];
  const closingLines = [closingLine, t("room.closingNotice")];
  const statusQuote = buildRotatingCounselorStatusQuote({
    counselorId: counselor.id,
    sessionId: activeSession?.id ?? activeSessionId,
    restartSeed: statusQuoteRestartSeedRef.current,
    rotationBucket: statusQuoteRotationBucket,
    locale
  });
  const roomStyle = {
    "--room-theme-image": `url(${flowAssets?.sessionRoomBackground ?? visualAssets.roomBackground})`,
    "--portrait-backdrop-image": `url(${visualAssets.portraitBackdrop})`,
    "--portrait-backdrop-opacity": visualAssets.usesUnifiedRoomBackground ? "0" : "0.94"
  } as CSSProperties;
  const statusText =
    isBusyInAnotherSession
      ? t("room.statusOther").replace("{name}", counselor.name)
      : visibleCounselorStatus === "connecting"
      ? t("room.statusThinking").replace("{name}", counselor.name)
      : visibleCounselorStatus === "thinking"
      ? t("room.statusThinking").replace("{name}", counselor.name)
      : visibleCounselorStatus === "streaming"
        ? t("room.statusSpeaking").replace("{name}", counselor.name)
        : visibleCounselorStatus === "error"
          ? t("room.statusError")
      : visibleCounselorStatus === "listening"
        ? t("room.statusListening").replace("{name}", counselor.name)
        : t("room.statusListening").replace("{name}", counselor.name);
  const waitingActivityText = buildCounselorResponseActivity(counselor.name, responseActivityRotationBucket, locale);

  useEffect(() => {
    if (
      flowSurfaceKind === "ending" ||
      flowSurfaceKind === "closing" ||
      flowSurfaceKind === "closing-menu" ||
      flowSurfaceKind === "letter"
    ) {
      preloadCounselorClosingAssets(counselor.id);
    }
  }, [counselor.id, flowSurfaceKind]);

  const requestNewConsultation = useCallback(() => {
    if (activeStreamRequestId || flowBusy || (flow && flow.surface.kind !== "session") || newConsultationConfirmation) return;
    const hasUnsentInput = Boolean(draft.trim() || pendingAttachments.length);
    if (activeSession?.messagesLoaded === false) return;
    const hasSentUserMessage = Boolean(activeSession?.messages.some((message) => message.role === "user"));
    if (!hasUnsentInput && !hasSentUserMessage) {
      void startNewConsultation();
      return;
    }
    setNewConsultationConfirmation(
      hasUnsentInput
        ? hasSentUserMessage ? "sent-with-unsent" : "unsent-only"
        : "sent"
    );
  }, [
    activeSession,
    activeStreamRequestId,
    draft,
    flow,
    flowBusy,
    newConsultationConfirmation,
    pendingAttachments.length,
    startNewConsultation
  ]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setStatusQuoteRotationBucket((current) => current + 1);
    }, statusQuoteRotationMs);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setResponseActivityRotationBucket(0);
    if (!shouldRotateResponseActivity) return;
    const intervalId = window.setInterval(() => {
      setResponseActivityRotationBucket((current) => current + 1);
    }, counselorResponseActivityRotationMs);
    return () => window.clearInterval(intervalId);
  }, [activeSessionId, shouldRotateResponseActivity]);

  useEffect(() => {
    const removeDesktopShortcutListener = window.lingDesktop?.app?.onNewSessionShortcut(requestNewConsultation);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "n" || (!event.metaKey && !event.ctrlKey) || event.shiftKey || event.altKey) return;
      event.preventDefault();
      requestNewConsultation();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      removeDesktopShortcutListener?.();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [requestNewConsultation]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !flow) return;
      if (flow.surface.kind === "opening" && !flowBusy) {
        event.preventDefault();
        void cancelOpening();
        return;
      }
      if (flow.surface.kind === "history" && flow.surface.origin === "closing") {
        event.preventDefault();
        returnToClosingMenu();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [cancelOpening, flow, flowBusy, returnToClosingMenu]);

  const activeStreamTailSignature = activeSession
    ? `${activeSession.messages.length}:${activeSession.messages.at(-1)?.content.length ?? 0}:${activeSession.messages.at(-1)?.status ?? ""}`
    : "";

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const frame = requestAnimationFrame(() => {
      if (isActiveSessionStreaming || typeof stream.scrollTo !== "function") {
        // Streaming can deliver many chunks per second. A direct assignment coalesced
        // to one animation frame avoids building a queue of smooth-scroll animations.
        stream.scrollTop = stream.scrollHeight;
        return;
      }
      stream.scrollTo({ top: stream.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeStreamTailSignature, activeSessionLetter?.status, activeSessionLetter?.updatedAt, isActiveSessionStreaming]);

  useEffect(() => {
    if (!activeSessionId || !activeSessionLetter || activeSessionLetter.status !== "pending") return;
    const interval = window.setInterval(() => {
      void loadSessionLetter(activeSessionId);
    }, 2500);
    return () => window.clearInterval(interval);
  }, [activeSessionId, activeSessionLetter?.status, loadSessionLetter]);

  useEffect(() => {
    if (!activeSessionId || !isSessionEnded || !window.lingDesktop?.consultationPreparations) return;
    void loadConsultationPreparation(activeSessionId);
    if (activePreparation?.status === "ready" || activePreparation?.status === "failed" || activePreparation?.status === "stale") {
      return;
    }
    const interval = window.setInterval(() => {
      void loadConsultationPreparation(activeSessionId);
    }, 1500);
    return () => window.clearInterval(interval);
  }, [activePreparation?.status, activeSessionId, isSessionEnded, loadConsultationPreparation]);

  useEffect(() => {
    if (!isActiveSessionStreaming && !isBusyInAnotherSession) return;
    if (composerActivityTimeoutRef.current !== null) {
      window.clearTimeout(composerActivityTimeoutRef.current);
      composerActivityTimeoutRef.current = null;
    }
    setIsComposerActive(false);
  }, [isActiveSessionStreaming, isBusyInAnotherSession]);

  useEffect(() => {
    return () => {
      if (composerActivityTimeoutRef.current !== null) {
        window.clearTimeout(composerActivityTimeoutRef.current);
      }
    };
  }, []);

  function clearComposerActivity() {
    if (composerActivityTimeoutRef.current !== null) {
      window.clearTimeout(composerActivityTimeoutRef.current);
      composerActivityTimeoutRef.current = null;
    }
    setIsComposerActive(false);
  }

  function markComposerActive() {
    if (isActiveSessionStreaming || isBusyInAnotherSession) return;
    setIsComposerActive(true);
    if (composerActivityTimeoutRef.current !== null) {
      window.clearTimeout(composerActivityTimeoutRef.current);
    }
    composerActivityTimeoutRef.current = window.setTimeout(() => {
      composerActivityTimeoutRef.current = null;
      setIsComposerActive(false);
    }, composerThinkingHoldMs);
  }

  function handleDraftChange(value: string) {
    setSessionDraft(activeSessionId, value);
    if (value.trim().length > 0) {
      markComposerActive();
    } else {
      clearComposerActivity();
    }
  }

  async function handleSend() {
    if (!activeSessionId) return;
    if (isComposerDisabled) return;
    if (pendingAttachments.length === 0) {
      const accepted = sendPrototypeMessage(draft);
      if (accepted) {
        clearDraftAfterSend(activeSessionId);
        clearComposerActivity();
      }
      return;
    }

    let prepared: { documents: ImportedDocument[]; attachments: MessageAttachmentReference[]; imageInputs: ModelImageInput[] };
    try {
      prepared = await preparePendingAttachments({
        attachments: pendingAttachments,
        modelName: api.modelName,
        sessionId: activeSessionId
      });
    } catch (error) {
      setAttachmentError(
        error instanceof EmptyTextAttachmentError
          ? t("room.attachmentEmpty").replace("{file}", error.fileName)
          : t("room.attachmentReadError")
      );
      return;
    }
    const { documents, attachments, imageInputs } = prepared;
    const accepted = sendPrototypeMessage(draft, { importedDocuments: documents, attachments, imageInputs });
    if (accepted) {
      clearDraftAfterSend(activeSessionId);
      setAttachmentError("");
      clearComposerActivity();
    }
  }

  function handleAttachmentChange(files: FileList | null) {
    if (!activeSessionId) return;
    if (isComposerDisabled) return;
    if (!files?.length) return;

    const acceptedAttachments: PendingConsultationAttachment[] = [];
    let nextError = "";
    for (const file of Array.from(files)) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!acceptedAttachmentExtensions.has(extension)) {
        nextError = t("room.attachmentUnsupported").replace("{file}", file.name);
        continue;
      }
      if (file.size > (isImageExtension(extension) ? maxImageAttachmentBytes : maxAttachmentBytes)) {
        nextError = t("room.attachmentTooLarge").replace("{file}", file.name);
        continue;
      }
      acceptedAttachments.push({
        id: createAttachmentId(file),
        name: file.name,
        size: file.size,
        extension,
        file
      });
    }

    setAttachmentError(nextError);
    setAttachmentNotice("");
    if (acceptedAttachments.length > 0) {
      addSessionAttachments(activeSessionId, acceptedAttachments);
    }
  }

  function handleDraftPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    if (!activeSessionId || isComposerDisabled) return;
    const pastedText = event.clipboardData.getData("text/plain");
    if (!shouldAutoImportLongInput(pastedText)) return;

    event.preventDefault();
    const file = new File([pastedText], t("room.pastedFileName"), { type: "text/plain", lastModified: Date.now() });
    addSessionAttachments(activeSessionId, [{
      id: createAttachmentId(file),
      name: file.name,
      size: file.size,
      extension: "txt",
      file
    }]);
    setAttachmentError("");
    setAttachmentNotice(
      t("room.pasteNotice")
        .replace("{count}", pastedText.length.toLocaleString(locale))
    );
  }

  function removeAttachment(attachmentId: string) {
    if (!activeSessionId) return;
    removeSessionAttachment(activeSessionId, attachmentId);
    setAttachmentNotice("");
  }

  function openSettingsFromRoom() {
    setActivePage("settings");
  }

  async function toggleSessionFromSidebar() {
    if (!activeSessionId) return;
    if (!isSessionEnded) {
      setIsEndConfirmationOpen(true);
      return;
    }
    if (flow?.surface.kind === "history") {
      await resumeSessionFromHistory();
      return;
    }
    const result = await useSessionStore.getState().resumeSession(activeSessionId);
    if (!result.ok) {
      useConsultationFlowStore.setState({ error: result.message });
      return;
    }
    openActiveFlowSession({ counselorId: counselor.id, sessionId: activeSessionId });
  }

  if (flow?.surface.kind === "arrival") {
    return (
      <ConsultationArrivalStage
        backgroundSrc={flowAssets?.openingRoomBackground}
        counselorName={counselor.name}
        onComplete={finishArrival}
      />
    );
  }

  if (flow && (flow.surface.kind === "opening" || flow.surface.kind === "starting" || flow.surface.kind === "cancelling")) {
    const openingLines = splitDialogueSentences([
      ...flowCopy.opening[flow.script],
      getOpeningPrivacyAssurance(flow.script, api.connectionKind ?? "remote", locale)
    ]);
    const lineIndex = Math.min(flow.surface.lineIndex, openingLines.length - 1);
    const isLastLine = lineIndex === openingLines.length - 1;
    const busy = flowBusy || flow.surface.kind !== "opening";
    return (
      <CounselorDialogueStage
        backgroundSrc={flowAssets?.openingRoomBackground}
        busy={busy}
        counselorName={counselor.name}
        errorMessage={flowError}
        frames={flowAssets?.openingPortraitFrames}
        overlays={flowAssets?.openingPortraitOverlays}
        phase="opening"
        primaryAction={{
          label: t(isLastLine ? "room.start" : "common.continue"),
          onSelect: () => void advanceOpening(openingLines.length)
        }}
        text={openingLines[lineIndex]}
        topLeftAction={{
          label: t("room.backLobby"),
          onSelect: () => void cancelOpening()
        }}
        topRightAction={{
          label: t(flow.script === "first" ? "room.skipOpening" : "room.enterDirectly"),
          onSelect: () => void skipOpening()
        }}
      />
    );
  }

  if (flow?.surface.kind === "closing") {
    const lineIndex = Math.min(flow.surface.lineIndex, closingLines.length - 1);
    const isLastLine = lineIndex === closingLines.length - 1;
    return (
      <CounselorDialogueStage
        backgroundSrc={flowAssets?.openingRoomBackground}
        busy={flowBusy}
        counselorName={counselor.name}
        errorMessage={flowError}
        frames={flowAssets?.closingPortraitFrames}
        overlays={flowAssets?.closingPortraitOverlays}
        phase="closing"
        primaryAction={isLastLine ? undefined : {
          label: t("common.continue"),
          onSelect: () => advanceClosing(closingLines.length)
        }}
        text={closingLines[lineIndex]}
        topRightAction={{ label: t("room.skipClosing"), onSelect: skipClosing }}
      >
        {isLastLine && (
          <ClosingChoiceMenu
            busy={flowBusy}
            onLeave={leaveForLobby}
            onOpenHistory={openClosingHistory}
            onReadLetter={() => void readFlowLetter()}
            onResume={() => void resumeSessionFromHistory()}
            resumeBlockedReason={archiveResumeBlockedReason}
          />
        )}
      </CounselorDialogueStage>
    );
  }

  if (flow?.surface.kind === "closing-menu") {
    return (
      <CounselorDialogueStage
        backgroundSrc={flowAssets?.openingRoomBackground}
        busy={flowBusy}
        counselorName={counselor.name}
        errorMessage={flowError}
        frames={flowAssets?.closingPortraitFrames}
        overlays={flowAssets?.closingPortraitOverlays}
        phase="closing"
        text={closingLines.at(-1) ?? closingLine}
      >
        <ClosingChoiceMenu
          busy={flowBusy}
          onLeave={leaveForLobby}
          onOpenHistory={openClosingHistory}
          onReadLetter={() => void readFlowLetter()}
          onResume={() => void resumeSessionFromHistory()}
          resumeBlockedReason={archiveResumeBlockedReason}
        />
      </CounselorDialogueStage>
    );
  }

  if (flow?.surface.kind === "closing-notice") {
    const { reason } = flow.surface;
    const statusTitle = reason === "letter-pending"
      ? t("letter.writing")
      : reason === "letter-failed"
        ? t("letter.failed")
        : t("room.letterUnknown");
    return (
      <CounselorDialogueStage
        backgroundSrc={flowAssets?.openingRoomBackground}
        busy={flowBusy}
        counselorName={counselor.name}
        errorMessage={flowError}
        frames={flowAssets?.closingPortraitFrames}
        overlays={flowAssets?.closingPortraitOverlays}
        phase="closing"
        text={closingLines.at(-1) ?? closingLine}
      >
        <div className={`consultation-closing-letter-status${reason === "letter-failed" ? " failed" : ""}`} role="status">
          <span>
            <strong>{statusTitle}</strong>
            <small>{getLetterNotice(reason, locale)}</small>
          </span>
        </div>
        <ClosingChoiceMenu
          busy={flowBusy}
          onLeave={leaveForLobby}
          onOpenHistory={openClosingHistory}
          onReadLetter={() => void readFlowLetter()}
          onResume={() => void resumeSessionFromHistory()}
          resumeBlockedReason={archiveResumeBlockedReason}
        />
      </CounselorDialogueStage>
    );
  }

  if (flow?.surface.kind === "ending" || flow?.surface.kind === "history") {
    const origin = flow.surface.kind === "ending" ? "ending" : flow.surface.origin;
    const historyView = (
      <CounselingRoomReadOnlyHistory
        activePreparation={activePreparation}
        busy={flowBusy}
        counselorAvatarSrc={visualAssets.dialogueAvatar}
        counselorName={counselor.name}
        errorMessage={flowError}
        onBack={origin === "closing" ? returnToClosingMenu : leaveForLobby}
        onOpenLetter={openLetter}
        onRegenerateLetter={() => activeSession && void regenerateSessionLetter(activeSession.id)}
        onRecheck={origin === "ending" ? () => void recheckEndStatus() : undefined}
        onResume={origin !== "ending" ? () => void resumeSessionFromHistory() : undefined}
        onRetryMessages={() => void loadMessagesForSession(activeSessionId)}
        onRetryPreparation={() => activeSession && void retryConsultationPreparation(activeSession.id)}
        origin={origin}
        resumeBlockedReason={origin !== "ending" ? archiveResumeBlockedReason : undefined}
        roomBackground={flowAssets?.sessionRoomBackground}
        session={activeSession}
        sessionLetter={activeSessionLetter}
        userAvatarSrc={userAvatarSrc}
        userDisplayName={userDisplayName}
      />
    );
    if (origin === "archive") {
      return (
        <section
          className={[
            "consultation-archive-layout",
            // Same rule as the live room: keep the icon rail collapsed in the
            // grid, and treat history as an overlay (never a 278px first column).
            "sidebar-collapsed",
            isSidebarCollapsed ? "" : "history-open"
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <CounselingRoomSidebar
            onOpenSettings={openSettingsFromRoom}
            onRequestNewConsultation={requestNewConsultation}
          />
          {historyView}
          {openedLetter && (
            <SessionLetterReader
              clientDisplayName={clientDisplayName}
              counselorName={counselor.name}
              letter={openedLetter}
              onClose={() => setOpenedLetter(null)}
              sessionTitle={activeSession?.title}
            />
          )}
        </section>
      );
    }
    return (
      <>
        {historyView}
        {openedLetter && (
          <SessionLetterReader
            clientDisplayName={clientDisplayName}
            counselorName={counselor.name}
            letter={openedLetter}
            onClose={() => setOpenedLetter(null)}
            sessionTitle={activeSession?.title}
          />
        )}
      </>
    );
  }

  if (flow?.surface.kind === "letter") {
    const letter = activeSessionLetter?.status === "ready" ? activeSessionLetter : undefined;
    return (
      <div className="consultation-letter-flow-surface">
        <CounselorDialogueStage
          backgroundSrc={flow.surface.origin === "archive" ? flowAssets?.sessionRoomBackground : flowAssets?.openingRoomBackground}
          counselorName={counselor.name}
          frames={flowAssets?.closingPortraitFrames}
          overlays={flowAssets?.closingPortraitOverlays}
          phase="closing"
          text={t("room.letterOpened")}
        />
        {letter && (
          <SessionLetterReader
            clientDisplayName={clientDisplayName}
            counselorName={counselor.name}
            letter={letter}
            onClose={closeFlowLetter}
            sessionTitle={activeSession?.title}
          />
        )}
        {!letter && (
          <div className="consultation-letter-recovery" role="alert">
            <p>{t("room.letterUnknown")}</p>
            <div>
              <button onClick={() => void loadSessionLetter(activeSessionId)} type="button">{t("room.reloadStatus")}</button>
              <button onClick={closeFlowLetter} type="button">{t("room.backPrevious")}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section
      className={[
        "room-layout",
        // The counseling-room sidebar is always the floating icon rail; the
        // history panel overlays it and must not switch the room back to the
        // three-column expanded-sidebar grid (that crushes the conversation).
        "sidebar-collapsed",
        isSidebarCollapsed ? "" : "history-open",
        `room-layout-${counselor.id}`
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={t("room.aria").replace("{name}", counselor.name)}
      style={roomStyle}
    >
      <CounselingRoomSidebar
        controls={{
          hasActiveSession,
          isBusy,
          isBusyInAnotherSession,
          isSessionEnded,
          onReturnToLobby: () => {
            if (isBusy || isBusyInAnotherSession || flow?.surface.kind === "ending") return;
            if (flow) leaveForLobby();
            else setActivePage("lobby");
          },
          onToggleSessionEnded: () => {
            void toggleSessionFromSidebar();
          }
        }}
        onOpenSettings={openSettingsFromRoom}
        onRequestNewConsultation={requestNewConsultation}
      />
      <section className="conversation-panel">
        <CounselingRoomHeader title={activeSessionTitle} />
        {flowError && (
          <div className="consultation-session-error" role="alert">
            <span>{flowError}</span>
            <button aria-label={t("room.closeError")} onClick={clearFlowError} type="button">×</button>
          </div>
        )}
        {areMessagesLoading ? (
          <div className="conversation-load-state" role="status">
            <p>{t("room.loadingMessages")}</p>
            <div>
              <button onClick={() => void loadMessagesForSession(activeSessionId)} type="button">{t("room.reload")}</button>
              <button onClick={leaveForLobby} type="button">{t("room.backLobby")}</button>
            </div>
          </div>
        ) : (
          <CounselingRoomMessageStream
            activePreparation={activePreparation}
            activeSession={activeSession}
            activeSessionLetter={activeSessionLetter}
            counselorAvatarSrc={visualAssets.dialogueAvatar}
            counselorName={counselor.name}
            isSessionEnded={isSessionEnded}
            streamRef={streamRef}
            userAvatarSrc={userAvatarSrc}
            userDisplayName={userDisplayName}
            waitingActivityText={waitingActivityText}
            onCreateSession={() => void startNewConsultation()}
            onOpenLetter={openLetter}
            onRegenerateLetter={() => activeSession && void regenerateSessionLetter(activeSession.id)}
            onRetryMessage={retryMessage}
            onRetryPreparation={() => activeSession && void retryConsultationPreparation(activeSession.id)}
          />
        )}
        <CounselingRoomComposer
          attachmentAcceptValue={attachmentAcceptValue}
          attachmentError={attachmentError}
          attachmentNotice={attachmentNotice}
          draft={draft}
          fileInputRef={fileInputRef}
          hasActiveSession={hasActiveSession}
          isBusyInAnotherSession={isBusyInAnotherSession}
          isComposerDisabled={isComposerDisabled}
          isSendDisabled={isSendDisabled}
          isActiveSessionStreaming={isActiveSessionStreaming}
          isSessionEnded={isSessionEnded}
          pendingAttachments={pendingAttachments}
          onAttachmentChange={handleAttachmentChange}
          onCancelStreaming={cancelStreamingResponse}
          onDraftBlur={() => draft.trim().length > 0 ? markComposerActive() : clearComposerActivity()}
          onDraftChange={handleDraftChange}
          onDraftFocus={() => { if (draft.trim().length > 0) markComposerActive(); }}
          onDraftPaste={handleDraftPaste}
          onRemoveAttachment={removeAttachment}
          onSend={() => void handleSend()}
        />
      </section>
      <CounselingRoomStage counselorId={counselor.id} counselorName={counselor.name} status={visibleCounselorStatus} statusText={statusText} statusQuote={statusQuote} />
      {openedLetter && (
        <SessionLetterReader counselorName={counselor.name} clientDisplayName={clientDisplayName} letter={openedLetter} sessionTitle={activeSession?.title} onClose={() => setOpenedLetter(null)} />
      )}
      {isEndConfirmationOpen && (
        <ConsultationConfirmDialog
          cancelLabel={t("room.continueCurrent")}
          confirmLabel={t("room.confirmEnd")}
          message={t("room.endMessage")}
          onCancel={() => setIsEndConfirmationOpen(false)}
          onConfirm={() => {
            setIsEndConfirmationOpen(false);
            void requestEnd();
          }}
          title={t("room.endTitle")}
          tone="ending"
        />
      )}
      {newConsultationConfirmation && (
        <ConsultationConfirmDialog
          cancelLabel={t(newConsultationConfirmation === "sent" ? "room.continueCurrent" : "room.returnCheck")}
          confirmLabel={t(newConsultationConfirmation === "unsent-only" ? "room.clearAndStart" : "room.endAndStart")}
          message={newConsultationConfirmation === "unsent-only"
            ? t("room.newUnsentMessage")
            : newConsultationConfirmation === "sent-with-unsent"
              ? t("room.newMixedMessage")
              : t("room.newSentMessage")}
          onCancel={() => setNewConsultationConfirmation(null)}
          onConfirm={() => {
            setNewConsultationConfirmation(null);
            void startNewConsultation();
          }}
          title={t("room.newTitle")}
        />
      )}
    </section>
  );
}

function createAttachmentId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`;
}

async function preparePendingAttachments({
  attachments,
  modelName,
  sessionId
}: {
  attachments: PendingConsultationAttachment[];
  modelName: string;
  sessionId: string;
}): Promise<{ documents: ImportedDocument[]; attachments: MessageAttachmentReference[]; imageInputs: ModelImageInput[] }> {
  const createdAt = new Date().toISOString();
  const documents: ImportedDocument[] = [];
  const references: MessageAttachmentReference[] = [];
  const imageInputs: ModelImageInput[] = [];

  for (const attachment of attachments) {
    if (attachment.extension === "txt" || attachment.extension === "md") {
      const content = await readFileAsText(attachment.file);
      if (!content.trim()) throw new EmptyTextAttachmentError(attachment.name);
      const document = createImportedDocumentFromText({
        id: `doc-${Date.now()}-${documents.length}`,
        sessionId,
        title: attachment.name,
        content,
        createdAt
      });
      documents.push(document);
      references.push({
        id: document.id,
        title: document.title,
        contentLength: document.contentLength,
        kind: "text",
        status: "context-ready"
      });
      continue;
    }

    const isImage = isImageExtension(attachment.extension);
    const isImageContextReady = isImage && modelSupportsImageInput(modelName);
    if (isImageContextReady) {
      imageInputs.push({
        dataUrl: await readFileAsDataUrl(attachment.file),
        mimeType: imageMimeType(attachment.extension),
        name: attachment.name
      });
    }
    references.push({
      id: attachment.id,
      title: attachment.name,
      contentLength: attachment.size,
      kind: isImage ? "image" : "document",
      status: isImageContextReady ? "context-ready" : "record-only"
    });
  }

  return { documents, attachments: references, imageInputs };
}

class EmptyTextAttachmentError extends Error {
  constructor(readonly fileName: string) {
    super(`${fileName} is empty`);
    this.name = "EmptyTextAttachmentError";
  }
}

function isImageExtension(extension: string) {
  return extension === "png" || extension === "jpg" || extension === "jpeg" || extension === "gif" || extension === "webp";
}

function imageMimeType(extension: string): ModelImageInput["mimeType"] {
  if (extension === "png") return "image/png";
  if (extension === "gif") return "image/gif";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("image read failed"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File) {
  if (typeof file.text === "function") return file.text();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(file);
  });
}
