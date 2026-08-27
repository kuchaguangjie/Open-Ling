import { beforeEach, describe, expect, it } from "vitest";
import {
  activeConsultationFlowStorageKey,
  readActiveConsultationFlow,
  writeActiveConsultationFlow
} from "./consultationFlowStorage";

describe("consultationFlowStorage", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips a valid discriminated flow snapshot", () => {
    writeActiveConsultationFlow({
      counselorId: "chengling",
      sessionId: "session-1",
      script: "first",
      surface: { kind: "closing-notice", reason: "letter-pending" },
      closingCycle: { cycleId: "closing-1", endedAt: "2026-07-12T13:00:00.000Z" }
    });

    expect(readActiveConsultationFlow()).toEqual({
      counselorId: "chengling",
      sessionId: "session-1",
      script: "first",
      surface: { kind: "closing-notice", reason: "letter-pending" },
      closingCycle: { cycleId: "closing-1", endedAt: "2026-07-12T13:00:00.000Z" }
    });
  });

  it("round-trips the room-arrival surface", () => {
    writeActiveConsultationFlow({
      counselorId: "zhouzhou",
      sessionId: "session-arrival",
      script: "returning",
      surface: { kind: "arrival" }
    });

    expect(readActiveConsultationFlow()?.surface).toEqual({ kind: "arrival" });
  });

  it.each([
    { kind: "opening" },
    { kind: "opening", lineIndex: -1 },
    { kind: "closing-notice", reason: "unexpected" },
    { kind: "history" },
    { kind: "letter", origin: "unexpected" }
  ])("rejects an incomplete or invalid surface: $kind", (surface) => {
    window.localStorage.setItem(
      activeConsultationFlowStorageKey,
      JSON.stringify({
        version: 1,
        counselorId: "chengling",
        sessionId: "session-1",
        script: "first",
        surface
      })
    );

    expect(readActiveConsultationFlow()).toBeNull();
  });
});
