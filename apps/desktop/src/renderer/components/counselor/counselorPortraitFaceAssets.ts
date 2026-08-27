import chenglingDefaultEyesClosed from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/chengling/new-style-v1/default/chengling-default-eyes-closed-overlay-new-style-v1-cropped.png";
import chenglingListeningEyesClosed from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/chengling/new-style-v1/listening/chengling-listening-eyes-closed-overlay-new-style-v1-cropped.png";
import chenglingRespondingEyesClosed from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/chengling/new-style-v1/responding/chengling-responding-eyes-closed-overlay-new-style-v1-cropped.png";
import chenglingRespondingMouthSlight from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/chengling/new-style-v1/responding/chengling-responding-mouth-slight-overlay-new-style-v1-cropped.png";
import chenglingRespondingMouthOpen from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/chengling/new-style-v1/responding/chengling-responding-mouth-open-overlay-new-style-v1-cropped.png";
import zhouzhouDefaultEyesClosed from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/zhouzhou-user-selected-v2/default/zhouzhou-session-default-eyes-closed-overlay-user-selected-v2-cropped.png";
import zhouzhouDefaultMouthOpen from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/zhouzhou-user-selected-v2/default/zhouzhou-session-default-mouth-open-overlay-user-selected-v2-cropped.png";
import zhouzhouDefaultMouthSlight from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/zhouzhou-user-selected-v2/default/zhouzhou-session-default-mouth-slight-overlay-user-selected-v2-cropped.png";
import zhouzhouListeningEyesClosed from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/zhouzhou-user-selected-v2/listening/zhouzhou-session-listening-eyes-closed-overlay-user-selected-v2-cropped.png";
import zhouzhouListeningMouthOpen from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/zhouzhou-user-selected-v2/listening/zhouzhou-session-listening-mouth-open-overlay-user-selected-v2-cropped.png";
import zhouzhouListeningMouthSlight from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/zhouzhou-user-selected-v2/listening/zhouzhou-session-listening-mouth-slight-overlay-user-selected-v2-cropped.png";
import zhouzhouRespondingEyesClosed from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/zhouzhou-user-selected-v2/responding/zhouzhou-session-responding-eyes-closed-overlay-user-selected-v2-cropped.png";
import zhouzhouRespondingMouthOpen from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/zhouzhou-user-selected-v2/responding/zhouzhou-session-responding-mouth-open-overlay-user-selected-v2-cropped.png";
import zhouzhouRespondingMouthSlight from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/zhouzhou-user-selected-v2/responding/zhouzhou-session-responding-mouth-slight-overlay-user-selected-v2-cropped.png";
import linleshuiDefaultEyesClosed from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/linleshui/redesign-v1/default/linleshui-default-eyes-closed-overlay-redesign-v1-cropped.png";
import linleshuiListeningEyesClosed from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/linleshui/redesign-v1/listening/linleshui-listening-eyes-closed-overlay-redesign-v1-cropped.png";
import linleshuiRespondingEyesClosed from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/linleshui/redesign-v1/responding/linleshui-responding-eyes-closed-overlay-redesign-v1-cropped.png";
import linleshuiRespondingMouthSlight from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/linleshui/redesign-v1/responding/linleshui-responding-mouth-slight-overlay-redesign-v1-cropped.png";
import linleshuiRespondingMouthOpen from "../../../../../../assets/runtime/counselor-portrait-motion/face-motion/linleshui/redesign-v1/responding/linleshui-responding-mouth-open-overlay-redesign-v1-cropped.png";
import type { CounselorStatus } from "../../stores/sessionStore";
import { getBuiltinCounselorPackage } from "@shared/index";

type PortraitFacePose = "default" | "listening" | "responding";

export interface PortraitFaceAssets {
  eyesClosed: string;
  mouthSlight?: string;
  mouthOpen?: string;
}

export interface PortraitFaceFrameStyle {
  height: string;
  left: string;
  top: string;
  width: string;
}

type PortraitFaceCrop = readonly [x: number, y: number, width: number, height: number, canvasWidth: number, canvasHeight: number];

const faceCropBySource = new Map<string, PortraitFaceCrop>([
  [chenglingDefaultEyesClosed, [488, 257, 182, 125, 1024, 1536]],
  [chenglingListeningEyesClosed, [460, 254, 193, 137, 1024, 1536]],
  [chenglingRespondingEyesClosed, [488, 249, 188, 127, 1024, 1536]],
  [chenglingRespondingMouthOpen, [540, 325, 120, 90, 1024, 1536]],
  [chenglingRespondingMouthSlight, [540, 325, 120, 90, 1024, 1536]],
  [linleshuiDefaultEyesClosed, [469, 224, 165, 85, 1024, 1536]],
  [linleshuiListeningEyesClosed, [453, 264, 171, 94, 1024, 1536]],
  [linleshuiRespondingEyesClosed, [473, 217, 170, 91, 1024, 1536]],
  [linleshuiRespondingMouthOpen, [526, 283, 90, 69, 1024, 1536]],
  [linleshuiRespondingMouthSlight, [528, 287, 86, 62, 1024, 1536]],
  [zhouzhouDefaultEyesClosed, [781, 387, 364, 183, 2048, 3072]],
  [zhouzhouDefaultMouthOpen, [892, 542, 177, 101, 2048, 3072]],
  [zhouzhouDefaultMouthSlight, [892, 542, 177, 101, 2048, 3072]],
  [zhouzhouListeningEyesClosed, [767, 368, 361, 184, 2048, 3072]],
  [zhouzhouListeningMouthOpen, [882, 515, 166, 105, 2048, 3072]],
  [zhouzhouListeningMouthSlight, [882, 515, 166, 105, 2048, 3072]],
  [zhouzhouRespondingEyesClosed, [784, 356, 353, 151, 2048, 3072]],
  [zhouzhouRespondingMouthOpen, [887, 480, 167, 101, 2048, 3072]],
  [zhouzhouRespondingMouthSlight, [887, 480, 167, 101, 2048, 3072]]
]);

function percentage(value: number, total: number) {
  return `${(value / total) * 100}%`;
}

export function getCounselorPortraitFaceFrameStyle(source: string): PortraitFaceFrameStyle | undefined {
  const crop = faceCropBySource.get(source);
  if (!crop) return undefined;
  const [x, y, width, height, canvasWidth, canvasHeight] = crop;
  return {
    height: percentage(height, canvasHeight),
    left: percentage(x, canvasWidth),
    top: percentage(y, canvasHeight),
    width: percentage(width, canvasWidth)
  };
}

const facePoseByStatus: Record<CounselorStatus, PortraitFacePose> = {
  idle: "default",
  listening: "listening",
  connecting: "responding",
  thinking: "responding",
  streaming: "responding",
  error: "default"
};

const faceAssetsByPortraitResource: Partial<Record<string, Record<PortraitFacePose, PortraitFaceAssets>>> = {
  "builtin://chengling/portrait": {
    default: { eyesClosed: chenglingDefaultEyesClosed },
    listening: { eyesClosed: chenglingListeningEyesClosed },
    responding: {
      eyesClosed: chenglingRespondingEyesClosed,
      mouthSlight: chenglingRespondingMouthSlight,
      mouthOpen: chenglingRespondingMouthOpen
    }
  },
  "builtin://zhouzhou/portrait": {
    default: {
      eyesClosed: zhouzhouDefaultEyesClosed,
      mouthSlight: zhouzhouDefaultMouthSlight,
      mouthOpen: zhouzhouDefaultMouthOpen
    },
    listening: {
      eyesClosed: zhouzhouListeningEyesClosed,
      mouthSlight: zhouzhouListeningMouthSlight,
      mouthOpen: zhouzhouListeningMouthOpen
    },
    responding: {
      eyesClosed: zhouzhouRespondingEyesClosed,
      mouthSlight: zhouzhouRespondingMouthSlight,
      mouthOpen: zhouzhouRespondingMouthOpen
    }
  },
  "builtin://linleshui/portrait": {
    default: { eyesClosed: linleshuiDefaultEyesClosed },
    listening: { eyesClosed: linleshuiListeningEyesClosed },
    responding: {
      eyesClosed: linleshuiRespondingEyesClosed,
      mouthSlight: linleshuiRespondingMouthSlight,
      mouthOpen: linleshuiRespondingMouthOpen
    }
  }
};

export function getCounselorPortraitFaceAssets(counselorId: string, status: CounselorStatus): PortraitFaceAssets | undefined {
  const portraitResource = getBuiltinCounselorPackage(counselorId)?.visuals.portrait;
  return portraitResource ? faceAssetsByPortraitResource[portraitResource]?.[facePoseByStatus[status]] : undefined;
}
