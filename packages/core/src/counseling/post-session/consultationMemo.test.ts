// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { LlmProvider } from "../../providers/llmProvider";
import {
  buildConsultationMemoMessages,
  createConsultationMemoDraft,
  parseConsultationMemoOutput
} from "./consultationMemo";

describe("consultation memo", () => {
  it("parses one concise memo and rejects an empty memo", () => {
    expect(parseConsultationMemoOutput('{"memoMd":"# 下一次咨询备忘录\\n\\n保持开放。"}')).toEqual({
      memoMd: "# 咨询备忘录\n\n保持开放。"
    });
    expect(() => parseConsultationMemoOutput('{"memoMd":""}')).toThrow("consultation memo missing memoMd");
  });

  it("rejects a memo that exceeds the frozen-context budget", () => {
    expect(() => parseConsultationMemoOutput(JSON.stringify({
      memoMd: "备忘".repeat(2_501)
    }))).toThrow("consultation memo exceeds 5000 characters");
  });

  it("asks the original counselor to digest rather than copy supervision", () => {
    const messages = buildConsultationMemoMessages({
      counselorId: "chengling",
      counselorName: "程灵",
      counselorCorePrompt: "# 冻结的程灵核心",
      counselorVoicePrompt: "# 冻结的程灵语言风格",
      sessionMessages: [
        {
          id: "u1",
          sessionId: "session-1",
          role: "user",
          content: "如果你把我理解成自卑，我会不舒服。",
          createdAt: "2026-07-11T10:00:00.000Z",
          status: "sent"
        },
        {
          id: "a1",
          sessionId: "session-1",
          role: "assistant",
          content: "我听见你担心被误解。",
          createdAt: "2026-07-11T10:01:00.000Z",
          status: "sent"
        }
      ],
      sessionConceptualizationMd: "# 本次会谈个案概念化\n\n来访者谈到同事。",
      longTermConceptualizationMd: "# 长期个案概念化\n\n关系中的自我怀疑仍需开放。",
      supervisionMd: "# 本次会谈督导意见\n\n不要过早确认旧假设。"
    });

    expect(messages[0].content).toContain("冻结的程灵核心");
    expect(messages[0].content).toContain("当前场景｜咨询备忘录");
    expect(messages[0].content.indexOf("当前场景｜咨询备忘录")).toBeLessThan(
      messages[0].content.indexOf("冻结的程灵语言风格")
    );
    expect(messages[0].content.trimEnd().endsWith("# 冻结的程灵语言风格")).toBe(true);
    expect(messages[0].content).not.toContain("# 下一次咨询备忘录");
    expect(messages[0].content).toContain("600–1000");
    expect(messages[0].content).toContain("不能因为督导师提出了某个观点");
    expect(messages[0].content).toContain("短材料");
    expect(messages[0].content).toContain("已经完成修复、已经形成合作或已经发生变化");
    expect(messages[0].content).toContain("不能单独证明关系已经改善");
    expect(messages[0].content).toContain("不使用“创伤反应”“安全同盟”");
    expect(messages[0].content).toContain("以下 3 个章节");
    expect(messages[1].content).toContain("## 单次完整个案概念化");
    expect(messages[1].content).toContain("## 本次会谈原文（仅用于核对材料归属）");
    expect(messages[1].content).toContain("user: 如果你把我理解成自卑，我会不舒服。");
    expect(messages[1].content).toContain("assistant: 我听见你担心被误解。");
    expect(messages[1].content.indexOf("本次会谈原文")).toBeLessThan(
      messages[1].content.indexOf("单次完整个案概念化")
    );
    expect(messages[1].content).toContain("## 最新长期完整个案概念化");
    expect(messages[1].content).toContain("## 李燕云督导意见");
  });

  it("creates a ready memo owned by the original counselor", async () => {
    const provider: LlmProvider = {
      complete: async () => ({ content: JSON.stringify({ memoMd: "# 下一次咨询备忘录\n\n保持开放。" }) }),
      stream: async function* () { yield { type: "status", status: "done" }; }
    };

    await expect(createConsultationMemoDraft({
      provider,
      preparationId: "preparation-1",
      sourceSessionId: "session-1",
      counselorId: "chengling",
      counselorName: "程灵",
      counselorCorePrompt: "# 程灵核心",
      sessionMessages: [],
      sessionConceptualizationMd: "# 本次会谈个案概念化",
      supervisionMd: "# 本次会谈督导意见",
      modelName: "deepseek-v4-pro",
      now: "2026-07-11T10:20:00.000Z"
    })).resolves.toMatchObject({
      id: "consultation-memo-preparation-1",
      preparationId: "preparation-1",
      sourceSessionId: "session-1",
      counselorId: "chengling",
      memoMd: "# 咨询备忘录\n\n保持开放。",
      status: "ready"
    });
  });

  it("uses a compact output budget for the frozen memo", async () => {
    const complete = vi.fn(async () => ({ content: JSON.stringify({ memoMd: "# 咨询备忘录\n\n保持开放。" }) }));
    const provider: LlmProvider = {
      complete,
      stream: async function* () { yield { type: "status", status: "done" }; }
    };

    await createConsultationMemoDraft({
      provider,
      preparationId: "preparation-budget",
      sourceSessionId: "session-budget",
      counselorId: "chengling",
      counselorName: "程灵",
      counselorCorePrompt: "# 程灵核心",
      sessionMessages: [],
      sessionConceptualizationMd: "# 本次会谈个案概念化",
      supervisionMd: "# 本次会谈督导意见",
      modelName: "deepseek-v4-pro"
    });

    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 4096 }));
  });
});
