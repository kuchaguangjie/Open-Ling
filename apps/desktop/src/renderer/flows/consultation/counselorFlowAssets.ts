import chenglingOpeningBackground from "../../../../../../assets/runtime/counseling-room-backgrounds/v2/chengling/opening/chengling-opening-psychoanalytic-room-final-v1.png";
import chenglingSessionBackground from "../../../../../../assets/runtime/counseling-room-backgrounds/v2/chengling/session/chengling-session-one-chair-room-final-v2.png";
import zhouzhouOpeningBackground from "../../../../../../assets/runtime/counseling-room-backgrounds/v2/zhouzhou/opening/zhouzhou-opening-bright-structured-room-final-v1.png";
import zhouzhouSessionBackground from "../../../../../../assets/runtime/counseling-room-backgrounds/v2/zhouzhou/session/zhouzhou-session-one-chair-room-final-v1.png";
import linleshuiRoomBackground from "../../../../../../assets/runtime/q-style-counselor-art-v1/rooms/linleshui-sunny-lakeside-v1.png";

import chenglingOpeningNewStyle from "../../../../../../assets/runtime/counselor-opening-portraits/chengling/new-style-v1/chengling-opening-welcome-closed-mouth-transparent-v1.png";
import chenglingClosingNewStyle from "../../../../../../assets/runtime/counselor-opening-portraits/chengling/new-style-v1/chengling-closing-folded-hands-transparent-clean-v2.png";
import chenglingOpeningEyesClosedOverlay from "../../../../../../assets/runtime/counselor-opening-portraits/chengling/new-style-v1/face-motion/opening/chengling-opening-welcome-eyes-closed-overlay-v1.png";
import chenglingOpeningMouthSlightOverlay from "../../../../../../assets/runtime/counselor-opening-portraits/chengling/new-style-v1/face-motion/opening/chengling-opening-welcome-mouth-slight-overlay-v1.png";
import chenglingOpeningMouthOpenOverlay from "../../../../../../assets/runtime/counselor-opening-portraits/chengling/new-style-v1/face-motion/opening/chengling-opening-welcome-mouth-open-overlay-v1.png";
import chenglingClosingEyesClosedOverlay from "../../../../../../assets/runtime/counselor-opening-portraits/chengling/new-style-v1/face-motion/closing/chengling-closing-folded-hands-eyes-closed-overlay-v1.png";
import chenglingClosingMouthSlightOverlay from "../../../../../../assets/runtime/counselor-opening-portraits/chengling/new-style-v1/face-motion/closing/chengling-closing-folded-hands-mouth-slight-overlay-v1.png";
import chenglingClosingMouthOpenOverlay from "../../../../../../assets/runtime/counselor-opening-portraits/chengling/new-style-v1/face-motion/closing/chengling-closing-folded-hands-mouth-open-overlay-v1.png";

import zhouzhouOpeningNeutral from "../../../../../../assets/runtime/counselor-opening-portraits/zhouzhou/user-selected-v4/zhouzhou-opening-welcome-halfbody-neutral-transparent-v4.png";
import zhouzhouClosingNeutral from "../../../../../../assets/runtime/counselor-opening-portraits/zhouzhou/user-selected-v4/zhouzhou-closing-relaxed-halfbody-neutral-transparent-v4.png";

import linleshuiOpeningNeutral from "../../../../../../assets/runtime/counselor-opening-portraits/linleshui/redesign-v1/linleshui-opening-halfbody-inviting-cup-neutral-transparent-v1.png";
import linleshuiOpeningEyesHalf from "../../../../../../assets/runtime/counselor-opening-portraits/linleshui/redesign-v1/linleshui-opening-halfbody-inviting-cup-eyes-half-transparent-v1.png";
import linleshuiOpeningEyesClosed from "../../../../../../assets/runtime/counselor-opening-portraits/linleshui/redesign-v1/linleshui-opening-halfbody-inviting-cup-eyes-closed-transparent-v1.png";
import linleshuiOpeningMouthSlight from "../../../../../../assets/runtime/counselor-opening-portraits/linleshui/redesign-v1/linleshui-opening-halfbody-inviting-cup-mouth-slight-transparent-v1.png";
import linleshuiOpeningMouthOpen from "../../../../../../assets/runtime/counselor-opening-portraits/linleshui/redesign-v1/linleshui-opening-halfbody-inviting-cup-mouth-open-transparent-v1.png";
import linleshuiClosingNeutral from "../../../../../../assets/runtime/counselor-opening-portraits/linleshui/redesign-v1/linleshui-closing-halfbody-two-hand-cup-neutral-transparent-v1.png";
import linleshuiClosingEyesHalf from "../../../../../../assets/runtime/counselor-opening-portraits/linleshui/redesign-v1/linleshui-closing-halfbody-two-hand-cup-eyes-half-transparent-v1.png";
import linleshuiClosingEyesClosed from "../../../../../../assets/runtime/counselor-opening-portraits/linleshui/redesign-v1/linleshui-closing-halfbody-two-hand-cup-eyes-closed-transparent-v1.png";
import linleshuiClosingMouthSlight from "../../../../../../assets/runtime/counselor-opening-portraits/linleshui/redesign-v1/linleshui-closing-halfbody-two-hand-cup-mouth-slight-transparent-v1.png";
import linleshuiClosingMouthOpen from "../../../../../../assets/runtime/counselor-opening-portraits/linleshui/redesign-v1/linleshui-closing-halfbody-two-hand-cup-mouth-open-transparent-v1.png";
import { preloadImagesSequentially, preloadImagesWhenIdle } from "../../media/imagePreload";
import { builtinCounselorPackages, counselorPackageRegistry, getBuiltinCounselorPackage } from "@shared/index";
import { getHostedCounselorVisualUrl } from "../../counselors/hostedCounselorPackages";

export type CounselorFaceState = "neutral" | "eyes-half" | "eyes-closed" | "mouth-slight" | "mouth-open";
export type CounselorFaceFrames = Record<CounselorFaceState, string>;
export interface CounselorFaceOverlays {
  eyesClosed: string;
  mouthSlight: string;
  mouthOpen: string;
}

export interface CounselorFlowAssets {
  openingRoomBackground: string;
  sessionRoomBackground: string;
  openingPortraitFrames: CounselorFaceFrames;
  closingPortraitFrames: CounselorFaceFrames;
  openingPortraitOverlays?: CounselorFaceOverlays;
  closingPortraitOverlays?: CounselorFaceOverlays;
}

function frames(neutral: string, eyesHalf: string, eyesClosed: string, mouthSlight: string, mouthOpen: string): CounselorFaceFrames {
  return {
    neutral,
    "eyes-half": eyesHalf,
    "eyes-closed": eyesClosed,
    "mouth-slight": mouthSlight,
    "mouth-open": mouthOpen
  };
}

function staticFrames(portrait: string): CounselorFaceFrames {
  return frames(portrait, portrait, portrait, portrait, portrait);
}

const flowAssetsByResourceId: Record<string, CounselorFlowAssets> = {
  "builtin://chengling/opening-sequence": {
    openingRoomBackground: chenglingOpeningBackground,
    sessionRoomBackground: chenglingSessionBackground,
    openingPortraitFrames: staticFrames(chenglingOpeningNewStyle),
    closingPortraitFrames: staticFrames(chenglingClosingNewStyle),
    openingPortraitOverlays: {
      eyesClosed: chenglingOpeningEyesClosedOverlay,
      mouthSlight: chenglingOpeningMouthSlightOverlay,
      mouthOpen: chenglingOpeningMouthOpenOverlay
    },
    closingPortraitOverlays: {
      eyesClosed: chenglingClosingEyesClosedOverlay,
      mouthSlight: chenglingClosingMouthSlightOverlay,
      mouthOpen: chenglingClosingMouthOpenOverlay
    }
  },
  "builtin://zhouzhou/opening-sequence": {
    openingRoomBackground: zhouzhouOpeningBackground,
    sessionRoomBackground: zhouzhouSessionBackground,
    openingPortraitFrames: frames(zhouzhouOpeningNeutral, zhouzhouOpeningNeutral, zhouzhouOpeningNeutral, zhouzhouOpeningNeutral, zhouzhouOpeningNeutral),
    closingPortraitFrames: frames(zhouzhouClosingNeutral, zhouzhouClosingNeutral, zhouzhouClosingNeutral, zhouzhouClosingNeutral, zhouzhouClosingNeutral)
  },
  "builtin://linleshui/opening-sequence": {
    openingRoomBackground: linleshuiRoomBackground,
    sessionRoomBackground: linleshuiRoomBackground,
    openingPortraitFrames: frames(linleshuiOpeningNeutral, linleshuiOpeningEyesHalf, linleshuiOpeningEyesClosed, linleshuiOpeningMouthSlight, linleshuiOpeningMouthOpen),
    closingPortraitFrames: frames(linleshuiClosingNeutral, linleshuiClosingEyesHalf, linleshuiClosingEyesClosed, linleshuiClosingMouthSlight, linleshuiClosingMouthOpen)
  }
};

export const counselorFlowAssets: Record<string, CounselorFlowAssets> = Object.fromEntries(
  builtinCounselorPackages.flatMap((manifest) => {
    const resourceId = manifest.visuals.openingSequence;
    const assets = resourceId ? flowAssetsByResourceId[resourceId] : undefined;
    return assets ? [[manifest.id, assets]] : [];
  })
);

export function getCounselorFlowAssets(counselorId: string) {
  if (counselorPackageRegistry.get(counselorId)?.source.kind === "host") {
    const portrait = getHostedCounselorVisualUrl(counselorId, "portrait");
    const room = getHostedCounselorVisualUrl(counselorId, "room");
    const hostedStaticFrames = staticFrames(portrait);
    return {
      openingRoomBackground: room,
      sessionRoomBackground: room,
      openingPortraitFrames: hostedStaticFrames,
      closingPortraitFrames: hostedStaticFrames
    };
  }
  const resourceId = getBuiltinCounselorPackage(counselorId)?.visuals.openingSequence;
  return resourceId ? flowAssetsByResourceId[resourceId] : undefined;
}

export function preloadCounselorFlowAssets(counselorId: string) {
  const assets = getCounselorFlowAssets(counselorId);
  if (!assets) return Promise.resolve();
  const openingFrames = Object.values(assets.openingPortraitFrames);
  const openingOverlays = Object.values(assets.openingPortraitOverlays ?? {});
  const criticalPreload = preloadImagesSequentially([
    assets.openingRoomBackground,
    assets.openingPortraitFrames.neutral
  ]);
  void criticalPreload.then(() => preloadImagesWhenIdle([
    ...openingFrames.filter((url) => url !== assets.openingPortraitFrames.neutral),
    ...openingOverlays,
    assets.sessionRoomBackground
  ]));
  return criticalPreload;
}

export function preloadCounselorClosingAssets(counselorId: string) {
  const assets = getCounselorFlowAssets(counselorId);
  if (!assets) return Promise.resolve();
  const closingFrames = Object.values(assets.closingPortraitFrames);
  const closingOverlays = Object.values(assets.closingPortraitOverlays ?? {});
  const criticalPreload = preloadImagesSequentially([
    assets.openingRoomBackground,
    assets.closingPortraitFrames.neutral
  ]);
  void criticalPreload.then(() => preloadImagesWhenIdle(
    [
      ...closingFrames.filter((url) => url !== assets.closingPortraitFrames.neutral),
      ...closingOverlays
    ]
  ));
  return criticalPreload;
}
