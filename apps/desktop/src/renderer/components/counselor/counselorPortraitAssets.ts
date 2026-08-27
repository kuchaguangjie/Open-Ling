import chenglingDefaultPortrait from "../../../../../../assets/runtime/counselor-portrait-motion/chengling/white-mosaic-v1/chengling-default-new-style-transparent-clean-v6.png";
import chenglingListeningPortrait from "../../../../../../assets/runtime/counselor-portrait-motion/chengling/white-mosaic-v1/chengling-listening-cheek-new-style-transparent-clean-v10.png";
import chenglingExpressionPortrait from "../../../../../../assets/runtime/counselor-portrait-motion/chengling/white-mosaic-v1/chengling-responding-new-style-transparent-clean-v9.png";
import chenglingDialogueAvatar from "../../../../../../assets/runtime/counselor-dialogue-avatars/chengling/chengling-dialogue-avatar-runtime-256-v1.png";
import chenglingRoomBackground from "../../../../../../assets/runtime/counselor-portrait-motion/chengling/backgrounds/chengling-warm-fireplace-study-background-v1.png";
import linleshuiDefaultPortrait from "../../../../../../assets/runtime/counselor-portrait-motion/linleshui/redesign-v1/linleshui-default-present-white-speck-clean-transparent-v3.png";
import linleshuiListeningPortrait from "../../../../../../assets/runtime/counselor-portrait-motion/linleshui/redesign-v1/linleshui-listening-user-input-white-speck-clean-transparent-v3.png";
import linleshuiRespondingPortrait from "../../../../../../assets/runtime/counselor-portrait-motion/linleshui/redesign-v1/linleshui-responding-thinking-white-speck-clean-transparent-v3.png";
import linleshuiRoomBackground from "../../../../../../assets/runtime/q-style-counselor-art-v1/rooms/linleshui-sunny-lakeside-v1.png";
import linleshuiDialogueAvatar from "../../../../../../assets/runtime/counselor-dialogue-avatars/linleshui/user-selected/linleshui-dialogue-avatar-runtime-256-v1.png";
import zhouzhouDefaultPortrait from "../../../../../../assets/runtime/counselor-portrait-motion/zhouzhou/user-selected-v2/zhouzhou-session-default-runtime-1280w-v1.png";
import zhouzhouListeningPortrait from "../../../../../../assets/runtime/counselor-portrait-motion/zhouzhou/user-selected-v4/zhouzhou-session-listening-runtime-1280w-v1.png";
import zhouzhouRespondingPortrait from "../../../../../../assets/runtime/counselor-portrait-motion/zhouzhou/user-selected-v2/zhouzhou-session-responding-runtime-1280w-v1.png";
import zhouzhouRoomBackground from "../../../../../../assets/runtime/counselor-portrait-motion/zhouzhou/current/zhouzhou-wide-room-background-v2.png";
import zhouzhouDialogueAvatar from "../../../../../../assets/runtime/counselor-dialogue-avatars/zhouzhou/user-selected/zhouzhou-dialogue-avatar-runtime-256-v1.png";
import type { CounselorStatus } from "../../stores/sessionStore";
import { preloadImagesSequentially, preloadImagesWhenIdle } from "../../media/imagePreload";
import { counselorPackageRegistry, getBuiltinCounselorPackage } from "@shared/index";
import { getHostedCounselorVisualUrl } from "../../counselors/hostedCounselorPackages";

interface CounselorVisualAssets {
  dialogueAvatar: string;
  portrait: string;
  portraitsByStatus?: Partial<Record<CounselorStatus, string>>;
  roomBackground: string;
  portraitBackdrop: string;
  usesUnifiedRoomBackground?: boolean;
}

export type CounselorPortraitPose = "default" | "listening" | "responding";

const portraitPoseByStatus: Record<CounselorStatus, CounselorPortraitPose> = {
  idle: "default",
  listening: "listening",
  connecting: "responding",
  thinking: "responding",
  streaming: "responding",
  error: "default"
};

const fallbackAssets: CounselorVisualAssets = {
  dialogueAvatar: chenglingDialogueAvatar,
  portrait: chenglingDefaultPortrait,
  roomBackground: chenglingRoomBackground,
  portraitBackdrop: chenglingRoomBackground,
  usesUnifiedRoomBackground: true
};

const counselorVisualAssetsByResourceId: Record<string, CounselorVisualAssets> = {
  "builtin://chengling/portrait": {
    dialogueAvatar: chenglingDialogueAvatar,
    portrait: chenglingDefaultPortrait,
    portraitsByStatus: {
      idle: chenglingDefaultPortrait,
      listening: chenglingListeningPortrait,
      connecting: chenglingExpressionPortrait,
      thinking: chenglingExpressionPortrait,
      streaming: chenglingExpressionPortrait,
      error: chenglingDefaultPortrait
    },
    roomBackground: chenglingRoomBackground,
    portraitBackdrop: chenglingRoomBackground,
    usesUnifiedRoomBackground: true
  },
  "builtin://zhouzhou/portrait": {
    dialogueAvatar: zhouzhouDialogueAvatar,
    portrait: zhouzhouDefaultPortrait,
    portraitsByStatus: {
      idle: zhouzhouDefaultPortrait,
      listening: zhouzhouListeningPortrait,
      connecting: zhouzhouRespondingPortrait,
      thinking: zhouzhouRespondingPortrait,
      streaming: zhouzhouRespondingPortrait,
      error: zhouzhouDefaultPortrait
    },
    roomBackground: zhouzhouRoomBackground,
    portraitBackdrop: zhouzhouRoomBackground,
    usesUnifiedRoomBackground: true
  },
  "builtin://linleshui/portrait": {
    dialogueAvatar: linleshuiDialogueAvatar,
    portrait: linleshuiDefaultPortrait,
    portraitsByStatus: {
      idle: linleshuiDefaultPortrait,
      listening: linleshuiListeningPortrait,
      connecting: linleshuiRespondingPortrait,
      thinking: linleshuiRespondingPortrait,
      streaming: linleshuiRespondingPortrait,
      error: linleshuiDefaultPortrait
    },
    roomBackground: linleshuiRoomBackground,
    portraitBackdrop: linleshuiRoomBackground,
    usesUnifiedRoomBackground: true
  }
};

export function getCounselorVisualAssets(counselorId: string): CounselorVisualAssets {
  if (counselorPackageRegistry.get(counselorId)?.source.kind === "host") {
    const portrait = getHostedCounselorVisualUrl(counselorId, "portrait");
    const room = getHostedCounselorVisualUrl(counselorId, "room");
    return {
      dialogueAvatar: getHostedCounselorVisualUrl(counselorId, "avatar"),
      portrait,
      roomBackground: room,
      portraitBackdrop: room,
      usesUnifiedRoomBackground: true
    };
  }
  const resourceId = getBuiltinCounselorPackage(counselorId)?.visuals.portrait;
  return resourceId ? counselorVisualAssetsByResourceId[resourceId] ?? fallbackAssets : fallbackAssets;
}

export function getCounselorPortraitForStatus(counselorId: string, status: CounselorStatus): string {
  const assets = getCounselorVisualAssets(counselorId);
  return assets.portraitsByStatus?.[status] ?? assets.portrait;
}

export function getCounselorPortraitPose(status: CounselorStatus): CounselorPortraitPose {
  return portraitPoseByStatus[status];
}

export function getCounselorDialogueAvatar(counselorId: string): string {
  return getCounselorVisualAssets(counselorId).dialogueAvatar;
}

export function preloadCounselorSessionAssets(counselorId: string, priority: "immediate" | "idle" = "idle") {
  const assets = getCounselorVisualAssets(counselorId);
  const criticalUrls = [
    assets.roomBackground,
    assets.portrait,
    assets.dialogueAvatar
  ];
  const deferredUrls = [
    assets.dialogueAvatar,
    assets.portraitBackdrop,
    ...Object.values(assets.portraitsByStatus ?? {})
  ];
  const criticalPreload = priority === "immediate"
    ? preloadImagesSequentially(criticalUrls)
    : preloadImagesWhenIdle(criticalUrls);
  void criticalPreload.then(() => preloadImagesWhenIdle(
    deferredUrls.filter((url) => !criticalUrls.includes(url))
  ));
  return criticalPreload;
}
