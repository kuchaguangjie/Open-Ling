import { describe, expect, it, vi } from "vitest";
import type { CounselingSession, SessionLetter } from "@shared/index";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectDataExport, saveCollectedDataExport } from "./dataExport.js";

const session: CounselingSession = {
  id: "session-1",
  title: "一次会谈",
  counselorId: "chengling",
  roomThemeId: "warm-study",
  modelName: "deepseek-v4-flash",
  startedAt: "2026-07-13T08:00:00.000Z",
  status: "ended"
};

const letters: SessionLetter[] = [
  {
    id: "letter-ready",
    sessionId: session.id,
    counselorId: session.counselorId,
    modelName: "deepseek-v4-pro",
    letterMd: "这是一封已完成的信。",
    status: "ready",
    createdAt: "2026-07-13T09:00:00.000Z",
    updatedAt: "2026-07-13T09:00:00.000Z"
  },
  {
    id: "letter-failed",
    sessionId: session.id,
    counselorId: session.counselorId,
    modelName: "deepseek-v4-pro",
    letterMd: "失败信件不应导出。",
    status: "failed",
    createdAt: "2026-07-13T09:00:00.000Z",
    updatedAt: "2026-07-13T09:00:00.000Z"
  }
];

describe("collectDataExport", () => {
  it("loads messages for session exports and returns stable counts and filename", async () => {
    const listMessages = vi.fn(async () => [
      {
        id: "message-1",
        sessionId: session.id,
        role: "user" as const,
        content: "会谈正文",
        createdAt: "2026-07-13T08:01:00.000Z"
      }
    ]);
    const result = await collectDataExport(
      {
        sessions: { list: async () => [session] },
        messages: { listBySessionId: listMessages },
        sessionLetters: { list: async () => letters }
      },
      "all",
      "2026-07-13T10:00:00.000Z"
    );

    expect(listMessages).toHaveBeenCalledWith(session.id);
    expect(result.fileName).toBe("Ling-会谈与来信-2026-07-13.md");
    expect(result.sessionCount).toBe(1);
    expect(result.letterCount).toBe(1);
    expect(result.content).toContain("会谈正文");
    expect(result.content).toContain("这是一封已完成的信。");
    expect(result.content).not.toContain("失败信件不应导出。");
  });

  it("does not load messages for a letters-only export", async () => {
    const listMessages = vi.fn(async () => []);
    const result = await collectDataExport(
      {
        sessions: { list: async () => [session] },
        messages: { listBySessionId: listMessages },
        sessionLetters: { list: async () => letters }
      },
      "letters",
      "2026-07-13T10:00:00.000Z"
    );

    expect(listMessages).not.toHaveBeenCalled();
    expect(result.sessionCount).toBe(0);
    expect(result.letterCount).toBe(1);
  });

  it("uses the computer's local calendar date in the filename", async () => {
    const localTime = new Date(2026, 6, 13, 23, 30).toISOString();
    const result = await collectDataExport(
      {
        sessions: { list: async () => [session] },
        messages: { listBySessionId: async () => [] },
        sessionLetters: { list: async () => [] }
      },
      "sessions",
      localTime
    );

    expect(result.fileName).toBe("Ling-会谈记录-2026-07-13.md");
  });

  it("writes the generated Markdown as UTF-8 without altering Chinese content", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-data-export-"));
    const filePath = join(directory, "会谈与来信.md");
    const archive = {
      content: "# Ling 会谈与来信\n\n这是会谈正文。\n",
      fileName: "Ling-会谈与来信-2026-07-13.md",
      sessionCount: 1,
      letterCount: 1
    };

    try {
      await saveCollectedDataExport(archive, filePath);
      expect(await readFile(filePath, "utf8")).toBe(archive.content);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
