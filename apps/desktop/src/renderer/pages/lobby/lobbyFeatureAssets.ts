import frameBottomUrl from "../../../../../../assets/runtime/lobby/resource-table/frame/dialogue-slices-v24/resource-table-frame-bottom.png";
import frameBottomLeftUrl from "../../../../../../assets/runtime/lobby/resource-table/frame/dialogue-slices-v24/resource-table-frame-bottom-left.png";
import frameBottomRightUrl from "../../../../../../assets/runtime/lobby/resource-table/frame/dialogue-slices-v24/resource-table-frame-bottom-right.png";
import frameLeftUrl from "../../../../../../assets/runtime/lobby/resource-table/frame/dialogue-slices-v24/resource-table-frame-left.png";
import frameRightUrl from "../../../../../../assets/runtime/lobby/resource-table/frame/dialogue-slices-v24/resource-table-frame-right.png";
import frameTopUrl from "../../../../../../assets/runtime/lobby/resource-table/frame/dialogue-slices-v24/resource-table-frame-top.png";
import frameTopLeftUrl from "../../../../../../assets/runtime/lobby/resource-table/frame/dialogue-slices-v24/resource-table-frame-top-left.png";
import frameTopRightUrl from "../../../../../../assets/runtime/lobby/resource-table/frame/dialogue-slices-v24/resource-table-frame-top-right.png";
import studioPaperUrl from "../../../../../../assets/runtime/lobby/resource-table/frame/resource-table-paper-blank-v20.png";
import bookcaseGinkgoUrl from "../../../../../../assets/runtime/lobby/ornaments/bookcase-ginkgo-corner-transparent-v1.png";
import lettersLilyUrl from "../../../../../../assets/runtime/lobby/ornaments/letters-lily-of-the-valley-corner-transparent-v1.png";
import chenglingBotanicalUrl from "../../../../../../assets/runtime/lobby/ornaments/counselor/chengling-peony-bottom-right-trimmed-v1.png";
import linleshuiBotanicalUrl from "../../../../../../assets/runtime/lobby/ornaments/counselor/linleshui-daisy-bottom-right-trimmed-v1.png";
import zhouzhouBotanicalUrl from "../../../../../../assets/runtime/lobby/ornaments/counselor/zhouzhou-sunflower-bottom-right-trimmed-v1.png";
import closedEnvelopeUrl from "../../../../../../assets/runtime/session-letter/envelope-closed-transparent.png";
import openedEnvelopeUrl from "../../../../../../assets/runtime/session-letter/envelope-paper-transparent.png";
import letterPaperUrl from "../../../../../../assets/runtime/session-letter/letter-paper-texture-wide-v3.jpg";
import sidebarPlantUrl from "../../../../../../assets/brand/sidebar-plant.png";
import { preloadImagesSequentially, preloadImagesWhenIdle } from "../../media/imagePreload";
import { getStoryArticles, storyCounselors } from "./features/bookcase/storyContent";
import { getCounselorIntroductionProfiles } from "./features/counselors/counselorIntroductionContent";

const counselorIntroductionProfiles = getCounselorIntroductionProfiles("zh-CN");

type PreloadableLobbyFeatureId = "bookcase" | "booking" | "counselors" | "letters";

const sharedStudioAssetUrls = [
  studioPaperUrl,
  frameTopLeftUrl,
  frameTopUrl,
  frameTopRightUrl,
  frameLeftUrl,
  frameRightUrl,
  frameBottomLeftUrl,
  frameBottomUrl,
  frameBottomRightUrl
] as const;

const counselorBotanicalUrls: Record<string, string> = {
  chengling: chenglingBotanicalUrl,
  linleshui: linleshuiBotanicalUrl,
  zhouzhou: zhouzhouBotanicalUrl
};

let shellPreload: Promise<void> | undefined;
let typographyPreload: Promise<void> | undefined;

/** Warms the paper workspace that is shared by stories, letters and records. */
export function preloadLobbyFeatureShellAssets() {
  shellPreload ??= preloadImagesWhenIdle(sharedStudioAssetUrls);
  typographyPreload ??= preloadLobbyFeatureTypographyWhenIdle();
  return Promise.all([shellPreload, typographyPreload]).then(() => undefined);
}

/** Starts feature-specific work as soon as pointer/focus intent is visible. */
export function preloadLobbyFeatureAssets(
  featureId: PreloadableLobbyFeatureId,
  counselorId: string = "chengling"
) {
  const urls = getFeatureAssetUrls(featureId, counselorId);
  return preloadImagesSequentially(urls);
}

function getFeatureAssetUrls(featureId: PreloadableLobbyFeatureId, counselorId: string) {
  if (featureId === "bookcase") {
    const selectedStories = getStoryArticles("chengling");
    return [
      storyCounselors[0] ? getCounselorAvatar(storyCounselors[0].id) : "",
      bookcaseGinkgoUrl,
      selectedStories[0]?.imageUrl ?? ""
    ];
  }

  if (featureId === "letters") {
    return [
      closedEnvelopeUrl,
      lettersLilyUrl,
      openedEnvelopeUrl,
      letterPaperUrl,
      sidebarPlantUrl
    ];
  }

  const profile = counselorIntroductionProfiles.find((item) => item.id === counselorId)
    ?? counselorIntroductionProfiles[0];
  return [
    profile.portrait,
    profile.avatar,
    studioPaperUrl,
    counselorBotanicalUrls[profile.id]
  ];
}

function getCounselorAvatar(counselorId: string) {
  return counselorIntroductionProfiles.find((profile) => profile.id === counselorId)?.avatar ?? "";
}

function preloadLobbyFeatureTypographyWhenIdle() {
  if (typeof document === "undefined" || !document.fonts?.load) return Promise.resolve();

  return new Promise<void>((resolve) => {
    scheduleIdleTask(() => {
      void Promise.all([
        document.fonts.load('400 16px "LXGW ZhenKai"', "咨询师的信故事簿会谈记录"),
        document.fonts.load('600 16px "Noto Serif SC"', "咨询师预约来信故事"),
        document.fonts.load('700 16px "Noto Serif SC"', "咨询师预约来信故事")
      ])
        .catch(() => undefined)
        .then(() => resolve());
    });
  });
}

function scheduleIdleTask(task: () => void) {
  if (typeof globalThis.requestIdleCallback === "function") {
    globalThis.requestIdleCallback(task, { timeout: 1_000 });
    return;
  }
  globalThis.setTimeout(task, 0);
}
