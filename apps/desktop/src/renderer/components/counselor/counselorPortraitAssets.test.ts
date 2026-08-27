import { describe, expect, it } from "vitest";
import {
  getCounselorDialogueAvatar,
  getCounselorPortraitForStatus,
  getCounselorVisualAssets
} from "./counselorPortraitAssets";

describe("counselor portrait assets", () => {
  it("maps Chengling states to the new-style transparent default, listening, and responding portraits", () => {
    expect(getCounselorVisualAssets("chengling").portrait).toContain("chengling-default-new-style-transparent-clean-v6");
    expect(getCounselorPortraitForStatus("chengling", "idle")).toContain(
      "chengling-default-new-style-transparent-clean-v6"
    );
    expect(getCounselorPortraitForStatus("chengling", "listening")).toContain(
      "chengling-listening-cheek-new-style-transparent-clean-v10"
    );
    expect(getCounselorPortraitForStatus("chengling", "connecting")).toContain(
      "chengling-responding-new-style-transparent-clean-v9"
    );
    expect(getCounselorPortraitForStatus("chengling", "thinking")).toContain(
      "chengling-responding-new-style-transparent-clean-v9"
    );
    expect(getCounselorPortraitForStatus("chengling", "streaming")).toContain(
      "chengling-responding-new-style-transparent-clean-v9"
    );
  });

  it("preserves Chengling and Zhouzhou rooms while using Lin Leshui's selected lakeside room", () => {
    const chengling = getCounselorVisualAssets("chengling");
    const zhouzhou = getCounselorVisualAssets("zhouzhou");
    const linleshui = getCounselorVisualAssets("linleshui");

    expect(chengling.roomBackground).toContain("chengling-warm-fireplace-study-background-v1");
    expect(chengling.portraitBackdrop).toBe(chengling.roomBackground);
    expect(zhouzhou.roomBackground).toContain("zhouzhou-wide-room-background-v2");
    expect(zhouzhou.portraitBackdrop).toBe(zhouzhou.roomBackground);
    expect(linleshui.roomBackground).toContain("linleshui-sunny-lakeside-v1");
    expect(linleshui.portraitBackdrop).toBe(linleshui.roomBackground);
    expect(chengling.usesUnifiedRoomBackground).toBe(true);
    expect(zhouzhou.usesUnifiedRoomBackground).toBe(true);
    expect(linleshui.usesUnifiedRoomBackground).toBe(true);
  });

  it("maps Zhouzhou states to default, user-input listening, and responding portraits", () => {
    expect(getCounselorVisualAssets("zhouzhou").portrait).toContain("zhouzhou-session-default-runtime-1280w-v1");
    expect(getCounselorPortraitForStatus("zhouzhou", "idle")).toContain("zhouzhou-session-default-runtime-1280w-v1");
    expect(getCounselorPortraitForStatus("zhouzhou", "listening")).toContain(
      "zhouzhou-session-listening-runtime-1280w-v1"
    );
    expect(getCounselorPortraitForStatus("zhouzhou", "connecting")).toContain(
      "zhouzhou-session-responding-runtime-1280w-v1"
    );
    expect(getCounselorPortraitForStatus("zhouzhou", "thinking")).toContain(
      "zhouzhou-session-responding-runtime-1280w-v1"
    );
    expect(getCounselorPortraitForStatus("zhouzhou", "streaming")).toContain(
      "zhouzhou-session-responding-runtime-1280w-v1"
    );
  });

  it("maps Lin Leshui states to default smile, user-input listening, and speaking portraits", () => {
    expect(getCounselorVisualAssets("linleshui").portrait).toContain("linleshui-default-present-white-speck-clean-transparent-v3");
    expect(getCounselorPortraitForStatus("linleshui", "idle")).toContain("linleshui-default-present-white-speck-clean-transparent-v3");
    expect(getCounselorPortraitForStatus("linleshui", "listening")).toContain(
      "linleshui-listening-user-input-white-speck-clean-transparent-v3"
    );
    expect(getCounselorPortraitForStatus("linleshui", "connecting")).toContain(
      "linleshui-responding-thinking-white-speck-clean-transparent-v3"
    );
    expect(getCounselorPortraitForStatus("linleshui", "thinking")).toContain(
      "linleshui-responding-thinking-white-speck-clean-transparent-v3"
    );
    expect(getCounselorPortraitForStatus("linleshui", "streaming")).toContain(
      "linleshui-responding-thinking-white-speck-clean-transparent-v3"
    );
  });

  it("maps each counselor to a dedicated dialogue avatar", () => {
    expect(getCounselorDialogueAvatar("chengling")).toContain("chengling-dialogue-avatar-runtime-256-v1");
    expect(getCounselorDialogueAvatar("zhouzhou")).toContain("zhouzhou-dialogue-avatar-runtime-256-v1");
    expect(getCounselorDialogueAvatar("linleshui")).toContain("linleshui-dialogue-avatar-runtime-256-v1");
    expect(getCounselorDialogueAvatar("unknown")).toContain("chengling-dialogue-avatar-runtime-256-v1");
  });
});
