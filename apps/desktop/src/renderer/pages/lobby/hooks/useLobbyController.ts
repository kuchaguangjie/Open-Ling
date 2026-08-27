import { useEffect, useRef, useState } from "react";
import { defaultCounselors, getDefaultCounselors } from "@shared/index";
import { preloadCounselorSessionAssets } from "../../../components/counselor/counselorPortraitAssets";
import { isDevBrowserPreview } from "../../../devBrowserPreview";
import { preloadCounselorFlowAssets } from "../../../flows/consultation/counselorFlowAssets";
import { getOpeningPrivacyAssurance, splitDialogueSentences } from "../../../flows/consultation/counselorFlowContent";
import {
  hasConfirmedCurrentInformedConsent,
  markInformedConsentConfirmed
} from "../../../flows/consultation/informedConsentStorage";
import { useConsultationFlowStore } from "../../../flows/consultation/consultationFlowStore";
import { compareEndedSessionsNewestFirst } from "../../../flows/consultation/sessionLifecycleOrdering";
import { useAppStore } from "../../../stores/appStore";
import { useSettingsStore } from "../../../stores/settingsStore";
import { useSessionStore } from "../../../stores/sessionStore";
import { getDialogueScripts } from "../content/dialogueContent";
import { getReceptionSmallTalkItems, type ReceptionSmallTalkItem } from "../content/smallTalkContent";
import { translate } from "../../../localization";
import type { LobbyFeatureId } from "../features/lobbyFeatureRegistry";
import type { DialogueFlow, DialogueOption, GardenWeather } from "../lobbyContracts";
import {
  getLocalDateKey,
  hasSeenReceptionCounselor,
  markReceptionHandoffShown,
  markReceptionCounselorSeen,
  markSmallTalkPrivacySeen,
  markWelcomeSeen,
  readReceptionDutyState,
  readWelcomeSeen,
  rememberSmallTalkTopic,
  writeReceptionDutyState,
  type ReceptionCounselorId,
  type ReceptionDutyState
} from "../lobbyStorage";

type ReceptionDutySession = {
  counselorId: string;
  id: string;
  status: "active" | "draft" | "ended";
};

export function selectReceptionDutyCounselor(
  sessions: readonly ReceptionDutySession[],
  activeSessionId: string,
  now = new Date()
) {
  const today = getLocalDateKey(now);
  const roster = defaultCounselors.map((counselor) => counselor.id as ReceptionCounselorId);
  const stored = readReceptionDutyState();
  const firstVisitDate = stored?.firstVisitDate ?? today;
  const isFirstVisitDay = firstVisitDate === today;
  const anchor = new Date(2026, 7, 17);
  const dayIndex = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - anchor.getTime()) / 86_400_000);
  const scheduledCounselorId = isFirstVisitDay
    ? "chengling"
    : roster[((dayIndex % roster.length) + roster.length) % roster.length];
  const state: ReceptionDutyState = stored?.dutyDate === today
    ? stored
    : {
        version: 1,
        firstVisitDate,
        dutyDate: today,
        dutyCounselorId: scheduledCounselorId,
        recentSmallTalkTopicIds: stored?.recentSmallTalkTopicIds ?? [],
        seenReceptionCounselorIds: stored?.seenReceptionCounselorIds ?? [],
        smallTalkPrivacySeen: stored?.smallTalkPrivacySeen ?? false
      };

  const activeCounselorIds = new Set(
    sessions.filter((session) => session.status === "active").map((session) => session.counselorId)
  );
  const activeSessionCounselorId = sessions.find(
    (session) => session.id === activeSessionId && session.status === "active"
  )?.counselorId;
  if (state.dutyCounselorId === activeSessionCounselorId || activeCounselorIds.has(state.dutyCounselorId)) {
    const currentIndex = roster.indexOf(state.dutyCounselorId);
    const nextAvailable = roster
      .map((_, offset) => roster[(currentIndex + offset + 1) % roster.length])
      .find((counselorId) => !activeCounselorIds.has(counselorId));
    if (nextAvailable) {
      state.handoffFromCounselorId = state.dutyCounselorId;
      state.dutyCounselorId = nextAvailable;
    }
  }
  writeReceptionDutyState(state);
  return state.dutyCounselorId;
}

function handoffReceptionIfNeeded(counselorId: string, sessionId: string) {
  const state = readReceptionDutyState();
  if (!state || state.dutyCounselorId !== counselorId) return;
  const roster = defaultCounselors.map((counselor) => counselor.id as ReceptionCounselorId);
  const currentIndex = roster.indexOf(counselorId as ReceptionCounselorId);
  const nextCounselorId = roster[(currentIndex + 1) % roster.length];
  writeReceptionDutyState({
    ...state,
    handoffFromCounselorId: counselorId as ReceptionCounselorId,
    handoffSessionId: sessionId,
    handoffShownSessionId: undefined,
    dutyCounselorId: nextCounselorId
  });
}

export function useLobbyController({
  onSecuritySetupComplete,
  requiresSecuritySetup = false
}: {
  onSecuritySetupComplete?: () => void;
  requiresSecuritySetup?: boolean;
} = {}) {
  const setActivePage = useAppStore((state) => state.setActivePage);
  const consultationRequest = useAppStore((state) => state.consultationRequest);
  const clearConsultationRequest = useAppStore((state) => state.clearConsultationRequest);
  const createDraftSession = useSessionStore((state) => state.createDraftSession);
  const getCounselorVisitCount = useSessionStore((state) => state.getCounselorVisitCount);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sessions = useSessionStore((state) => state.sessions);
  const openDraftSession = useConsultationFlowStore((state) => state.openDraftSession);
  const openPersistedSession = useConsultationFlowStore((state) => state.openPersistedSession);
  const api = useSettingsStore((state) => state.api);
  const locale = useSettingsStore((state) => state.locale);
  const [dialogueFlow, setDialogueFlow] = useState<DialogueFlow | null>(() => {
    if (!readWelcomeSeen()) return "firstVisit";
    const duty = readReceptionDutyState();
    return duty?.handoffSessionId && duty.handoffSessionId !== duty.handoffShownSessionId ? "handoff" : null;
  });
  const [dialogueLineIndex, setDialogueLineIndex] = useState(0);
  const [showDialogueChoices, setShowDialogueChoices] = useState(false);
  const [activeFeatureId, setActiveFeatureId] = useState<LobbyFeatureId | null>(null);
  const [selectedCounselorId, setSelectedCounselorId] = useState(defaultCounselors[0].id);
  const [receptionCounselorId] = useState(() => selectReceptionDutyCounselor(sessions, activeSessionId));
  const [smallTalkItem, setSmallTalkItem] = useState<ReceptionSmallTalkItem | null>(null);
  const [inGarden, setInGarden] = useState(false);
  const [weather, setWeather] = useState<GardenWeather>("sunny");
  const [pendingBookingCounselorId, setPendingBookingCounselorId] = useState<string | null>(null);
  const [showModelConnection, setShowModelConnection] = useState(false);
  const [showInformedConsent, setShowInformedConsent] = useState(false);
  const [showSecuritySetup, setShowSecuritySetup] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const bookingOperationRef = useRef(0);

  useEffect(() => () => {
    bookingOperationRef.current += 1;
  }, []);

  useEffect(() => {
    if (!consultationRequest) return;
    markWelcomeSeen();
    setSelectedCounselorId(consultationRequest.counselorId);
    setDialogueFlow(null);
    setShowDialogueChoices(false);
    setActiveFeatureId("booking");
    clearConsultationRequest();
  }, [clearConsultationRequest, consultationRequest]);

  const dismissDialogue = () => {
    markWelcomeSeen();
    setDialogueFlow(null);
    setShowDialogueChoices(false);
  };

  const startDialogueFlow = (flow: DialogueFlow) => {
    setSmallTalkItem(null);
    setDialogueFlow(flow);
    setDialogueLineIndex(0);
    setShowDialogueChoices(false);
  };

  const startSmallTalk = () => {
    const hasEndedSession = sessions.some((session) => session.status === "ended");
    const duty = readReceptionDutyState();
    const isFirstSmallTalk = !duty?.smallTalkPrivacySeen;
    const items = getReceptionSmallTalkItems(locale, receptionCounselorId, { hasEndedSession });
    const available = items.filter((item) => !duty?.recentSmallTalkTopicIds.includes(item.id));
    const candidates = available.length > 0 ? available : items;
    const preferredTopic = {
      chengling: "studio",
      zhouzhou: "booking",
      linleshui: "garden"
    }[receptionCounselorId];
    const preferredItem = candidates.find((candidate) => candidate.topic === preferredTopic);
    const randomItem = candidates[Math.min(Math.floor(Math.random() * candidates.length), candidates.length - 1)];
    const item = preferredItem ?? randomItem;
    if (!item) {
      startDialogueFlow("returning");
      return;
    }
    const lines = isFirstSmallTalk
      ? [
          ...splitDialogueSentences([
            getOpeningPrivacyAssurance("first", api.connectionKind ?? "remote", locale)
          ]),
          ...item.lines
        ]
      : item.lines;
    rememberSmallTalkTopic(item.id);
    setSmallTalkItem({ ...item, lines });
    if (isFirstSmallTalk) markSmallTalkPrivacySeen();
    setDialogueFlow("smallTalk");
    setDialogueLineIndex(0);
    setShowDialogueChoices(false);
  };

  const openDialogue = () => {
    setActiveFeatureId(null);
    startDialogueFlow(hasSeenReceptionCounselor(receptionCounselorId) ? "returning" : "firstVisit");
  };

  const openFeature = (featureId: LobbyFeatureId, counselorId?: string) => {
    markWelcomeSeen();
    setDialogueFlow(null);
    setShowDialogueChoices(false);
    if (counselorId) setSelectedCounselorId(counselorId);
    setActiveFeatureId(featureId);
  };

  const beginNewConsultation = async (counselorId: string) => {
    if (isBooking) return;
    const operationId = bookingOperationRef.current + 1;
    bookingOperationRef.current = operationId;
    setIsBooking(true);
    setBookingError(null);
    setShowInformedConsent(false);
    setShowModelConnection(false);
    try {
      const priorVisitCount = await getCounselorVisitCount(counselorId);
      const result = await createDraftSession({ counselorId });
      if (bookingOperationRef.current !== operationId) {
        return;
      }
      if (!result.ok) {
        setBookingError(result.message);
        setShowInformedConsent(false);
        setActiveFeatureId("booking");
        return;
      }
      setPendingBookingCounselorId(null);
      setShowInformedConsent(false);
      handoffReceptionIfNeeded(counselorId, result.sessionId);
      openDraftSession({
        counselorId,
        sessionId: result.sessionId,
        script: priorVisitCount === 0 ? "first" : priorVisitCount === 1 ? "second" : "returning"
      });
    } catch {
      if (bookingOperationRef.current === operationId) {
        setBookingError(translate(locale, "booking.createError"));
        setActiveFeatureId("booking");
      }
    } finally {
      if (bookingOperationRef.current === operationId) setIsBooking(false);
    }
  };

  const resolveBookingIntent = async (counselorId: string) => {
    const activeSession = sessions.find((session) => session.counselorId === counselorId && session.status === "active");
    if (activeSession) {
      setShowInformedConsent(false);
      setPendingBookingCounselorId(null);
      handoffReceptionIfNeeded(counselorId, activeSession.id);
      openPersistedSession({ counselorId, sessionId: activeSession.id, status: "active" });
      return;
    }
    const draftSession = sessions.find((session) => session.counselorId === counselorId && session.status === "draft");
    if (draftSession) {
      const priorVisitCount = await getCounselorVisitCount(counselorId).catch(() => 2);
      setShowInformedConsent(false);
      setPendingBookingCounselorId(null);
      handoffReceptionIfNeeded(counselorId, draftSession.id);
      openPersistedSession({
        counselorId,
        sessionId: draftSession.id,
        script: priorVisitCount === 0 ? "first" : priorVisitCount === 1 ? "second" : "returning",
        status: "draft"
      });
      return;
    }
    await beginNewConsultation(counselorId);
  };

  const continueBookingPreparation = (counselorId: string) => {
    if (
      !isDevBrowserPreview() &&
      api.connectionKind !== "local" &&
      !api.apiKeySaved &&
      !api.apiKey?.trim()
    ) {
      setDialogueFlow(null);
      setShowDialogueChoices(false);
      setShowModelConnection(true);
      return;
    }
    if (hasConfirmedCurrentInformedConsent(counselorId)) {
      void resolveBookingIntent(counselorId);
      return;
    }
    setDialogueFlow(null);
    setShowDialogueChoices(false);
    setShowInformedConsent(true);
  };

  const bookAndEnterRoom = (counselorId: string) => {
    if (isBooking) return;
    const hasActiveSession = sessions.some(
      (session) => session.counselorId === counselorId && session.status === "active"
    );
    if (hasActiveSession) {
      preloadCounselorSessionAssets(counselorId, "immediate");
    } else {
      preloadCounselorFlowAssets(counselorId);
      preloadCounselorSessionAssets(counselorId);
    }
    setSelectedCounselorId(counselorId);
    setPendingBookingCounselorId(counselorId);
    setBookingError(null);
    setActiveFeatureId(null);
    if (requiresSecuritySetup) {
      setDialogueFlow(null);
      setShowDialogueChoices(false);
      setShowSecuritySetup(true);
      return;
    }
    continueBookingPreparation(counselorId);
  };

  const cancelSecuritySetup = () => {
    bookingOperationRef.current += 1;
    setShowSecuritySetup(false);
    setPendingBookingCounselorId(null);
    setBookingError(null);
    setActiveFeatureId("booking");
  };

  const completeSecuritySetup = () => {
    if (!pendingBookingCounselorId) return;
    const counselorId = pendingBookingCounselorId;
    setShowSecuritySetup(false);
    onSecuritySetupComplete?.();
    continueBookingPreparation(counselorId);
  };

  const skipSecuritySetup = () => {
    if (!pendingBookingCounselorId) return;
    const counselorId = pendingBookingCounselorId;
    setShowSecuritySetup(false);
    continueBookingPreparation(counselorId);
  };

  const cancelInformedConsent = () => {
    bookingOperationRef.current += 1;
    setIsBooking(false);
    setShowInformedConsent(false);
    setShowModelConnection(false);
    setPendingBookingCounselorId(null);
    setBookingError(null);
    setDialogueFlow(null);
    setShowDialogueChoices(false);
    setActiveFeatureId("booking");
  };

  const cancelModelConnection = () => {
    bookingOperationRef.current += 1;
    setIsBooking(false);
    setShowModelConnection(false);
    setPendingBookingCounselorId(null);
    setBookingError(null);
    setActiveFeatureId("booking");
  };

  const completeModelConnection = () => {
    if (!pendingBookingCounselorId) return;
    setShowModelConnection(false);
    if (hasConfirmedCurrentInformedConsent(pendingBookingCounselorId)) {
      void resolveBookingIntent(pendingBookingCounselorId);
      return;
    }
    setShowInformedConsent(true);
  };

  const confirmInformedConsent = () => {
    if (!pendingBookingCounselorId || isBooking) return;
    markInformedConsentConfirmed(pendingBookingCounselorId);
    void resolveBookingIntent(pendingBookingCounselorId);
  };

  const openLatestEndedConsultation = (counselorId: string) => {
    const latestEnded = sessions
      .filter((session) => session.counselorId === counselorId && session.status === "ended")
      .sort(compareEndedSessionsNewestFirst)[0];
    if (!latestEnded) return;
    bookingOperationRef.current += 1;
    setIsBooking(false);
    setBookingError(null);
    setActiveFeatureId(null);
    openPersistedSession({
      counselorId,
      sessionId: latestEnded.id,
      status: "ended"
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      if (showSecuritySetup) {
        cancelSecuritySetup();
        return;
      }
      if (showInformedConsent) {
        cancelInformedConsent();
        return;
      }
      if (showModelConnection) {
        cancelModelConnection();
        return;
      }
      if (inGarden) {
        setInGarden(false);
        return;
      }
      if (activeFeatureId) {
        bookingOperationRef.current += 1;
        setIsBooking(false);
        setActiveFeatureId(null);
        return;
      }
      if (dialogueFlow === "consentIntro") {
        setPendingBookingCounselorId(null);
        setDialogueFlow(null);
        setActiveFeatureId("booking");
        return;
      }
      if (dialogueFlow) startDialogueFlow("returning");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFeatureId, dialogueFlow, inGarden, showInformedConsent, showModelConnection, showSecuritySetup]);

  const receptionCounselorName = getDefaultCounselors(locale).find((counselor) => counselor.id === receptionCounselorId)?.name;
  const handoffFromCounselorId = readReceptionDutyState()?.handoffFromCounselorId;
  const handoffFromCounselorName = getDefaultCounselors(locale).find((counselor) => counselor.id === handoffFromCounselorId)?.name;
  const isFirstReceptionMeeting = !hasSeenReceptionCounselor(receptionCounselorId);
  const dialogueScript = dialogueFlow
    ? getDialogueScripts(locale, receptionCounselorId, receptionCounselorName, handoffFromCounselorName, isFirstReceptionMeeting)[dialogueFlow]
    : null;
  const dialogueLines = dialogueFlow === "smallTalk" ? smallTalkItem?.lines ?? [] : dialogueScript?.lines ?? [];
  const dialogueText = dialogueLines[Math.min(dialogueLineIndex, dialogueLines.length - 1)] ?? "";

  const completeDialogueFlow = () => {
    if (!dialogueFlow) return;
    if (dialogueFlow === "firstVisit" || dialogueFlow === "returning" || dialogueFlow === "handoff") {
      markWelcomeSeen();
      markReceptionCounselorSeen(receptionCounselorId);
      if (dialogueFlow === "handoff") markReceptionHandoffShown();
      setShowDialogueChoices(true);
      return;
    }
    if (dialogueFlow === "tour") {
      dismissDialogue();
      return;
    }
    if (dialogueFlow === "counselors") {
      openFeature("counselors");
      return;
    }
    if (dialogueFlow === "booking") {
      openFeature("booking");
      return;
    }
    if (dialogueFlow === "consentIntro") {
      setDialogueFlow(null);
      setShowDialogueChoices(false);
      setShowInformedConsent(true);
      return;
    }
    if (dialogueFlow === "smallTalk") {
      setShowDialogueChoices(true);
      return;
    }
    dismissDialogue();
  };

  const advanceDialogue = () => {
    if (dialogueLines.length === 0) return;
    if (dialogueLineIndex < dialogueLines.length - 1) {
      setDialogueLineIndex((current) => current + 1);
      return;
    }
    completeDialogueFlow();
  };

  const dialogueOptions: DialogueOption[] = dialogueFlow === "smallTalk"
    ? [
        { label: translate(locale, "reception.smallTalk.more"), onSelect: startSmallTalk },
        { label: translate(locale, "reception.smallTalk.done"), onSelect: dismissDialogue }
      ]
    : [
        { label: translate(locale, "reception.book"), onSelect: () => openFeature("booking") },
        { label: translate(locale, "reception.tour"), onSelect: () => startDialogueFlow("tour") },
        { label: translate(locale, "reception.smallTalk"), onSelect: startSmallTalk },
        {
          label: translate(locale, dialogueFlow === "firstVisit" ? "reception.browse" : "reception.notNow"),
          onSelect: dismissDialogue
        }
      ];

  return {
    activeFeatureId,
    advanceDialogue,
    bookingError,
    bookAndEnterRoom,
    cancelSecuritySetup,
    cancelModelConnection,
    cancelInformedConsent,
    closeFeature: () => {
      bookingOperationRef.current += 1;
      setIsBooking(false);
      setActiveFeatureId(null);
    },
    dialogueFlow,
    dialogueOptions,
    dialogueText,
    inGarden,
    isBooking,
    openDialogue,
    openFeature,
    openGarden: () => setInGarden(true),
    openLatestEndedConsultation,
    openSettings: () => setActivePage("settings"),
    receptionCounselorId,
    selectedCounselorId,
    setSelectedCounselorId,
    skipSecuritySetup,
    showInformedConsent,
    showModelConnection,
    showSecuritySetup,
    confirmInformedConsent,
    completeModelConnection,
    completeSecuritySetup,
    showDialogueChoices,
    weather,
    closeGarden: () => setInGarden(false),
    toggleWeather: () => setWeather((current) => (current === "sunny" ? "rainy" : "sunny"))
  };
}
