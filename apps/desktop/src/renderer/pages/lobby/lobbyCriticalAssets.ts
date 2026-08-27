import lobbyBackgroundUrl from "../../../../../../assets/runtime/lobby/waiting-room/redesign/waiting-room-summer-qstyle-selected-v1.png";
import quickNavAppointmentUrl from "../../../../../../assets/runtime/lobby/quick-nav/quick-nav-appointment-runtime-256w-v1.png";
import quickNavLettersUrl from "../../../../../../assets/runtime/lobby/quick-nav/quick-nav-letters-runtime-256w-v1.png";
import quickNavSettingsUrl from "../../../../../../assets/runtime/lobby/quick-nav/quick-nav-settings-runtime-256w-v1.png";
import quickNavSurfaceUrl from "../../../../../../assets/runtime/lobby/quick-nav/quick-nav-walnut-surface-v1.png";
import renxinDialogueEyesOpenUrl from "../../../../../../assets/runtime/lobby/receptionist/renxin/dialogue-legacy-production/hd-frames/eyes-open.png";
import renxinSceneBaseUrl from "../../../../../../assets/runtime/lobby/receptionist/renxin/redesign/scene-logo-production/layers/renxin-base.png";
import renxinSceneEyesOpenUrl from "../../../../../../assets/runtime/lobby/receptionist/renxin/redesign/scene-logo-production/layers/renxin-eyes-open.png";
import dialoguePanelUrl from "./reception/assets/final/dialogue-panel-clean-rounded-transparent-v1.png";
import dialoguePanelCenterUrl from "./reception/assets/final/dialogue-panel-slice-center-v1.png";
import dialoguePanelTopLeftUrl from "./reception/assets/final/dialogue-panel-slice-top-left-v1.png";
import dialoguePanelTopRightUrl from "./reception/assets/final/dialogue-panel-slice-top-right-v1.png";
import dialoguePanelBottomLeftUrl from "./reception/assets/final/dialogue-panel-slice-bottom-left-v1.png";
import dialoguePanelBottomRightUrl from "./reception/assets/final/dialogue-panel-slice-bottom-right-v1.png";
import dialogueNameplateUrl from "./reception/assets/final/nameplate-original-style-clean-v1.png";
import dialogueNameplateLogoUrl from "./reception/assets/final/nameplate-logo-oxblood-transparent-v1.png";
import { preloadImagesSequentially } from "../../media/imagePreload";
import { receptionCounselorAssets } from "./reception/receptionCounselorAssets";

export {
  lobbyBackgroundUrl,
  quickNavAppointmentUrl,
  quickNavLettersUrl,
  quickNavSettingsUrl,
  renxinDialogueEyesOpenUrl,
  renxinSceneBaseUrl,
  renxinSceneEyesOpenUrl
};

export function preloadLobbyCriticalAssets(showReceptionDialogue: boolean) {
  const urls = showReceptionDialogue
    ? [
        lobbyBackgroundUrl,
        receptionCounselorAssets.chengling.dialogue.staticUrl,
        dialoguePanelUrl,
        dialoguePanelCenterUrl,
        dialoguePanelTopLeftUrl,
        dialoguePanelTopRightUrl,
        dialoguePanelBottomLeftUrl,
        dialoguePanelBottomRightUrl,
        dialogueNameplateUrl,
        dialogueNameplateLogoUrl
      ]
    : [
        lobbyBackgroundUrl,
        receptionCounselorAssets.chengling.scene.default.url,
        quickNavSurfaceUrl,
        quickNavLettersUrl,
        quickNavAppointmentUrl,
        quickNavSettingsUrl
      ];
  return preloadImagesSequentially(urls);
}
