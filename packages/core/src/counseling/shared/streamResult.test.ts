// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildAssistantStreamDraftMessage,
  buildAssistantStreamProgressMessage,
  buildAssistantStreamResultMessage
} from "./streamResult";

const finishedAt = "2026-07-04T04:00:00.000Z";

describe("buildAssistantStreamResultMessage", () => {
  it("creates a sending assistant draft before streaming starts", () => {
    expect(
      buildAssistantStreamDraftMessage({
        id: "assistant-draft",
        sessionId: "s1",
        createdAt: finishedAt
      })
    ).toEqual({
      id: "assistant-draft",
      sessionId: "s1",
      role: "assistant",
      content: "",
      createdAt: finishedAt,
      status: "sending"
    });
  });

  it("updates a sending assistant draft with partial stream content", () => {
    expect(
      buildAssistantStreamProgressMessage({
        id: "assistant-draft",
        sessionId: "s1",
        content: "部分内容",
        createdAt: finishedAt
      })
    ).toMatchObject({
      id: "assistant-draft",
      content: "部分内容",
      status: "sending"
    });
  });

  it("discards partial content and leaves a retryable state when a stream is cancelled", () => {
    expect(
      buildAssistantStreamResultMessage({
        id: "assistant-draft",
        sessionId: "s1",
        content: "已经生成的部分",
        finishedAt,
        outcome: "cancelled"
      })
    ).toMatchObject({
      id: "assistant-draft",
      sessionId: "s1",
      role: "assistant",
      content: "已停止，可重试。",
      status: "failed"
    });
  });

  it("marks an empty cancelled stream as failed with a safe fallback", () => {
    expect(
      buildAssistantStreamResultMessage({
        sessionId: "s1",
        content: "",
        finishedAt,
        outcome: "cancelled"
      })
    ).toMatchObject({
      content: "已停止，可重试。",
      status: "failed"
    });
  });

  it("uses a safe failed message for model errors without leaking provider details", () => {
    expect(
      buildAssistantStreamResultMessage({
        sessionId: "s1",
        content: "",
        finishedAt,
        outcome: "error"
      })
    ).toMatchObject({
      content: "没有连接到模型服务。请到“设置 → 模型接入”测试当前配置后重试。",
      status: "failed"
    });
  });
});
