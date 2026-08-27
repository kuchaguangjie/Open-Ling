import chenglingSceneChoosingUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/chengling/choosing.png";
import chenglingSceneDefaultUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/chengling/default.png";
import chenglingSceneSpeakingUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/chengling/speaking.png";
import chenglingSceneChoosingEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/chengling/face-motion/choosing-eyes-closed-overlay.png";
import chenglingSceneDefaultEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/chengling/face-motion/default-eyes-closed-overlay.png";
import chenglingSceneSpeakingEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/chengling/face-motion/speaking-eyes-closed-overlay.png";
import linleshuiSceneChoosingUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/linleshui/choosing.png";
import linleshuiSceneDefaultUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/linleshui/default.png";
import linleshuiSceneSpeakingUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/linleshui/speaking.png";
import linleshuiSceneChoosingEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/linleshui/face-motion/choosing-eyes-closed-overlay.png";
import linleshuiSceneDefaultEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/linleshui/face-motion/default-eyes-closed-overlay.png";
import linleshuiSceneSpeakingEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/linleshui/face-motion/speaking-eyes-closed-overlay.png";
import zhouzhouSceneChoosingUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/zhouzhou/choosing.png";
import zhouzhouSceneDefaultUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/zhouzhou/default.png";
import zhouzhouSceneSpeakingUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/zhouzhou/speaking.png";
import zhouzhouSceneChoosingEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/zhouzhou/face-motion/choosing-eyes-closed-overlay.png";
import zhouzhouSceneDefaultEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/zhouzhou/face-motion/default-eyes-closed-overlay.png";
import zhouzhouSceneSpeakingEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-scene/zhouzhou/face-motion/speaking-eyes-closed-overlay.png";
import chenglingDialogueStaticUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-dialogue/chengling/transparent/chengling-dialogue-explain-static-hook-clean-transparent-v1.png";
import linleshuiDialogueStaticUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-dialogue/linleshui/static.png";
import zhouzhouDialogueStaticUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-dialogue/zhouzhou/static.png";
import chenglingDialogueEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-dialogue/chengling/face-motion/eyes-closed-overlay.png";
import chenglingDialogueMouthOpenUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-dialogue/chengling/face-motion/mouth-open-overlay.png";
import chenglingDialogueMouthSlightUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-dialogue/chengling/face-motion/mouth-slight-overlay.png";
import linleshuiDialogueEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-dialogue/linleshui/face-motion/eyes-closed-overlay.png";
import linleshuiDialogueMouthOpenUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-dialogue/linleshui/face-motion/mouth-open-overlay.png";
import linleshuiDialogueMouthSlightUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-dialogue/linleshui/face-motion/mouth-slight-overlay.png";
import zhouzhouDialogueEyesClosedUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-dialogue/zhouzhou/face-motion/eyes-closed-overlay.png";
import zhouzhouDialogueMouthOpenUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-dialogue/zhouzhou/face-motion/mouth-open-overlay.png";
import zhouzhouDialogueMouthSlightUrl from "../../../../../../../assets/runtime/lobby/receptionist/production-dialogue/zhouzhou/face-motion/mouth-slight-overlay.png";

export type ReceptionCounselorId = "chengling" | "linleshui" | "zhouzhou";
export type ReceptionSceneState = "choosing" | "default" | "speaking";

type Placement = { scale: number; x: number; y: number };
type ReceptionCounselorAsset = {
  dialogue: {
    eyesClosedUrl: string;
    mouthOpenUrl: string;
    mouthSlightUrl: string;
    staticUrl: string;
    placement: Placement;
  };
  scene: Record<ReceptionSceneState, { eyesClosedUrl: string; placement: Placement; url: string }>;
};

export const receptionCounselorAssets: Record<ReceptionCounselorId, ReceptionCounselorAsset> = {
  chengling: {
    dialogue: {
      eyesClosedUrl: chenglingDialogueEyesClosedUrl,
      mouthOpenUrl: chenglingDialogueMouthOpenUrl,
      mouthSlightUrl: chenglingDialogueMouthSlightUrl,
      placement: { scale: 119, x: -6, y: 22.5 },
      staticUrl: chenglingDialogueStaticUrl
    },
    scene: {
      choosing: { eyesClosedUrl: chenglingSceneChoosingEyesClosedUrl, placement: { scale: 150, x: 0, y: 0 }, url: chenglingSceneChoosingUrl },
      default: { eyesClosedUrl: chenglingSceneDefaultEyesClosedUrl, placement: { scale: 134, x: -1.5, y: 9 }, url: chenglingSceneDefaultUrl },
      speaking: { eyesClosedUrl: chenglingSceneSpeakingEyesClosedUrl, placement: { scale: 157, x: 0, y: 0 }, url: chenglingSceneSpeakingUrl }
    }
  },
  linleshui: {
    dialogue: {
      eyesClosedUrl: linleshuiDialogueEyesClosedUrl,
      mouthOpenUrl: linleshuiDialogueMouthOpenUrl,
      mouthSlightUrl: linleshuiDialogueMouthSlightUrl,
      placement: { scale: 121, x: -12.5, y: 20.5 },
      staticUrl: linleshuiDialogueStaticUrl
    },
    scene: {
      choosing: { eyesClosedUrl: linleshuiSceneChoosingEyesClosedUrl, placement: { scale: 150, x: 0, y: 5.5 }, url: linleshuiSceneChoosingUrl },
      default: { eyesClosedUrl: linleshuiSceneDefaultEyesClosedUrl, placement: { scale: 150, x: 0, y: 9 }, url: linleshuiSceneDefaultUrl },
      speaking: { eyesClosedUrl: linleshuiSceneSpeakingEyesClosedUrl, placement: { scale: 154, x: 0, y: 0 }, url: linleshuiSceneSpeakingUrl }
    }
  },
  zhouzhou: {
    dialogue: {
      eyesClosedUrl: zhouzhouDialogueEyesClosedUrl,
      mouthOpenUrl: zhouzhouDialogueMouthOpenUrl,
      mouthSlightUrl: zhouzhouDialogueMouthSlightUrl,
      placement: { scale: 118, x: -9.5, y: 18.5 },
      staticUrl: zhouzhouDialogueStaticUrl
    },
    scene: {
      choosing: { eyesClosedUrl: zhouzhouSceneChoosingEyesClosedUrl, placement: { scale: 150, x: 0, y: 0 }, url: zhouzhouSceneChoosingUrl },
      default: { eyesClosedUrl: zhouzhouSceneDefaultEyesClosedUrl, placement: { scale: 150, x: 0, y: 0 }, url: zhouzhouSceneDefaultUrl },
      speaking: { eyesClosedUrl: zhouzhouSceneSpeakingEyesClosedUrl, placement: { scale: 145, x: 0, y: 2.5 }, url: zhouzhouSceneSpeakingUrl }
    }
  }
};

export function isReceptionCounselorId(value: string): value is ReceptionCounselorId {
  return value === "chengling" || value === "linleshui" || value === "zhouzhou";
}

export function resolveReceptionCounselorId(value: string): ReceptionCounselorId {
  return isReceptionCounselorId(value) ? value : "chengling";
}

const deskMask = { center: 96, left: 95.5, right: 93 };
const deskMaskControlY = 2 * deskMask.center - (deskMask.left + deskMask.right) / 2;
const deskMaskPoints = Array.from({ length: 11 }, (_, index) => {
  const t = index / 10;
  const y = ((1 - t) ** 2 * deskMask.left) + (2 * (1 - t) * t * deskMaskControlY) + (t ** 2 * deskMask.right);
  return { x: index * 10, y: Math.min(100, Math.max(65, y)) };
});

export const receptionDeskClipPath = `polygon(0 0, 100% 0, ${[...deskMaskPoints]
  .reverse()
  .map(({ x, y }) => `${x}% ${y}%`)
  .join(", ")})`;
