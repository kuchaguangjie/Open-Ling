// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { SessionMessage } from "@shared/index";
import {
  assertContextPlanAuditIsSanitized,
  buildContextPlanAudit,
  buildCounselingContextPlan,
  estimateTextTokens
} from "./contextBudgetPlanner";

function message(id: string, content: string, role: "user" | "assistant" = "user"): SessionMessage {
  return {
    id,
    sessionId: "s-budget",
    role,
    content,
    createdAt: "2026-07-05T10:00:00.000Z",
    status: "sent"
  };
}

describe("buildCounselingContextPlan", () => {
  it("keeps full history and does not inject rolling summary while history fits the short-term budget", () => {
    const plan = buildCounselingContextPlan({
      messages: [message("m1", "12345"), message("m2", "67890", "assistant")],
      rollingSummary: "### 重要事实\n- 旧摘要。\n\n### 事情经过\n- 旧经过。",
      budget: {
        shortTermHistoryBudgetTokens: 20,
        summaryWarmupThresholdTokens: 10,
        summaryUpdateThresholdTokens: 5,
        currentUserWarningThresholdTokens: 15,
        currentUserHardLimitTokens: 30
      }
    });

    expect(plan.includedMessages.map((item) => item.id)).toEqual(["m1", "m2"]);
    expect(plan.omittedMessages).toEqual([]);
    expect(plan.shouldInjectRollingSummary).toBe(false);
    expect(plan.warnings).toEqual([]);
  });

  it("injects rolling summary and keeps the largest recent original window when history exceeds budget", () => {
    const plan = buildCounselingContextPlan({
      messages: [
        message("old-1", "11111"),
        message("old-2", "22222", "assistant"),
        message("recent-1", "33333"),
        message("recent-2", "44444", "assistant")
      ],
      rollingSummary: "### 重要事实\n- 较早脉络。\n\n### 事情经过\n- 较早经过。",
      budget: {
        shortTermHistoryBudgetTokens: 12,
        summaryWarmupThresholdTokens: 6,
        summaryUpdateThresholdTokens: 5,
        currentUserWarningThresholdTokens: 15,
        currentUserHardLimitTokens: 30
      }
    });

    expect(plan.includedMessages.map((item) => item.id)).toEqual(["recent-1", "recent-2"]);
    expect(plan.omittedMessages.map((item) => item.id)).toEqual(["old-1", "old-2"]);
    expect(plan.shouldInjectRollingSummary).toBe(true);
    expect(plan.warnings).toContain("historyBudgetExceeded");
  });

  it("keeps the newest current user message even when it exceeds the short-term history budget", () => {
    const plan = buildCounselingContextPlan({
      messages: [message("old", "12345"), message("current", "x".repeat(25))],
      rollingSummary: "### 重要事实\n- 较早脉络。\n\n### 事情经过\n- 较早经过。",
      budget: {
        shortTermHistoryBudgetTokens: 10,
        summaryWarmupThresholdTokens: 6,
        summaryUpdateThresholdTokens: 5,
        currentUserWarningThresholdTokens: 20,
        currentUserHardLimitTokens: 24
      }
    });

    expect(plan.includedMessages.map((item) => item.id)).toEqual(["current"]);
    expect(plan.omittedMessages.map((item) => item.id)).toEqual(["old"]);
    expect(plan.warnings).toContain("currentUserLongInput");
    expect(plan.warnings).toContain("currentUserHardLimitExceeded");
  });

  it("uses a centralized token estimator", () => {
    expect(estimateTextTokens("")).toBe(0);
    expect(estimateTextTokens("abc")).toBe(3);
  });

  it("records system prompt token estimates for context audits", () => {
    const plan = buildCounselingContextPlan({
      systemPrompt: "system",
      messages: [message("m1", "hello")]
    });

    expect(plan.systemPromptTokens).toBe(6);
  });

  it("budgets one consultation memo separately from current conversation history", () => {
    const plan = buildCounselingContextPlan({
      systemPrompt: "system",
      messages: [message("current", "当下表达")],
      consultationMemo: `${"备忘".repeat(80)}备忘尾部不应进入`,
      budget: {
        consultationMemoBudgetTokens: 70
      }
    });

    expect(plan.includedMessages.map((item) => item.id)).toEqual(["current"]);
    expect(plan.consultationMemoSelection).toEqual(expect.objectContaining({
      available: true,
      injected: true,
      originalTokens: 168,
      injectedTokens: 70,
      truncated: true
    }));
    expect(plan.consultationMemoSelection.content).not.toContain("备忘尾部不应进入");
  });

  it("budgets basic profile separately from the consultation memo and current history", () => {
    const plan = buildCounselingContextPlan({
      systemPrompt: "system",
      messages: [message("current", "当下表达")],
      basicProfile: `${"资料".repeat(80)}资料尾部不应进入`,
      consultationMemo: "下一次咨询备忘录",
      budget: {
        basicProfileBudgetTokens: 70
      }
    });

    expect(plan.includedMessages.map((item) => item.id)).toEqual(["current"]);
    expect(plan.basicProfileSelection).toEqual(
      expect.objectContaining({
        available: true,
        injected: true,
        originalTokens: 168,
        injectedTokens: 70,
        truncated: true
      })
    );
    expect(plan.basicProfileSelection.content).not.toContain("资料尾部不应进入");
    expect(plan.consultationMemoSelection).toEqual(expect.objectContaining({
      available: true,
      injected: true,
      originalTokens: 8,
      truncated: false
    }));
  });

  it("builds a sanitized context audit without message content", () => {
    const plan = buildCounselingContextPlan({
      systemPrompt: "system prompt",
      messages: [message("old", "secret old content"), message("current", "secret current content")],
      rollingSummary: "summary",
      basicProfile: "private profile content",
      consultationMemo: "consultation memo metadata",
      budget: {
        shortTermHistoryBudgetTokens: 22,
        summaryWarmupThresholdTokens: 10,
        summaryUpdateThresholdTokens: 5,
        currentUserWarningThresholdTokens: 15,
        currentUserHardLimitTokens: 30
      }
    });

    const audit = buildContextPlanAudit({
      requestId: "r1",
      sessionId: "s-budget",
      source: "electron",
      modelName: "deepseek-v4-flash",
      plan
    });

    expect(audit).toMatchObject({
      requestId: "r1",
      sessionId: "s-budget",
      source: "electron",
      modelName: "deepseek-v4-flash",
      basicProfile: { available: true, injected: true },
      consultationMemo: { available: true, injected: true },
      rollingSummary: { available: true, injected: true },
      messageSelection: {
        includedCount: 1,
        omittedCount: 1
      }
    });
    expect(audit.messageSelection.included[0]).toMatchObject({ id: "current", role: "user", tokens: 22 });
    expect(audit.messageSelection.omitted[0]).toMatchObject({ id: "old", role: "user", tokens: 18 });
    expect(audit.consultationMemo).toEqual(expect.objectContaining({
      originalTokens: 26,
      injectedTokens: 26,
      truncated: false
    }));
    expect(JSON.stringify(audit)).not.toContain("secret");
    expect(JSON.stringify(audit)).not.toContain("private profile content");
  });

  it("accepts a sanitized context audit", () => {
    const plan = buildCounselingContextPlan({
      systemPrompt: "system prompt",
      messages: [message("m1", "private content")]
    });
    const audit = buildContextPlanAudit({
      requestId: "r-safe",
      sessionId: "s-budget",
      source: "electron",
      modelName: "deepseek-v4-flash",
      plan
    });

    expect(() => assertContextPlanAuditIsSanitized(audit)).not.toThrow();
  });

  it("rejects context audits polluted with sensitive content fields", () => {
    const plan = buildCounselingContextPlan({
      messages: [message("m1", "private content")]
    });
    const audit = buildContextPlanAudit({
      requestId: "r-unsafe",
      sessionId: "s-budget",
      source: "electron",
      modelName: "deepseek-v4-flash",
      plan
    }) as unknown as Record<string, unknown>;

    audit.messageSelection = {
      ...audit.messageSelection as Record<string, unknown>,
      included: [
        {
          id: "m1",
          role: "user",
          tokens: 15,
          content: "private content"
        }
      ]
    };

    expect(() => assertContextPlanAuditIsSanitized(audit)).toThrow(/敏感字段/);
  });
});
