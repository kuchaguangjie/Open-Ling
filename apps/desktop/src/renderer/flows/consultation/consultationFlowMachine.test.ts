import { describe, expect, it } from "vitest";
import {
  createOpeningFlow,
  reconcileConsultationFlow,
  transitionConsultationFlow,
  type ConsultationFlowState
} from "./consultationFlowMachine";

describe("consultationFlowMachine", () => {
  it("从开场推进到正式咨询，再进入收尾三个选项", () => {
    let flow = createOpeningFlow({ counselorId: "chengling", sessionId: "session-1", script: "first" });
    expect(flow.surface.kind).toBe("arrival");

    flow = transitionConsultationFlow(flow, { type: "ARRIVAL_FINISHED" });
    expect(flow.surface).toEqual({ kind: "opening", lineIndex: 0 });

    flow = transitionConsultationFlow(flow, { type: "OPENING_NEXT", lineCount: 3 });
    expect(flow.surface).toMatchObject({ kind: "opening", lineIndex: 1 });

    flow = transitionConsultationFlow(flow, { type: "OPENING_SKIP" });
    expect(flow.surface.kind).toBe("starting");

    flow = transitionConsultationFlow(flow, { type: "START_SUCCEEDED" });
    expect(flow.surface.kind).toBe("session");

    flow = transitionConsultationFlow(flow, { type: "END_REQUESTED", cycleId: "cycle-1" });
    expect(flow.surface.kind).toBe("ending");

    flow = transitionConsultationFlow(flow, { type: "END_SUCCEEDED", endedAt: "2026-07-12T11:00:00.000Z" });
    expect(flow.surface).toMatchObject({ kind: "closing", lineIndex: 0 });

    flow = transitionConsultationFlow(flow, { type: "CLOSING_SKIP" });
    expect(flow.surface.kind).toBe("closing-menu");

    flow = transitionConsultationFlow(flow, { type: "OPEN_HISTORY" });
    expect(flow.surface).toEqual({ kind: "history", origin: "closing" });

    flow = transitionConsultationFlow(flow, { type: "RETURN_TO_CLOSING" });
    expect(flow.surface.kind).toBe("closing-menu");
  });

  it("自然播放到收尾最后一句时可以直接打开历史记录", () => {
    const flow: ConsultationFlowState = {
      counselorId: "chengling",
      sessionId: "session-closing-last-line",
      script: "returning",
      surface: { kind: "closing", lineIndex: 1 }
    };

    expect(transitionConsultationFlow(flow, { type: "OPEN_HISTORY" }).surface).toEqual({
      kind: "history",
      origin: "closing"
    });
  });

  it("来信状态提示中仍可查看历史记录", () => {
    const flow: ConsultationFlowState = {
      counselorId: "chengling",
      sessionId: "session-letter-pending",
      script: "returning",
      surface: { kind: "closing-notice", reason: "letter-pending" }
    };

    expect(transitionConsultationFlow(flow, { type: "OPEN_HISTORY" }).surface).toEqual({
      kind: "history",
      origin: "closing"
    });
  });

  it("按数据库 draft active ended 校正界面，旧 ended 不补播收尾", () => {
    const opening = createOpeningFlow({ counselorId: "zhouzhou", sessionId: "session-2", script: "returning" });

    expect(reconcileConsultationFlow(opening, { status: "draft", endedAt: undefined }).surface.kind).toBe("arrival");
    expect(reconcileConsultationFlow(opening, { status: "active", endedAt: undefined }).surface.kind).toBe("session");

    const oldEnded: ConsultationFlowState = { ...opening, surface: { kind: "session" }, closingCycle: undefined };
    expect(
      reconcileConsultationFlow(oldEnded, { status: "ended", endedAt: "2026-07-12T12:00:00.000Z" }).surface
    ).toEqual({ kind: "history", origin: "archive" });
  });
});
