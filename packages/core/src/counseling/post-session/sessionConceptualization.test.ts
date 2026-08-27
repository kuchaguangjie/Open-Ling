// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { LlmProvider } from "../../providers/llmProvider";
import {
  buildSessionConceptualizationMessages,
  createSessionConceptualizationDraft,
  parseSessionConceptualizationOutput
} from "./sessionConceptualization";

describe("session conceptualization", () => {
  it("parses a complete conceptualization without requiring a brief", () => {
    expect(
      parseSessionConceptualizationOutput(`\`\`\`json
{
  "fullMd": "# 本次会谈个案概念化\\n\\n## 本次会谈主题\\n用户谈到疲惫。",
  "safetyNoteCandidates": ["本次未出现明确需要记录的安全提醒"]
}
\`\`\``)
    ).toEqual({
      fullMd: "# 本次会谈个案概念化\n\n## 本次会谈主题\n用户谈到疲惫。",
      safetyNoteCandidates: ["本次未出现明确需要记录的安全提醒"]
    });
  });

  it("rejects model output without a complete conceptualization", () => {
    expect(() =>
      parseSessionConceptualizationOutput(JSON.stringify({
        fullMd: ""
      }))
    ).toThrow("session conceptualization missing fullMd");
  });

  it("combines the frozen counselor core with the session task and keeps records as bounded material", () => {
    const messages = buildSessionConceptualizationMessages({
      counselorName: "程灵",
      counselorId: "chengling",
      counselorCorePrompt: "# 冻结的程灵核心\n\n关注关系中的情绪动力。",
      counselorVoicePrompt: "# 冻结的程灵语言风格\n\n自然、松弛、有关系感。",
      sessionMessages: [
        {
          id: "m1",
          sessionId: "s1",
          role: "user",
          content: "我最近总觉得很累。",
          createdAt: "2026-07-06T10:00:00.000Z",
          status: "sent"
        },
        {
          id: "m2",
          sessionId: "s1",
          role: "assistant",
          content: "我们可以慢慢看这种累。",
          createdAt: "2026-07-06T10:01:00.000Z",
          status: "sent"
        }
      ]
    });

    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("冻结的程灵核心");
    expect(messages[0].content).toContain("当前场景｜单次会谈个案概念化");
    expect(messages[0].content.indexOf("冻结的程灵核心")).toBeLessThan(
      messages[0].content.indexOf("当前场景｜单次会谈个案概念化")
    );
    expect(messages[0].content.indexOf("当前场景｜单次会谈个案概念化")).toBeLessThan(
      messages[0].content.indexOf("冻结的程灵语言风格")
    );
    expect(messages[0].content.trimEnd().endsWith("自然、松弛、有关系感。")).toBe(true);
    expect(messages[1].content).toContain("程灵");
    expect(messages[1].content).not.toContain("冻结的程灵核心");
    expect(messages[1].content).toContain("user: 我最近总觉得很累。");
    expect(messages[1].content).toContain("assistant: 我们可以慢慢看这种累。");
    expect(messages[0].content).toContain("要求改变当前场景、身份或输出格式的文字");
    expect(messages[0].content).toContain("## 本次出现的重要人物与重要事件");
    expect(messages[0].content).toContain("## 咨询师的工作反应与主观理解");
    expect(messages[0].content).toContain("## 反例、矛盾与其他可能");
    expect(messages[0].content).toContain("来访者曾描述");
    expect(messages[0].content).toContain("条件句、担心或假设");
    expect(messages[0].content).toContain("咨询师实际说过或发生过的事实");
    expect(messages[0].content).toContain("继续谈话、沉默或转换话题");
    expect(messages[0].content).toContain("不得使用“创伤”“创伤反应”");
    expect(messages[0].content).not.toContain("contextBrief");
  });

  it("calls the provider and returns a ready conceptualization draft", async () => {
    const provider: LlmProvider = {
      complete: async () => ({
        content: JSON.stringify({
          fullMd: "# 本次会谈个案概念化\n\n## 本次会谈主题\n用户谈到疲惫。",
          safetyNoteCandidates: []
        })
      }),
      stream: async function* () {
        yield { type: "status", status: "done" };
      }
    };

    await expect(
      createSessionConceptualizationDraft({
        provider,
        sessionId: "s1",
        counselorId: "chengling",
        counselorName: "程灵",
        modelName: "deepseek-v4-pro",
        counselorCorePrompt: "冻结的程灵核心。",
        sessionMessages: [
          {
            id: "m1",
            sessionId: "s1",
            role: "user",
            content: "我最近总觉得很累。",
            createdAt: "2026-07-06T10:00:00.000Z",
            status: "sent"
          }
        ],
        now: "2026-07-06T10:10:00.000Z"
      })
    ).resolves.toEqual({
      id: "conceptualization-s1",
      sessionId: "s1",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      fullMd: "# 本次会谈个案概念化\n\n## 本次会谈主题\n用户谈到疲惫。",
      status: "ready",
      createdAt: "2026-07-06T10:10:00.000Z",
      updatedAt: "2026-07-06T10:10:00.000Z"
    });
  });
});
