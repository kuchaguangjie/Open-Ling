import { describe, expect, it } from "vitest";
import type { CounselingSession, SessionLetter, SessionMessage } from "@shared/index";
import { exportCounselingArchiveMarkdown } from "./archiveMarkdownExporter.js";

const sessions: CounselingSession[] = [
  {
    id: "session-zhouzhou",
    title: "现实选择",
    counselorId: "zhouzhou",
    roomThemeId: "warm-study",
    modelName: "deepseek-v4-flash",
    startedAt: "2026-07-12T10:00:00.000Z",
    status: "ended"
  },
  {
    id: "session-chengling-new",
    title: "最近的关系",
    counselorId: "chengling",
    roomThemeId: "warm-study",
    modelName: "deepseek-v4-flash",
    startedAt: "2026-07-13T10:00:00.000Z",
    status: "ended"
  },
  {
    id: "session-chengling-old",
    title: "较早的会谈",
    counselorId: "chengling",
    roomThemeId: "warm-study",
    modelName: "deepseek-v4-flash",
    startedAt: "2026-07-10T10:00:00.000Z",
    status: "ended"
  }
];

const messages: SessionMessage[] = [
  {
    id: "assistant",
    sessionId: "session-chengling-new",
    role: "assistant",
    content: "我在听。",
    createdAt: "2026-07-13T10:02:00.000Z"
  },
  {
    id: "system",
    sessionId: "session-chengling-new",
    role: "system",
    content: "内部系统提示",
    createdAt: "2026-07-13T09:59:00.000Z"
  },
  {
    id: "user",
    sessionId: "session-chengling-new",
    role: "user",
    content: "我想谈谈最近的关系。",
    createdAt: "2026-07-13T10:01:00.000Z"
  }
];

const readyLetter: SessionLetter = {
  id: "letter-ready",
  sessionId: "session-chengling-new",
  counselorId: "chengling",
  modelName: "deepseek-v4-pro",
  letterMd: "亲爱的你：\n\n愿你慢慢找到自己的节奏。",
  status: "ready",
  createdAt: "2026-07-13T11:00:00.000Z",
  updatedAt: "2026-07-13T11:00:00.000Z"
};

describe("exportCounselingArchiveMarkdown", () => {
  it("groups by counselor, sorts sessions newest first, and keeps messages oldest first", () => {
    const result = exportCounselingArchiveMarkdown({
      generatedAt: "2026-07-13T12:00:00.000Z",
      scope: "all",
      sessions: sessions.map((session) => ({
        session,
        messages: session.id === "session-chengling-new" ? messages : []
      })),
      letters: [{ letter: readyLetter, session: sessions[1] }]
    });

    expect(result.indexOf("## 程灵")).toBeLessThan(result.indexOf("## 周舟"));
    expect(result.indexOf("#### 最近的关系")).toBeLessThan(result.indexOf("#### 较早的会谈"));
    expect(result.indexOf("我想谈谈最近的关系。")).toBeLessThan(result.indexOf("我在听。"));
    expect(result).not.toContain("内部系统提示");
    expect(result).toContain("愿你慢慢找到自己的节奏。");
  });

  it("exports only ready letters supplied for a letters-only archive", () => {
    const result = exportCounselingArchiveMarkdown({
      generatedAt: "2026-07-13T12:00:00.000Z",
      scope: "letters",
      sessions: [],
      letters: [
        { letter: readyLetter, session: sessions[1] },
        {
          letter: { ...readyLetter, id: "letter-failed", status: "failed", letterMd: "不应导出" },
          session: sessions[1]
        }
      ]
    });

    expect(result).toContain("# Ling 咨询师来信");
    expect(result).toContain("### 咨询师的信");
    expect(result).not.toContain("### 会谈记录");
    expect(result).not.toContain("不应导出");
  });

  it("keeps attachment-only messages as an attachment list", () => {
    const result = exportCounselingArchiveMarkdown({
      generatedAt: "2026-07-13T12:00:00.000Z",
      scope: "sessions",
      sessions: [
        {
          session: sessions[1],
          messages: [
            {
              id: "attachment-only",
              sessionId: sessions[1].id,
              role: "user",
              content: " ",
              createdAt: "2026-07-13T10:03:00.000Z",
              metadata: {
                attachments: [{ title: "会谈笔记.pdf" }],
                importedDocuments: [{ title: "补充资料.md" }]
              }
            }
          ]
        }
      ],
      letters: []
    });

    expect(result).toContain("附带资料：会谈笔记.pdf、补充资料.md");
  });

  it("localizes archive structure without translating user-authored content", () => {
    const result = exportCounselingArchiveMarkdown({
      generatedAt: "2026-07-13T12:00:00.000Z",
      locale: "en-US",
      scope: "all",
      sessions: [{ session: sessions[1], messages }],
      letters: [{ letter: readyLetter, session: sessions[1] }]
    });

    expect(result).toContain("# Ling Sessions & Letters");
    expect(result).toContain("## Cheng Ling");
    expect(result).toContain("### Session records");
    expect(result).toContain("- Counselor: Cheng Ling");
    expect(result).toContain("### Counselor letters");
    expect(result).toContain("我想谈谈最近的关系。");
    expect(result).not.toContain("### 会谈记录");
  });
});
