import { describe, expect, it } from "vitest";
import { receptionCounselorAssets } from "./receptionCounselorAssets";

describe("正式前台咨询师资源", () => {
  it("锁定用户确认的前台与对话摆放参数", () => {
    expect(receptionCounselorAssets.chengling.scene).toMatchObject({
      choosing: { placement: { scale: 150, x: 0, y: 0 } },
      default: { placement: { scale: 134, x: -1.5, y: 9 } },
      speaking: { placement: { scale: 157, x: 0, y: 0 } }
    });
    expect(receptionCounselorAssets.zhouzhou.scene).toMatchObject({
      choosing: { placement: { scale: 150, x: 0, y: 0 } },
      default: { placement: { scale: 150, x: 0, y: 0 } },
      speaking: { placement: { scale: 145, x: 0, y: 2.5 } }
    });
    expect(receptionCounselorAssets.linleshui.scene).toMatchObject({
      choosing: { placement: { scale: 150, x: 0, y: 5.5 } },
      default: { placement: { scale: 150, x: 0, y: 9 } },
      speaking: { placement: { scale: 154, x: 0, y: 0 } }
    });
    expect(receptionCounselorAssets.chengling.dialogue.placement).toEqual({ scale: 119, x: -6, y: 22.5 });
    expect(receptionCounselorAssets.zhouzhou.dialogue.placement).toEqual({ scale: 118, x: -9.5, y: 18.5 });
    expect(receptionCounselorAssets.linleshui.dialogue.placement).toEqual({ scale: 121, x: -12.5, y: 20.5 });
  });
});
