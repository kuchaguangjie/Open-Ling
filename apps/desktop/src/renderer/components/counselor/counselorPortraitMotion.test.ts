import { describe, expect, it } from "vitest";
import { getCounselorPortraitMotion } from "./counselorPortraitMotion";

describe("getCounselorPortraitMotion", () => {
  it("maps conversation statuses to stable portrait motion classes", () => {
    expect(getCounselorPortraitMotion("idle")).toMatchObject({
      state: "idle",
      className: "portrait-motion-idle"
    });
    expect(getCounselorPortraitMotion("listening")).toMatchObject({
      state: "listening",
      className: "portrait-motion-listening"
    });
    expect(getCounselorPortraitMotion("thinking")).toMatchObject({
      state: "thinking",
      className: "portrait-motion-thinking"
    });
    expect(getCounselorPortraitMotion("connecting")).toMatchObject({
      state: "thinking",
      className: "portrait-motion-thinking"
    });
    expect(getCounselorPortraitMotion("streaming")).toMatchObject({
      state: "responding",
      className: "portrait-motion-responding"
    });
    expect(getCounselorPortraitMotion("error")).toMatchObject({
      state: "error-soft",
      className: "portrait-motion-error-soft"
    });
  });
});
