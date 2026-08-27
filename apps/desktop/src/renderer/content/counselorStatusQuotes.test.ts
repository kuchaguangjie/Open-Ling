import { describe, expect, it, vi } from "vitest";
import {
  buildRotatingCounselorStatusQuote,
  counselorStatusQuotePools,
  pickRandomCounselorStatusQuote,
  pickStableCounselorStatusQuote
} from "./counselorStatusQuotes";

describe("counselorStatusQuotes", () => {
  it("keeps separate status quote pools for each default counselor", () => {
    expect(counselorStatusQuotePools.chengling.length).toBeGreaterThanOrEqual(10);
    expect(counselorStatusQuotePools.zhouzhou.length).toBeGreaterThanOrEqual(12);
    expect(counselorStatusQuotePools.linleshui.length).toBeGreaterThanOrEqual(16);
    expect(counselorStatusQuotePools.chengling).toContain("也许不必急着改变，\n此刻的你，本就值得被理解。");
    expect(counselorStatusQuotePools.zhouzhou).toContain("想法只是大脑产生的内容，\n它可以被看见，却不必被执行。");
    expect(counselorStatusQuotePools.linleshui).toContain("学会放下，是修行。\n装作放下，却不是。");
    expect(counselorStatusQuotePools.chengling.join("\n")).not.toMatch(/疗愈|安全的关系|共同创造的“之间”|改变自然发生/u);
  });

  it("picks a random quote from the requested counselor pool", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    expect(pickRandomCounselorStatusQuote("zhouzhou")).toBe(
      counselorStatusQuotePools.zhouzhou[counselorStatusQuotePools.zhouzhou.length - 1]
    );
  });

  it("uses a stable fallback for persisted sessions without a saved status quote", () => {
    expect(pickStableCounselorStatusQuote("linleshui", "session-a")).toBe(
      pickStableCounselorStatusQuote("linleshui", "session-a")
    );
    expect(counselorStatusQuotePools.linleshui).toContain(pickStableCounselorStatusQuote("linleshui", "session-a"));
  });

  it("rotates the displayed quote by session, restart seed, and ten-minute bucket", () => {
    const first = buildRotatingCounselorStatusQuote({
      counselorId: "chengling",
      sessionId: "session-a",
      restartSeed: "boot-a",
      rotationBucket: 0
    });
    const afterTenMinutes = buildRotatingCounselorStatusQuote({
      counselorId: "chengling",
      sessionId: "session-a",
      restartSeed: "boot-a",
      rotationBucket: 1
    });
    const afterRestart = buildRotatingCounselorStatusQuote({
      counselorId: "chengling",
      sessionId: "session-a",
      restartSeed: "boot-b",
      rotationBucket: 0
    });

    expect(counselorStatusQuotePools.chengling).toContain(first);
    expect(afterTenMinutes).not.toBe(first);
    expect(afterRestart).not.toBe(first);
  });
});
