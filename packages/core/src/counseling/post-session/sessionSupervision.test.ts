// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { LlmProvider } from "../../providers/llmProvider";
import {
  buildSessionSupervisionMessages,
  createSessionSupervisionDraft,
  parseSessionSupervisionOutput
} from "./sessionSupervision";

describe("session supervision", () => {
  it("parses Li Yanyun's supervision report", () => {
    expect(parseSessionSupervisionOutput(`\`\`\`json
{"supervisionMd":"# 本次会谈督导意见\\n\\n## 值得保留的工作\\n咨询师放慢了节奏。"}
\`\`\``)).toEqual({
      supervisionMd: "# 本次会谈督导意见\n\n## 值得保留的工作\n咨询师放慢了节奏。"
    });
    expect(() => parseSessionSupervisionOutput("{}")).toThrow("session supervision missing supervisionMd");
  });

  it("rejects a supervision report that exceeds the review budget", () => {
    expect(() => parseSessionSupervisionOutput(JSON.stringify({
      supervisionMd: "督导".repeat(4_001)
    }))).toThrow("session supervision exceeds 8000 characters (8002)");
  });

  it("keeps Li Yanyun independent and presents the transcript before conceptualizations", () => {
    const messages = buildSessionSupervisionMessages({
      counselorId: "chengling",
      counselorName: "程灵",
      counselorCorePrompt: "# 程灵核心\n\n关注情绪与关系。",
      counselorVoicePrompt: "# 程灵语言与表达风格\n\n自然、松弛、有关系感。",
      sessionMessages: [
        {
          id: "u1",
          sessionId: "session-1",
          role: "user",
          content: "我怕同事觉得我不够好。",
          createdAt: "2026-07-11T10:00:00.000Z",
          status: "sent"
        },
        {
          id: "a1",
          sessionId: "session-1",
          role: "assistant",
          content: "你好像很快把责任放回自己身上。",
          createdAt: "2026-07-11T10:01:00.000Z",
          status: "sent"
        }
      ],
      sessionConceptualizationMd: "# 本次会谈个案概念化\n\n暂时理解为自我评价压力。",
      longTermConceptualizationMd: "# 长期个案概念化\n\n旧理解仍需修正。"
    });

    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("你叫李燕云");
    expect(messages[0].content).toContain("当前场景｜单次会谈结束后的督导审阅");
    expect(messages[0].content).toContain("条件句、担心或假设");
    expect(messages[0].content).toContain("不能据此认定咨询师实际做过");
    expect(messages[0].content).toContain("每节最多 1–3 条");
    expect(messages[0].content).toContain("不以判断咨询师做得好不好为目标");
    expect(messages[0].content).toContain("不得把咨询师的回应写成有效、成功");
    expect(messages[0].content).not.toContain("# 程灵核心");
    expect(messages[0].content).not.toContain("# 程灵语言与表达风格");
    expect(messages[1].content).toContain("## 1. 本次会谈完整原文");
    expect(messages[1].content).toContain("user: 我怕同事觉得我不够好。");
    expect(messages[1].content).toContain("assistant: 你好像很快把责任放回自己身上。");
    expect(messages[1].content.indexOf("## 1. 本次会谈完整原文")).toBeLessThan(
      messages[1].content.indexOf("## 2. 被督导咨询师核心取向")
    );
    expect(messages[1].content.indexOf("## 2. 被督导咨询师核心取向")).toBeLessThan(
      messages[1].content.indexOf("## 3. 单次完整个案概念化")
    );
    expect(messages[1].content).toContain("# 程灵核心");
    expect(messages[1].content).toContain("# 长期个案概念化");
    expect(messages[1].content).toContain("## 被督导咨询师的语言与表达风格（仅作评估参考）");
    expect(messages[1].content).toContain("不得决定或模仿李燕云督导报告的表达方式");
    expect(messages[1].content.indexOf("# 长期个案概念化")).toBeLessThan(
      messages[1].content.indexOf("# 程灵语言与表达风格")
    );
    expect(messages[1].content.trimEnd().endsWith("自然、松弛、有关系感。")).toBe(true);
  });

  it("creates a ready supervision draft", async () => {
    const provider: LlmProvider = {
      complete: async () => ({ content: JSON.stringify({ supervisionMd: "# 本次会谈督导意见\n\n保持开放。" }) }),
      stream: async function* () { yield { type: "status", status: "done" }; }
    };

    await expect(createSessionSupervisionDraft({
      provider,
      preparationId: "preparation-1",
      sessionId: "session-1",
      counselorId: "chengling",
      counselorName: "程灵",
      counselorCorePrompt: "# 程灵核心",
      sessionMessages: [],
      sessionConceptualizationMd: "# 本次会谈个案概念化",
      modelName: "deepseek-v4-pro",
      now: "2026-07-11T10:10:00.000Z"
    })).resolves.toMatchObject({
      id: "supervision-preparation-1",
      preparationId: "preparation-1",
      supervisorId: "li-yanyun",
      supervisionMd: "# 本次会谈督导意见\n\n保持开放。",
      status: "ready"
    });
  });

  it("uses a compact output budget for the final supervision report", async () => {
    const complete = vi.fn(async () => ({
      content: JSON.stringify({ supervisionMd: "# 本次会谈督导意见\n\n保持开放。" })
    }));
    const provider: LlmProvider = {
      complete,
      stream: async function* () { yield { type: "status", status: "done" }; }
    };

    await createSessionSupervisionDraft({
      provider,
      preparationId: "preparation-budget",
      sessionId: "session-budget",
      counselorId: "chengling",
      counselorName: "程灵",
      counselorCorePrompt: "# 程灵核心",
      sessionMessages: [],
      sessionConceptualizationMd: "# 本次会谈个案概念化",
      modelName: "deepseek-v4-pro"
    });

    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ maxTokens: 6144 }));
  });

  it("reviews an oversized transcript in ordered chunks before the final supervision", async () => {
    const requests: Array<{ messages: Array<{ content: string }> }> = [];
    const complete = vi.fn(async (request) => {
      requests.push(request);
      const isChunk = request.messages[0].content.includes("分段原文审阅场景");
      return {
        content: JSON.stringify({
          supervisionMd: isChunk
            ? `分段记录 ${requests.length}`
            : "# 本次会谈督导意见\n\n已综合全部分段。"
        })
      };
    });
    const provider: LlmProvider = {
      complete,
      stream: async function* () { yield { type: "status", status: "done" }; }
    };

    const draft = await createSessionSupervisionDraft({
      provider,
      preparationId: "preparation-long",
      sessionId: "session-long",
      counselorId: "chengling",
      counselorName: "程灵",
      counselorCorePrompt: "# 程灵核心",
      sessionMessages: [
        {
          id: "u-long",
          sessionId: "session-long",
          role: "user",
          content: `开头线索${"用户材料".repeat(9_000)}`,
          createdAt: "2026-07-11T10:00:00.000Z",
          status: "sent"
        },
        {
          id: "a-long",
          sessionId: "session-long",
          role: "assistant",
          content: `承接线索${"咨询师回应".repeat(5_000)}`,
          createdAt: "2026-07-11T10:01:00.000Z",
          status: "sent"
        }
      ],
      sessionConceptualizationMd: "# 本次会谈个案概念化",
      modelName: "deepseek-v4-pro"
    });

    expect(complete.mock.calls.length).toBeGreaterThan(2);
    expect(requests[0].messages[1].content).toContain("开头线索");
    expect(requests.at(-2)?.messages[1].content).toContain("承接线索");
    expect(requests.at(-1)?.messages[1].content).toContain("本次会谈完整原文的分段审阅记录");
    expect(requests.at(-1)?.messages[1].content).toContain("分段记录 1");
    expect(draft.supervisionMd).toContain("已综合全部分段");
  });
});
