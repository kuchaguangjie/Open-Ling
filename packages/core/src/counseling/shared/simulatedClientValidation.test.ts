// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  assertSimulatedClientPromptIsIsolated,
  buildRealClientValidationReport,
  buildSimulatedClientMessages
} from "./simulatedClientValidation";

describe("simulated client validation", () => {
  it("shows the private client prompt only to the simulated client", () => {
    const messages = buildSimulatedClientMessages({
      clientPrompt: "# 来访者私密设定\n\n你害怕被快速定义。",
      conversation: [
        { role: "assistant", content: "我想听听你这周最难受的时刻。" },
        { role: "user", content: "我不知道该从哪里说。" }
      ]
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("来访者私密设定");
    expect(messages.map((message) => message.content).join("\n")).not.toContain("程灵核心");
    expect(messages[1].content).toContain("assistant: 我想听听你这周最难受的时刻。");
    expect(messages[1].content).toContain("user: 我不知道该从哪里说。");
  });

  it("renders prompts, transcripts, requests and artifacts without credentials", () => {
    const report = buildRealClientValidationReport({
      clientFileName: "client_simulator_aa.txt",
      clientPrompt: "# 顾清\n\n你害怕被控制。",
      modelName: "deepseek-v4-pro",
      apiBaseUrl: "https://api.deepseek.com",
      sessions: [{
        title: "第 1 次会谈",
        messages: [
          { role: "user", content: "我不喜欢别人替我安排。" },
          { role: "assistant", content: "你不想被安排。" }
        ],
        artifacts: [{ title: "本次会谈督导意见", content: "仍需保持开放。" }]
      }],
      modelRequests: [{
        stage: "督导",
        maxTokens: 2200,
        messages: [{ role: "system", content: "督导场景" }]
      }],
      checks: ["模拟来访者提示词未出现在督导请求中。"],
      ...{ apiKey: "super-secret" }
    });

    expect(report).toContain("client_simulator_aa.txt");
    expect(report).toContain("我不喜欢别人替我安排。");
    expect(report).toContain("督导场景");
    expect(report).toContain("本次会谈督导意见");
    expect(report).not.toContain("super-secret");
  });

  it("rejects a private client prompt in downstream counseling requests", () => {
    const clientPrompt = "# 私密来访者设定\n\n不会提供给咨询师。";
    expect(() => assertSimulatedClientPromptIsIsolated({
      clientPrompt,
      downstreamRequests: [{
        stage: "咨询师回复",
        messages: [{ role: "system", content: `程灵核心\n\n${clientPrompt}` }]
      }]
    })).toThrow("simulated client prompt leaked into 咨询师回复");

    expect(() => assertSimulatedClientPromptIsIsolated({
      clientPrompt,
      downstreamRequests: [{
        stage: "咨询师回复",
        messages: [{ role: "system", content: "程灵核心" }]
      }]
    })).not.toThrow();
  });
});
