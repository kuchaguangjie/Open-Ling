import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { LobbyFeatureId } from "../features/lobbyFeatureRegistry";
import { LobbyHotspotLayer } from "../interaction/LobbyHotspotLayer";
import { lobbyBackgroundUrl } from "../lobbyCriticalAssets";
import { preloadLobbyFeatureAssets, preloadLobbyFeatureShellAssets } from "../lobbyFeatureAssets";
import { LobbyQuickNav } from "./LobbyQuickNav";
import { ReceptionCounselorScenePortrait } from "./ReceptionCounselorScenePortrait";
import type { ReceptionSceneState } from "../reception/receptionCounselorAssets";
import "./lobby-shell.css";
import { useLingua } from "../../../localization/useLingua";

export function LobbyStage({
  children,
  dialogueActive,
  onOpenDialogue,
  onOpenFeature,
  onOpenGarden,
  onOpenSettings,
  receptionCounselorId = "chengling",
  receptionCounselorName,
  receptionState = "default",
  showReceptionPortrait
}: {
  children: ReactNode;
  dialogueActive: boolean;
  onOpenDialogue: () => void;
  onOpenFeature: (featureId: LobbyFeatureId, counselorId?: string) => void;
  onOpenGarden: () => void;
  onOpenSettings: () => void;
  receptionCounselorId?: string;
  receptionCounselorName?: string;
  receptionState?: ReceptionSceneState;
  showReceptionPortrait?: boolean;
}) {
  const { t } = useLingua();
  const resolvedReceptionCounselorName = receptionCounselorName ?? t("common.counselor");
  const shouldShowReceptionPortrait = showReceptionPortrait ?? !dialogueActive;
  useEffect(() => {
    // The lobby mounts beneath the startup curtain; wait until its exit motion
    // has finished before spending decode time on secondary workspaces.
    const preloadTimerId = window.setTimeout(() => {
      void preloadLobbyFeatureShellAssets();
    }, 600);
    return () => window.clearTimeout(preloadTimerId);
  }, []);

  const prepareFeature = (featureId: LobbyFeatureId, counselorId?: string) => {
    if (featureId !== "bookcase" && featureId !== "booking" && featureId !== "counselors" && featureId !== "letters") return;
    void preloadLobbyFeatureAssets(featureId, counselorId);
  };

  return (
    <section className="lobby-page" aria-label={t("lobby.waitingRoom")}>
      <div className="lobby-stage-shell">
        <div
          className={dialogueActive ? "lobby-stage is-dialogue-active" : "lobby-stage"}
          style={{ "--lobby-background": `url(${lobbyBackgroundUrl})` } as CSSProperties}
        >
          <div aria-hidden="true" className="lobby-stage-backdrop" />
          <div className="lobby-scene-canvas" style={{ backgroundImage: `url(${lobbyBackgroundUrl})` }}>
            <div aria-hidden="true" className="lobby-sun-dapple" />
            {shouldShowReceptionPortrait && (
              <ReceptionCounselorScenePortrait counselorId={receptionCounselorId} counselorName={resolvedReceptionCounselorName} state={receptionState} />
            )}
            <LobbyHotspotLayer
              disabled={dialogueActive}
              onOpenDialogue={onOpenDialogue}
              onOpenFeature={onOpenFeature}
              onOpenGarden={onOpenGarden}
              onPrepareFeature={prepareFeature}
            />
          </div>

          {!dialogueActive && (
            <LobbyQuickNav
              onOpenFeature={onOpenFeature}
              onOpenSettings={onOpenSettings}
              onPrepareFeature={prepareFeature}
            />
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
