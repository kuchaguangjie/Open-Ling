// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { RollingSummary, SessionMessage } from "@shared/index";
import type { LlmProvider } from "../../providers/llmProvider";
import {
  createRollingSummaryDraft,
  filterSummarizableMessages,
  selectRollingSummaryNewMessages,
  shouldUpdateRollingSummary,
  validateRollingSummary
} from "./rollingSummary";

const baseMessages: SessionMessage[] = Array.from({ length: 14 }, (_, index) => ({
  id: `m-${index}`,
  sessionId: "s1",
  role: index % 2 === 0 ? "user" : "assistant",
  content: `消息 ${index}`,
  createdAt: `2026-07-05T10:${String(index).padStart(2, "0")}:00.000Z`,
  status: "sent"
}));

const validSummary = "### 重要事实\n- 用户提到最近很累。\n\n### 事情经过\n- 用户先描述疲惫感。";

describe("rolling summary", () => {
  it("validates the strict markdown contract", () => {
    expect(validateRollingSummary(validSummary)).toEqual({ ok: true, issues: [] });
    expect(validateRollingSummary("### 重要事实\n- 用户提到最近很累。")).toMatchObject({ ok: false });
    expect(validateRollingSummary(`前言\n${validSummary}`)).toMatchObject({ ok: false });
    expect(validateRollingSummary("### 重要事实\n用户提到最近很累。\n\n### 事情经过\n- 先描述疲惫感。")).toMatchObject({ ok: false });
    expect(validateRollingSummary("### 重要事实\n- 第\n\n### 事情经过\n- 无")).toMatchObject({ ok: false });
    expect(
      validateRollingSummary(
        "### 重要事实\n- 事实一。\n- 事实二。\n- 事实三。\n- 事实四。\n\n### 事情经过\n- 用户先描述疲惫感。"
      )
    ).toMatchObject({ ok: false });
    expect(validateRollingSummary("### 重要事实\n- 第13轮测试中用户提到疲惫。\n\n### 事情经过\n- 用户先描述疲惫感。")).toMatchObject({
      ok: false
    });
    expect(validateRollingSummary("### 重要事实\n- 用户提到疲惫。\n\n### 事情经过\n- 无")).toEqual({
      ok: true,
      issues: []
    });
    expect(
      validateRollingSummary("### 重要事实\n- 用户提到疲惫。\n\n### 事情经过\n- 无", { requireTimelineContent: true })
    ).toMatchObject({ ok: false });
  });

  it("filters failed, empty, and system messages before summarizing", () => {
    const messages: SessionMessage[] = [
      ...baseMessages.slice(0, 2),
      { ...baseMessages[2], id: "failed", status: "failed" },
      { ...baseMessages[3], id: "empty", content: "" },
      { ...baseMessages[4], id: "system", role: "system" }
    ];

    expect(filterSummarizableMessages(messages).map((message) => message.id)).toEqual(["m-0", "m-1"]);
  });

  it("uses token thresholds for initial and incremental updates", () => {
    const shortMessages = baseMessages.slice(0, 13).map((message) => ({ ...message, content: "短" }));
    const longMessages = baseMessages.slice(0, 2).map((message) => ({ ...message, content: "x".repeat(6) }));

    expect(
      shouldUpdateRollingSummary({
        messages: shortMessages,
        budget: { summaryWarmupThresholdTokens: 10, summaryUpdateThresholdTokens: 5 }
      })
    ).toBe(true);
    expect(
      shouldUpdateRollingSummary({
        messages: shortMessages,
        budget: { summaryWarmupThresholdTokens: 20, summaryUpdateThresholdTokens: 5 }
      })
    ).toBe(false);
    expect(
      shouldUpdateRollingSummary({
        messages: longMessages,
        budget: { summaryWarmupThresholdTokens: 10, summaryUpdateThresholdTokens: 5 }
      })
    ).toBe(true);

    const existing: RollingSummary = {
      sessionId: "s1",
      counselorId: "chengling",
      summary: validSummary,
      coveredMessageCount: 10,
      createdAt: "2026-07-05T10:00:00.000Z",
      updatedAt: "2026-07-05T10:00:00.000Z",
      status: "active"
    };
    expect(
      shouldUpdateRollingSummary({
        messages: baseMessages.slice(0, 13).map((message) => ({ ...message, content: "x" })),
        existing,
        budget: { summaryWarmupThresholdTokens: 10, summaryUpdateThresholdTokens: 5 }
      })
    ).toBe(false);
    expect(
      shouldUpdateRollingSummary({
        messages: baseMessages.slice(0, 14).map((message) => ({ ...message, content: "xxx" })),
        existing,
        budget: { summaryWarmupThresholdTokens: 10, summaryUpdateThresholdTokens: 5 }
      })
    ).toBe(true);
  });

  it("selects only messages after the previous covered count", () => {
    const existing: RollingSummary = {
      sessionId: "s1",
      counselorId: "chengling",
      summary: validSummary,
      coveredMessageCount: 10,
      createdAt: "2026-07-05T10:00:00.000Z",
      updatedAt: "2026-07-05T10:00:00.000Z",
      status: "active"
    };

    expect(selectRollingSummaryNewMessages(baseMessages, existing).map((message) => message.id)).toEqual([
      "m-10",
      "m-11",
      "m-12",
      "m-13"
    ]);
  });

  it("repairs invalid model output once before returning a draft", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ content: "我整理如下：\n- 用户最近很累。" })
      .mockResolvedValueOnce({ content: validSummary });
    const provider = { complete, stream: vi.fn() } as unknown as LlmProvider;

    const draft = await createRollingSummaryDraft({
      provider,
      messages: baseMessages,
      sessionId: "s1"
    });

    expect(draft).toMatchObject({
      summary: validSummary,
      coveredMessageCount: 14,
      coveredUntilMessageId: "m-13"
    });
    expect(draft.sourceHash).toBeTruthy();
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("requires timeline content for generated summaries with new dialogue messages", async () => {
    const emptyTimelineSummary = "### 重要事实\n- 用户提到最近很累。\n\n### 事情经过\n- 无";
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ content: emptyTimelineSummary })
      .mockResolvedValueOnce({ content: validSummary });
    const provider = { complete, stream: vi.fn() } as unknown as LlmProvider;

    const draft = await createRollingSummaryDraft({
      provider,
      messages: baseMessages,
      sessionId: "s1"
    });

    expect(draft.summary).toBe(validSummary);
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it("throws after repair still violates the format", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce({ content: "bad summary" })
      .mockResolvedValueOnce({ content: "still bad" });
    const provider = { complete, stream: vi.fn() } as unknown as LlmProvider;

    await expect(
      createRollingSummaryDraft({
        provider,
        messages: baseMessages,
        sessionId: "s1"
      })
    ).rejects.toThrow("rolling summary format invalid after repair");
  });
});
