import { getDefaultCounselors } from "@shared/index";
import { getCounselorVisualAssets } from "../../../components/counselor/counselorPortraitAssets";
import { useAppStore } from "../../../stores/appStore";
import { useSessionStore } from "../../../stores/sessionStore";
import { useSettingsStore } from "../../../stores/settingsStore";

/**
 * The only consulting-room module that reads shared stores. Visual modules
 * receive stable values and commands from the page instead of importing stores.
 */
export function useCounselingRoomController() {
  const setActivePage = useAppStore((state) => state.setActivePage);
  const session = useSessionStore();
  const userAvatarSrc = useSettingsStore((state) => state.profile.avatarDataUrl);
  const clientDisplayName = useSettingsStore((state) => state.profile.displayName);
  const locale = useSettingsStore((state) => state.locale);
  const counselors = getDefaultCounselors(locale);
  const counselor = counselors.find((item) => item.id === session.currentCounselorId) ?? counselors[0];
  const activeSession = session.sessions.find((item) => item.id === session.activeSessionId);

  return {
    activeSessionId: session.activeSessionId,
    activeStreamRequestId: session.activeStreamRequestId,
    activeStreamSessionId: session.activeStreamSessionId,
    counselorStatus: session.counselorStatus,
    isSidebarCollapsed: session.isSidebarCollapsed,
    cancelStreamingResponse: session.cancelStreamingResponse,
    loadConsultationPreparation: session.loadConsultationPreparation,
    loadMessagesForSession: session.loadMessagesForSession,
    loadSessionLetter: session.loadSessionLetter,
    regenerateSessionLetter: session.regenerateSessionLetter,
    retryConsultationPreparation: session.retryConsultationPreparation,
    retryMessage: session.retryMessage,
    sendPrototypeMessage: session.sendPrototypeMessage,
    activeSession,
    activeSessionLetter: session.sessionLettersBySessionId[session.activeSessionId],
    activePreparation: session.consultationPreparationsBySessionId[session.activeSessionId],
    clientDisplayName,
    counselor,
    setActivePage,
    userAvatarSrc,
    visualAssets: getCounselorVisualAssets(counselor.id)
  };
}
