import { SessionList } from "../../../components/session/SessionList";
import "./sidebar.css";
import { useLingua } from "../../../localization/useLingua";

export interface CounselingRoomSidebarControls {
  hasActiveSession: boolean;
  isBusy: boolean;
  isBusyInAnotherSession: boolean;
  isSessionEnded: boolean;
  onReturnToLobby: () => void;
  onToggleSessionEnded: () => void;
}

export function CounselingRoomSidebar({
  controls,
  onOpenSettings,
  onRequestNewConsultation
}: {
  controls?: CounselingRoomSidebarControls;
  onOpenSettings: () => void;
  onRequestNewConsultation: () => void;
}) {
  const { t } = useLingua();
  const roomActions = controls ? (
    <div className="sidebar-session-actions" aria-label={t("sidebar.roomActions")}>
      <button
        aria-label={t("room.backLobby")}
        className="room-return-lobby"
        disabled={controls.isBusy || controls.isBusyInAnotherSession}
        onClick={controls.onReturnToLobby}
        type="button"
      >
        <span aria-hidden="true" className="room-action-icon return">↩</span>
        <span>{t("common.back")}</span>
        <span className="room-action-tooltip" role="tooltip"><strong>{t("room.backLobby")}</strong><small>{t("sidebar.returnHint")}</small></span>
      </button>
      <button
        aria-label={t(controls.isSessionEnded ? "sidebar.continueSession" : "sidebar.endSession")}
        className="session-end-button"
        disabled={!controls.hasActiveSession || controls.isBusy || controls.isBusyInAnotherSession}
        onClick={controls.onToggleSessionEnded}
        type="button"
      >
        <span aria-hidden="true" className="room-action-icon end" />
        <span>{t(controls.isSessionEnded ? "common.continue" : "sidebar.end")}</span>
        <span className="room-action-tooltip" role="tooltip"><strong>{t(controls.isSessionEnded ? "sidebar.continueSession" : "sidebar.endSession")}</strong><small>{t(controls.isSessionEnded ? "sidebar.continueHint" : "sidebar.endHint")}</small></span>
      </button>
    </div>
  ) : undefined;

  return (
    <SessionList
      onOpenSettings={onOpenSettings}
      onRequestNewConsultation={onRequestNewConsultation}
      roomActions={roomActions}
    />
  );
}
