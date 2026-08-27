import { describe, expect, it, vi } from "vitest";
import type { SessionMessage } from "@shared/index";
import {
  createSessionTitleDraft,
  isDefaultSessionTitle,
  normalizeSessionTitle
} from "./sessionTitle";

const baseMessage = {
  sessionId: "session-title",
  createdAt: "2026-07-05T10:00:00.000Z",
  status: "sent" as const
};

function message(id: string, role: SessionMessage["role"], content: string, status: SessionMessage["status"] = "sent"): SessionMessage {
  return {
    ...baseMessage,
    id,
    role,
    content,
    status
  };
}

describe("session title agent", () => {
  it("recognizes only Ling default session titles as auto-replaceable", () => {
    expect(isDefaultSessionTitle("与周舟的会谈 · session 1")).toBe(true);
    expect(isDefaultSessionTitle("与程灵的会谈 · session 12")).toBe(true);
    expect(isDefaultSessionTitle("与周舟的会谈 · 2026年7月7日 · session 1")).toBe(true);
    expect(isDefaultSessionTitle("与程灵的会谈 · 2026年12月31日 · session 12")).toBe(true);
    expect(isDefaultSessionTitle("与程灵的会谈 · 7月5日 A")).toBe(true);
    expect(isDefaultSessionTitle("与林乐水的会谈 · 12月31日 Z")).toBe(true);
    expect(isDefaultSessionTitle("用户自己改过的标题")).toBe(false);
  });

  it("normalizes generated titles to at most 10 Chinese display characters", () => {
    expect(normalizeSessionTitle("  《关于工作压力和边界感的长标题》  ")).toBe("工作压力和边界感");
    expect(Array.from(normalizeSessionTitle("这是一个非常非常长的标题")).length).toBeLessThanOrEqual(10);
  });

  it("generates a short title from the first real conversation messages", async () => {
    const provider = {
      complete: vi.fn(async (_request: unknown) => ({ content: " 工作压力和边界感需要整理 " })),
      stream: vi.fn()
    };

    const title = await createSessionTitleDraft({
      provider,
      sessionId: "session-title",
      messages: [
        message("welcome", "assistant", "我在这里。你可以慢慢说。"),
        message("failed", "user", "失败消息不该进入标题", "failed"),
        message("u1", "user", "最近工作压力很大，边界感也很混乱。"),
        message("a1", "assistant", "我听到你一边想做好工作，一边也很累。")
      ]
    });

    expect(title).toBe("工作压力和边界感");
    expect(provider.complete).toHaveBeenCalledWith({
      maxTokens: 32,
      messages: expect.arrayContaining([
        expect.objectContaining({ id: "session-title-system", role: "system" }),
        expect.objectContaining({
          id: "session-title-user",
          role: "user",
          content: expect.stringContaining("最近工作压力很大")
        })
      ])
    });
    const request = provider.complete.mock.calls[0]?.[0] as { messages: SessionMessage[] } | undefined;
    expect(request?.messages[1]?.content).not.toContain("失败消息");
    expect(request?.messages[1]?.content).not.toContain("我在这里");
  });
});
