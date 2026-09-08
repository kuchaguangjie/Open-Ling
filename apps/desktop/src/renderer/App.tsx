import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { UserSettings } from "@shared/index";
import { AppShell } from "./components/layout/AppShell";
import {
  LaunchOnboardingFlow,
  markLaunchOnboardingComplete,
  readLaunchOnboardingComplete,
  shouldShowLaunchOnboarding,
  type LaunchOnboardingStep
} from "./features/launch-onboarding";
import { StartupLoadingScreen, type StartupLoadingPhase } from "./features/startup-loading";
import {
  getStartupDelayBeforeReady,
  STARTUP_ASSET_PRELOAD_TIMEOUT_MS,
  STARTUP_DESTINATION_MOUNT_DELAY_MS,
  STARTUP_EXIT_DURATION_MS,
  STARTUP_PHASE_MIN_VISIBLE_MS,
  STARTUP_READY_HOLD_MS
} from "./features/startup-loading/startupTiming";
import { applyReadingAppearance } from "./features/reading-appearance/readingAppearance";
import { AccessLockScreen } from "./features/access-lock/AccessLockScreen";
import { CounselingRoomPage } from "./pages/CounselingRoomPage";
import { CounselorsPage } from "./pages/CounselorsPage";
import { preloadCounselorSessionAssets } from "./components/counselor/counselorPortraitAssets";
import {
  preloadCounselorClosingAssets,
  preloadCounselorFlowAssets
} from "./flows/consultation/counselorFlowAssets";
import { LobbyPage } from "./pages/lobby/LobbyPage";
import { preloadLobbyCriticalAssets } from "./pages/lobby/lobbyCriticalAssets";
import { readWelcomeSeen } from "./pages/lobby/lobbyStorage";
import { MemoryPage } from "./pages/MemoryPage";
import { SettingsPage } from "./features/settings";
import { useAppStore } from "./stores/appStore";
import { useConsultationFlowStore } from "./flows/consultation/consultationFlowStore";
import { hasPendingConsultationInput } from "./flows/consultation/consultationLeaveGuard";
import { useSessionStore } from "./stores/sessionStore";
import { useSettingsStore } from "./stores/settingsStore";
import { translate } from "./localization";
import { AppUpdateNotice } from "./features/app-update/AppUpdateNotice";
import { preloadLaunchWelcomeAssets } from "./features/launch-welcome/LaunchWelcomeShell";

const DialogueStageDesignDemoPage = import.meta.env.DEV
  ? lazy(() => import("./devtools/DialogueStageDesignDemoPage").then((module) => ({
      default: module.DialogueStageDesignDemoPage
    })))
  : null;
const SidebarDesignDemoPage = import.meta.env.DEV
  ? lazy(() => import("./devtools/SidebarDesignDemoPage").then((module) => ({
      default: module.SidebarDesignDemoPage
    })))
  : null;
const PortraitCutoutQaPage = import.meta.env.DEV
  ? lazy(() => import("./devtools/PortraitCutoutQaPage").then((module) => ({
      default: module.PortraitCutoutQaPage
    })))
  : null;
const CounselorIntroductionQaPage = import.meta.env.DEV
  ? lazy(() => import("./devtools/CounselorIntroductionQaPage").then((module) => ({
      default: module.CounselorIntroductionQaPage
    })))
  : null;

export function App() {
  const activePage = useAppStore((state) => state.activePage);
  const query = new URLSearchParams(window.location.search);
  const showConsentPreview = import.meta.env.DEV && query.get("qa-consent") === "1";
  const showLaunchReview = import.meta.env.DEV && query.get("qa-launch-review") === "1";
  const showPortraitCutoutQa = import.meta.env.DEV && query.get("portrait-cutout-qa") === "1";
  const showCounselorIntroductionQa = import.meta.env.DEV && query.get("counselor-introduction-qa") === "1";
  const requestedSessionPreviewCounselorId = query.get("actual-session-preview");
  const actualSessionPreviewCounselorId = import.meta.env.DEV &&
    requestedSessionPreviewCounselorId !== null &&
    ["chengling", "zhouzhou", "linleshui"].includes(requestedSessionPreviewCounselorId)
    ? requestedSessionPreviewCounselorId
    : undefined;
  const qaOnboardingStep = import.meta.env.DEV ? readQaOnboardingStep(query.get("qa-onboarding")) : undefined;
  const skipStartupPresentation = import.meta.env.MODE === "test" || showConsentPreview || showPortraitCutoutQa || showCounselorIntroductionQa || Boolean(actualSessionPreviewCounselorId) || Boolean(qaOnboardingStep);
  const dialogueDemoPhase = query.get("dialogue-demo");
  const sidebarDemoVariant = query.get("sidebar-demo");
  const settingsOriginPage = useAppStore((state) => state.settingsOriginPage);
  const visiblePage = activePage === "settings" ? settingsOriginPage : activePage;
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const readingAppearance = useSettingsStore((state) => state.appearance);
  const locale = useSettingsStore((state) => state.locale);
  const shouldShowRestore =
    typeof window.lingDesktop?.sessions?.list === "function" &&
    typeof window.lingDesktop?.messages?.listBySessionId === "function";
  const [isRestoring, setIsRestoring] = useState(shouldShowRestore);
  const [restoreError, setRestoreError] = useState<string>();
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [startupPhase, setStartupPhase] = useState<StartupLoadingPhase>("opening");
  const [startupExiting, setStartupExiting] = useState(false);
  const [showStartupLoading, setShowStartupLoading] = useState(!skipStartupPresentation);
  const [launchView, setLaunchView] = useState<"onboarding" | "app" | null>(
    qaOnboardingStep ? "onboarding" : skipStartupPresentation ? "app" : null
  );
  const [accessLockState, setAccessLockState] = useState<"checking" | "setup" | "locked" | "unlocked">(
    skipStartupPresentation ? "unlocked" : "checking"
  );
  const [isBrowsingBeforeSetup, setIsBrowsingBeforeSetup] = useState(false);
  const [isAccessLockPromptVisible, setIsAccessLockPromptVisible] = useState(false);
  const actualSessionPreviewStartedRef = useRef(false);

  useEffect(() => {
    if (!actualSessionPreviewCounselorId || actualSessionPreviewStartedRef.current) return;
    actualSessionPreviewStartedRef.current = true;
    void useSessionStore.getState().createSession({ counselorId: actualSessionPreviewCounselorId }).then((created) => {
      if (!created) return;
      const sessionId = useSessionStore.getState().activeSessionId;
      if (!sessionId) return;
      useConsultationFlowStore.getState().openActiveSession({
        counselorId: actualSessionPreviewCounselorId,
        sessionId
      });
    });
  }, [actualSessionPreviewCounselorId]);

  useEffect(() => {
    applyReadingAppearance(readingAppearance);
  }, [readingAppearance]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (skipStartupPresentation) {
      setAccessLockState("unlocked");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await window.lingDesktop?.accessLock?.status();
        if (!cancelled) {
          const status = result?.ok ? result.data : { enabled: false, configured: false, unlocked: false };
          if (!status.unlocked && !status.enabled && !status.configured && window.lingDesktop?.accessLock?.initializeDevice) {
            const initialized = await window.lingDesktop.accessLock.initializeDevice();
            if (!cancelled && initialized.ok) setAccessLockState("unlocked");
            else if (!cancelled) setAccessLockState("setup");
            return;
          }
          setAccessLockState(status.unlocked ? "unlocked" : !status.enabled ? "setup" : "locked");
        }
      } catch {
        if (!cancelled) setAccessLockState("unlocked");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [skipStartupPresentation]);

  useEffect(() => {
    if (accessLockState !== "locked" || skipStartupPresentation) return;
    let cancelled = false;
    void (async () => {
      await waitForPreload(preloadLaunchWelcomeAssets(), STARTUP_ASSET_PRELOAD_TIMEOUT_MS);
      if (cancelled) return;
      await wait(STARTUP_PHASE_MIN_VISIBLE_MS);
      if (cancelled) return;
      setStartupPhase("ready");
      await wait(STARTUP_READY_HOLD_MS);
      if (cancelled) return;
      setIsAccessLockPromptVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessLockState, skipStartupPresentation]);

  useEffect(() => {
    if (accessLockState !== "setup" || skipStartupPresentation) return;
    let cancelled = false;
    void (async () => {
      await wait(STARTUP_PHASE_MIN_VISIBLE_MS);
      if (cancelled) return;
      setStartupPhase("ready");
      await wait(STARTUP_READY_HOLD_MS);
      if (cancelled) return;
      setLaunchView("onboarding");
      await wait(STARTUP_DESTINATION_MOUNT_DELAY_MS);
      if (cancelled) return;
      setStartupExiting(true);
      await wait(STARTUP_EXIT_DURATION_MS);
      if (!cancelled) setShowStartupLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessLockState, skipStartupPresentation]);

  useEffect(() => {
    if (accessLockState !== "unlocked") return;
    let cancelled = false;
    void (async () => {
      const startedAt = Date.now();
      let storedSettings: UserSettings | null = null;
      let restoreFailed = false;
      if (shouldShowRestore && !isBrowsingBeforeSetup) setIsRestoring(true);
      setRestoreError(undefined);
      try {
        if (!skipStartupPresentation) await wait(STARTUP_PHASE_MIN_VISIBLE_MS);
        if (cancelled) return;
        const storedFlow = useConsultationFlowStore.getState().restore();
        storedSettings = await loadSettings();
        if (useSettingsStore.getState().status === "error") {
          throw new Error("Settings could not be restored");
        }
        if (storedSettings) useSessionStore.getState().applyUserSettings(storedSettings);
        if (!skipStartupPresentation) setStartupPhase("reading-sessions");
        const [loaded] = await Promise.all([
          useSessionStore.getState().loadPersistedSessions(storedFlow?.sessionId),
          skipStartupPresentation ? Promise.resolve() : wait(STARTUP_PHASE_MIN_VISIBLE_MS)
        ]);
        if (cancelled) return;
        if (!loaded.ok) {
          restoreFailed = true;
          setRestoreError(loaded.message);
        } else {
          useConsultationFlowStore.getState().restoreAndReconcile();
        }
      } catch {
        restoreFailed = true;
        if (!cancelled) setRestoreError(translate(locale, "startup.restoreError"));
      } finally {
        if (cancelled) return;
        if (shouldShowRestore) setIsRestoring(false);
        if (isBrowsingBeforeSetup) setIsBrowsingBeforeSetup(false);

        if (!skipStartupPresentation) {
          const sessions = useSessionStore.getState().sessions;
          const hasSeenLobbyWelcome = readWelcomeSeen();
          const showOnboarding = !restoreFailed && (showLaunchReview || shouldShowLaunchOnboarding({
            completed: readLaunchOnboardingComplete(),
            legacyWelcomeSeen: hasSeenLobbyWelcome,
            sessionCount: sessions.length,
            settings: storedSettings
          }));
          if (!showOnboarding && !restoreFailed) markLaunchOnboardingComplete();

          const destinationPreparation = showOnboarding
            ? waitForPreload(preloadLaunchWelcomeAssets(), STARTUP_ASSET_PRELOAD_TIMEOUT_MS)
            : restoreFailed
              ? Promise.resolve()
            : waitForPreload(
                preloadStartupDestination(!hasSeenLobbyWelcome),
                STARTUP_ASSET_PRELOAD_TIMEOUT_MS
              );
          await Promise.all([
            wait(getStartupDelayBeforeReady(startedAt)),
            destinationPreparation
          ]);
          if (cancelled) return;
          setStartupPhase("ready");
          await wait(STARTUP_READY_HOLD_MS);
          if (cancelled) return;
          setLaunchView(showOnboarding ? "onboarding" : "app");
          await wait(STARTUP_DESTINATION_MOUNT_DELAY_MS);
          if (cancelled) return;
          setStartupExiting(true);
          await wait(STARTUP_EXIT_DURATION_MS);
          if (!cancelled) setShowStartupLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessLockState, loadSettings, restoreAttempt, shouldShowRestore, showLaunchReview, skipStartupPresentation]);

  useEffect(() => {
    return window.lingDesktop?.app?.onSessionChanged?.((sessionId) => {
      void useSessionStore.getState().refreshSessionFromDesktop(sessionId).then(() => {
        const flow = useConsultationFlowStore.getState().flow;
        if (useAppStore.getState().activePage === "room" && flow?.sessionId === sessionId) {
          useConsultationFlowStore.getState().restoreAndReconcile();
        }
      });
    });
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingConsultationInput() && !useSessionStore.getState().activeStreamRequestId) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const completeOnboarding = () => {
    markLaunchOnboardingComplete();
    void preloadLobbyCriticalAssets(!readWelcomeSeen());
    if (accessLockState === "setup") {
      setIsBrowsingBeforeSetup(true);
      setIsRestoring(false);
    } else {
      setAccessLockState("unlocked");
    }
    setLaunchView("app");
  };

  if (SidebarDesignDemoPage && (sidebarDemoVariant === "minimal" || sidebarDemoVariant === "wood")) {
    return <Suspense fallback={null}><SidebarDesignDemoPage variant={sidebarDemoVariant} /></Suspense>;
  }

  if (PortraitCutoutQaPage && showPortraitCutoutQa) {
    return <Suspense fallback={null}><PortraitCutoutQaPage /></Suspense>;
  }

  if (CounselorIntroductionQaPage && showCounselorIntroductionQa) {
    return <Suspense fallback={null}><CounselorIntroductionQaPage /></Suspense>;
  }

  if (DialogueStageDesignDemoPage && (
    dialogueDemoPhase === "opening" || dialogueDemoPhase === "closing" || dialogueDemoPhase === "session"
  )) {
    return <Suspense fallback={null}><DialogueStageDesignDemoPage phase={dialogueDemoPhase} /></Suspense>;
  }

  return (
    <AppShell>
      <div className="app-launch-stack">
        <div className="app-launch-destination">
          {launchView === "onboarding" ? (
            <LaunchOnboardingFlow
              initialStep={qaOnboardingStep}
              onComplete={completeOnboarding}
              onSecuritySetupComplete={() => setAccessLockState("unlocked")}
            />
          ) : launchView === "app" ? (
            restoreError ? (
              <section aria-label={translate(locale, "startup.restoreErrorAria")} className="app-startup-placeholder app-startup-error">
                <h1>{translate(locale, "startup.restoreErrorTitle")}</h1>
                <p role="alert">{restoreError}</p>
                <button onClick={() => setRestoreAttempt((attempt) => attempt + 1)} type="button">{translate(locale, "startup.retry")}</button>
              </section>
            ) : isRestoring && !isBrowsingBeforeSetup ? (
              <section aria-label={translate(locale, "startup.restoringAria")} className="app-startup-placeholder">{translate(locale, "startup.restoring")}</section>
            ) : showConsentPreview ? <LobbyPage consentPreview /> : (
              <>
                <AppUpdateNotice />
                <div className="app-page-transition" key={visiblePage}>
                  {visiblePage === "lobby" && (
                    <LobbyPage
                      onSecuritySetupComplete={() => setAccessLockState("unlocked")}
                      requiresSecuritySetup={accessLockState === "setup"}
                    />
                  )}
                  {visiblePage === "room" && <CounselingRoomPage />}
                  {visiblePage === "counselors" && <CounselorsPage />}
                  {visiblePage === "memory" && <MemoryPage />}
                </div>
                {activePage === "settings" && <SettingsPage />}
              </>
            )
          ) : null}
        </div>

        {showStartupLoading && (
          <div className="app-launch-loading">
            <StartupLoadingScreen exiting={startupExiting} phase={startupPhase} />
          </div>
        )}
        {isAccessLockPromptVisible && accessLockState === "locked" && (
          <AccessLockScreen onUnlocked={() => {
            setIsAccessLockPromptVisible(false);
            setAccessLockState("unlocked");
          }} />
        )}
      </div>
    </AppShell>
  );
}

function readQaOnboardingStep(value: string | null): LaunchOnboardingStep | undefined {
  return value === "welcome" || value === "security" || value === "model" ? value : undefined;
}

function wait(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

async function waitForPreload(task: Promise<void>, timeout: number) {
  await Promise.race([
    task.catch(() => undefined),
    wait(timeout)
  ]);
}

function preloadStartupDestination(showReceptionDialogue: boolean) {
  if (useAppStore.getState().activePage !== "room") {
    return preloadLobbyCriticalAssets(showReceptionDialogue);
  }

  const flow = useConsultationFlowStore.getState().flow;
  const activeSessionId = useSessionStore.getState().activeSessionId;
  const activeSession = useSessionStore.getState().sessions.find((session) => session.id === activeSessionId);
  const counselorId = flow?.counselorId ?? activeSession?.counselorId;
  if (!counselorId) return Promise.resolve();

  if (
    flow?.surface.kind === "arrival" ||
    flow?.surface.kind === "opening" ||
    flow?.surface.kind === "starting" ||
    flow?.surface.kind === "cancelling"
  ) {
    return preloadCounselorFlowAssets(counselorId);
  }
  if (
    flow?.surface.kind === "ending" ||
    flow?.surface.kind === "closing" ||
    flow?.surface.kind === "closing-menu" ||
    flow?.surface.kind === "letter"
  ) {
    return preloadCounselorClosingAssets(counselorId);
  }
  return preloadCounselorSessionAssets(counselorId, "immediate");
}
