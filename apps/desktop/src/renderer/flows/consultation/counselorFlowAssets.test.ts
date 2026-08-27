import { describe, expect, it } from "vitest";
import { counselorFlowAssets } from "./counselorFlowAssets";

describe("counselorFlowAssets", () => {
  it("只接入三位咨询师的正式背景与允许的动态或静态表情帧", () => {
    expect(Object.keys(counselorFlowAssets)).toEqual(["chengling", "zhouzhou", "linleshui"]);
    const allPaths = Object.values(counselorFlowAssets).flatMap((assets) => [
      assets.openingRoomBackground,
      assets.sessionRoomBackground,
      ...Object.values(assets.openingPortraitFrames),
      ...Object.values(assets.closingPortraitFrames),
      ...Object.values(assets.openingPortraitOverlays ?? {}),
      ...Object.values(assets.closingPortraitOverlays ?? {})
    ]);
    expect(allPaths).toHaveLength(42);
    expect(allPaths.filter((path) => path.includes("q-style-counselor-art-v1/rooms"))).toHaveLength(2);
    expect(allPaths.filter((path) => path.includes("one-chair-room"))).toHaveLength(2);
    expect(allPaths.filter((path) => path.includes("-room-final-"))).toHaveLength(4);
    expect(new Set(allPaths)).toHaveLength(25);

    const chenglingOpeningPaths = new Set(Object.values(counselorFlowAssets.chengling.openingPortraitFrames));
    const chenglingClosingPaths = new Set(Object.values(counselorFlowAssets.chengling.closingPortraitFrames));
    expect(chenglingOpeningPaths.size).toBe(1);
    expect([...chenglingOpeningPaths][0]).toContain("chengling-opening-welcome-closed-mouth-transparent-v1");
    expect(chenglingClosingPaths.size).toBe(1);
    expect([...chenglingClosingPaths][0]).toContain("chengling-closing-folded-hands-transparent-clean-v2");
    expect(Object.values(counselorFlowAssets.chengling.openingPortraitOverlays ?? {})).toHaveLength(3);
    expect(Object.values(counselorFlowAssets.chengling.closingPortraitOverlays ?? {})).toHaveLength(3);
    expect(JSON.stringify(counselorFlowAssets.chengling)).toContain("eyes-closed-overlay-v1");
  });

  it("不引用交接记录明确禁用的历史版本或预览文件", () => {
    const paths = JSON.stringify(counselorFlowAssets);
    expect(paths).not.toMatch(/\/old\/|\/qa\/|\.gif|\.webp/i);
    expect(paths).not.toContain("chengling-opening-reflective-waist-neutral-transparent-v1");
    expect(paths).not.toContain("linleshui-opening-observing-gesture");
    expect(paths).not.toContain("linleshui-closing-one-hand-cup");
    expect(paths).not.toMatch(/zhouzhou-(opening-mug|closing-relaxed)-[^\"]+-transparent-v1/);
    expect(paths).not.toMatch(/linleshui-(opening-one-hand-cup|closing-relaxed)-[^\"]+-transparent-v2/);
    expect(paths).not.toMatch(/zhouzhou-(opening-mug|closing-relaxed)-[^\"]+-transparent-v2/);
    expect(paths).not.toMatch(/linleshui-(opening-one-hand-cup|closing-relaxed)-[^\"]+-transparent-v3/);
    expect(paths).toContain("chengling-session-one-chair-room-final-v2");
    expect(paths).toContain("zhouzhou-session-one-chair-room-final-v1");
    expect(paths.match(/linleshui-sunny-lakeside-v1/g)).toHaveLength(2);
    expect(paths).not.toMatch(/zhouzhou-(opening-mug|closing-relaxed)-[^\"]+-transparent-v3/);
    expect(paths.match(/zhouzhou-opening-welcome-halfbody-neutral-transparent-v4/g)).toHaveLength(5);
    expect(paths.match(/zhouzhou-closing-relaxed-halfbody-neutral-transparent-v4/g)).toHaveLength(5);
    expect(paths).toContain("linleshui-opening-halfbody-inviting-cup-neutral-transparent-v1");
    expect(paths).toContain("linleshui-closing-halfbody-two-hand-cup-neutral-transparent-v1");
    expect(paths.match(/linleshui-opening-halfbody-inviting-cup-(neutral|eyes-half|eyes-closed|mouth-slight|mouth-open)-transparent-v1/g)).toHaveLength(5);
    expect(paths.match(/linleshui-closing-halfbody-two-hand-cup-(neutral|eyes-half|eyes-closed|mouth-slight|mouth-open)-transparent-v1/g)).toHaveLength(5);
  });
});
