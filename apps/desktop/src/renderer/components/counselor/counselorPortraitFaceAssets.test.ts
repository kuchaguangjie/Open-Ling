import { describe, expect, it } from "vitest";
import { getCounselorPortraitFaceAssets, getCounselorPortraitFaceFrameStyle } from "./counselorPortraitFaceAssets";

describe("counselorPortraitFaceAssets", () => {
  it("maps all three counselors to independent eye overlays", () => {
    for (const counselorId of ["chengling", "zhouzhou", "linleshui"]) {
      const idle = getCounselorPortraitFaceAssets(counselorId, "idle");
      const listening = getCounselorPortraitFaceAssets(counselorId, "listening");
      const responding = getCounselorPortraitFaceAssets(counselorId, "streaming");
      const expectedMarker = counselorId === "zhouzhou"
        ? "user-selected-v2"
        : counselorId === "chengling"
          ? "new-style-v1"
          : "redesign-v1";
      expect(idle?.eyesClosed).toContain(expectedMarker);
      expect(listening?.eyesClosed).toContain(expectedMarker);
      expect(responding?.eyesClosed).toContain(expectedMarker);
      expect(idle?.eyesClosed).toContain("-cropped.png");
      expect(listening?.eyesClosed).toContain("-cropped.png");
      expect(responding?.eyesClosed).toContain("-cropped.png");
      expect(new Set([idle?.eyesClosed, listening?.eyesClosed, responding?.eyesClosed]).size).toBe(3);
      expect("eyesHalf" in (idle ?? {})).toBe(false);
      expect("eyesHalf" in (listening ?? {})).toBe(false);
      expect("eyesHalf" in (responding ?? {})).toBe(false);
    }
  });

  it("places compact face textures back onto the matching full portrait coordinates", () => {
    for (const counselorId of ["chengling", "zhouzhou", "linleshui"]) {
      for (const status of ["idle", "listening", "streaming"] as const) {
        const assets = getCounselorPortraitFaceAssets(counselorId, status);
        for (const source of [assets?.eyesClosed, assets?.mouthSlight, assets?.mouthOpen].filter(Boolean) as string[]) {
          const style = getCounselorPortraitFaceFrameStyle(source);
          expect(style).toBeDefined();
          expect(parseFloat(style?.width ?? "100")).toBeLessThan(20);
          expect(parseFloat(style?.height ?? "100")).toBeLessThan(10);
        }
      }
    }
  });

  it("exposes mouth overlays only for matching responding portraits", () => {
    for (const counselorId of ["chengling", "linleshui"]) {
      expect(getCounselorPortraitFaceAssets(counselorId, "idle")).not.toHaveProperty("mouthSlight");
      expect(getCounselorPortraitFaceAssets(counselorId, "listening")).not.toHaveProperty("mouthSlight");
      expect(getCounselorPortraitFaceAssets(counselorId, "streaming")?.mouthSlight).toContain("mouth-slight");
      expect(getCounselorPortraitFaceAssets(counselorId, "streaming")?.mouthOpen).toContain("mouth-open");
    }
    for (const status of ["idle", "listening", "streaming"] as const) {
      const assets = getCounselorPortraitFaceAssets("zhouzhou", status);
      expect(assets?.mouthSlight).toContain("mouth-slight-overlay-user-selected-v2");
      expect(assets?.mouthOpen).toContain("mouth-open-overlay-user-selected-v2");
    }
  });
});
