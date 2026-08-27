// @vitest-environment node
import { describe, expect, it } from "vitest";
import { exportJson } from "./jsonExporter.js";
import { exportSessionMarkdown } from "./markdownExporter.js";
import type { CounselingSession, SessionMessage } from "@shared/index";

const sampleSession: CounselingSession = {
  id: "session-export-1",
  title: "第一次会谈",
  counselorId: "chengling",
  roomThemeId: "quiet-study",
  teamId: "default-team",
  modelName: "test-model",
  createdAt: "2026-07-03T09:00:00.000Z",
  updatedAt: "2026-07-03T09:30:00.000Z",
  startedAt: "2026-07-03T09:00:00.000Z",
  endedAt: "2026-07-03T09:30:00.000Z",
  status: "ended",
  summary: "用户讨论了工作压力相关的话题。"
};

const sampleMessages: SessionMessage[] = [
  {
    id: "msg-1",
    sessionId: "session-export-1",
    role: "user",
    content: "最近工作压力很大，感觉喘不过气来。",
    createdAt: "2026-07-03T09:01:00.000Z",
    status: "sent"
  },
  {
    id: "msg-2",
    sessionId: "session-export-1",
    role: "assistant",
    content: "我听到你说工作压力很大。能不能具体说说，是什么样的压力？",
    createdAt: "2026-07-03T09:02:00.000Z",
    status: "sent",
    metadata: { source: "counselor" }
  }
];

describe("JSON exporter", () => {
  it("exports a session with messages as stable JSON", () => {
    const result = exportJson({ session: sampleSession, messages: sampleMessages });
    const parsed = JSON.parse(result);

    expect(parsed).toHaveProperty("session");
    expect(parsed).toHaveProperty("messages");
    expect(parsed.session.id).toBe("session-export-1");
    expect(parsed.session.title).toBe("第一次会谈");
    expect(parsed.session.counselorId).toBe("chengling");
    expect(parsed.messages).toHaveLength(2);
    expect(parsed.messages[0].content).toBe("最近工作压力很大，感觉喘不过气来。");
    expect(parsed.messages[1].role).toBe("assistant");
  });

  it("exports an empty messages list", () => {
    const result = exportJson({ session: sampleSession, messages: [] });
    const parsed = JSON.parse(result);

    expect(parsed.session.id).toBe("session-export-1");
    expect(parsed.messages).toEqual([]);
  });

  it("pretty-prints JSON with 2-space indentation", () => {
    // The exportJson function should use 2-space indentation by default
    const result = exportJson({ session: sampleSession, messages: sampleMessages });
    expect(result).toContain('\n  "session"');
    expect(result).toContain('\n  "messages"');
  });
});

describe("Markdown exporter", () => {
  it("exports a session with messages as readable Markdown", () => {
    const result = exportSessionMarkdown(sampleSession, sampleMessages);

    // Session metadata should be present
    expect(result).toContain("# 第一次会谈");
    expect(result).toContain("chengling");
    expect(result).toContain("test-model");
    expect(result).toContain("ended");

    // Messages should be present
    expect(result).toContain("最近工作压力很大，感觉喘不过气来。");
    expect(result).toContain("我听到你说工作压力很大。能不能具体说说，是什么样的压力？");
  });

  it("exports a session with empty messages list", () => {
    const result = exportSessionMarkdown(sampleSession, []);

    expect(result).toContain("# 第一次会谈");
    expect(result).toContain("chengling");
  });

  it("includes message role labels in the export", () => {
    const result = exportSessionMarkdown(sampleSession, sampleMessages);

    // Role markers help readability
    expect(result).toContain("用户");
    expect(result).toContain("咨询师");
  });
});
