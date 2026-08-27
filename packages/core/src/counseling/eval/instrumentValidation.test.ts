// @vitest-environment node
import { describe, expect, it } from "vitest";
import { batteryAssembledHash, batteryPromptHash, samplingKey } from "./evalKey";
import { zhouzhouTwoSidedBind } from "./score";

/**
 * L0.5: score the scorer.
 * Old conjunction (dual ∧ poles ∧ 都成立) was constant FALSE on independent
 * textbook DSR (q1=0/12). Approver asked to align the ruler with the MI
 * definition (both sides in one utterance, additive join) — not to copy the
 * 12 sentences into the regex. One of those 12 still fails on purpose.
 */
describe("L0.5 instrument range", () => {
  it("recognizes 一方面…另一方面 when poles and both-valid are also present", () => {
    expect(zhouzhouTwoSidedBind("一方面是照顾别人，另一方面是自己想要什么，两边都成立。")).toBe(true);
  });

  it("does not treat recovered sequence attunement as two-sided bind", () => {
    expect(zhouzhouTwoSidedBind("你先把别人的情绪安顿好，轮到自己时，需要和想要的东西反而变得模糊。")).toBe(false);
  });

  it("recognizes 既…也 textbook DSR without requiring 别人/自己/都成立", () => {
    expect(zhouzhouTwoSidedBind("你既想继续做那个稳住场面的人，也想不必再一个人扛。")).toBe(true);
  });

  it("does not treat naming 两难/矛盾 as a double-sided reflection", () => {
    expect(zhouzhouTwoSidedBind("这确实是个两难，你慢慢想。")).toBe(false);
    expect(zhouzhouTwoSidedBind("矛盾是正常的，每个人都有矛盾。")).toBe(false);
  });

  it("does not treat spatial 这边/那边 emptiness as both-valid", () => {
    expect(zhouzhouTwoSidedBind("别人那边清楚、要接住；自己这边一空下来，反而不知道从哪说起。")).toBe(false);
  });

  it("battery hash changes if zhouzhou prompt hash changes even when linleshui stays put", () => {
    const base = [
      { fixtureId: "S10-chengling-voice", promptContentHash: "fnv1a32:8eea50aa" },
      { fixtureId: "S10-zhouzhou-voice", promptContentHash: "fnv1a32:fb3b80d7" },
      { fixtureId: "S10-linleshui-voice", promptContentHash: "fnv1a32:bba0442c" }
    ];
    const zhouzhouEdited = [
      { fixtureId: "S10-chengling-voice", promptContentHash: "fnv1a32:8eea50aa" },
      { fixtureId: "S10-zhouzhou-voice", promptContentHash: "fnv1a32:aaaaaaaa" },
      { fixtureId: "S10-linleshui-voice", promptContentHash: "fnv1a32:bba0442c" }
    ];
    expect(batteryPromptHash(base)).not.toBe(batteryPromptHash(zhouzhouEdited));
    expect(batteryPromptHash(base)).not.toBe("fnv1a32:bba0442c");
  });

  it("assembled hash moves when layout/safety injection changes and the clinical hash does not", () => {
    const base = [
      { fixtureId: "S1-low-mood", promptContentHash: "fnv1a32:clinical", assembledSystemHash: "fnv1a32:layout-none" },
      { fixtureId: "S2-crisis", promptContentHash: "fnv1a32:clinical", assembledSystemHash: "fnv1a32:layout-crisis" }
    ];
    const safetyLayoutChanged = [
      { fixtureId: "S1-low-mood", promptContentHash: "fnv1a32:clinical", assembledSystemHash: "fnv1a32:layout-full" },
      { fixtureId: "S2-crisis", promptContentHash: "fnv1a32:clinical", assembledSystemHash: "fnv1a32:layout-crisis" }
    ];
    expect(batteryPromptHash(base)).toBe(batteryPromptHash(safetyLayoutChanged));
    expect(batteryAssembledHash(base)).not.toBe(batteryAssembledHash(safetyLayoutChanged));
  });

  it("eval key distinguishes t=0 from t=0.7 and from unmatched-null", () => {
    expect(samplingKey({ temperature: 0, top_p: 1, seed: 20260825 })).not.toBe(samplingKey({ temperature: 0.7, top_p: 0.95 }));
    expect(samplingKey(null)).toBe("samp-null");
  });
});
