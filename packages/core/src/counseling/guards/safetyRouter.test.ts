// @vitest-environment node
import { describe, expect, it } from "vitest";
import { classifySafetyLane, shouldInjectRealtimeSafety } from "./safetyRouter";

describe("safetyRouter", () => {
  it("does not alarm on ordinary low mood", () => {
    expect(classifySafetyLane("这周好累，什么都不想做，只想躺着。")).toBe("none");
    expect(classifySafetyLane("电影里有人自杀，我看完很难过。")).toBe("none");
  });

  it("marks unclear ideation without an immediate plan", () => {
    expect(classifySafetyLane("我有点不想活了，但又说不清。")).toBe("unclear");
    expect(classifySafetyLane("有时候会想自杀，但没有计划。")).toBe("unclear");
  });

  it("marks imminent harm when action is already happening or about to", () => {
    expect(classifySafetyLane("我已经吃了一瓶药，现在很晕。")).toBe("imminent");
    expect(classifySafetyLane("I am going to kill myself tonight.")).toBe("imminent");
    expect(classifySafetyLane("我准备自杀，已经写好了信。")).toBe("imminent");
  });

  it("never uses lane=none as a reason to drop the safety system message", () => {
    expect(shouldInjectRealtimeSafety("none")).toBe(true);
    expect(shouldInjectRealtimeSafety("unclear")).toBe(true);
    expect(shouldInjectRealtimeSafety("imminent")).toBe(true);
  });
});
