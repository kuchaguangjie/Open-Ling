// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createConsultationMemoRepository,
  createConsultationPreparationRepository,
  createLingDatabase,
  createLongTermConceptualizationRepository,
  createMessageRepository,
  createRollingSummaryRepository,
  createSessionConceptualizationRepository,
  createSessionRepository,
  createSessionSupervisionRepository,
  type LingDatabase
} from "../../../../../packages/database/src/index";
import type { LlmProvider } from "../../../../../packages/core/src/providers/llmProvider";
import { loadDirectoryCounselorPackage } from "../../../../../packages/core/src/counselors/directoryCounselorPackageLoader";
import { counselorPackageRegistry } from "../../../../../packages/shared/src/index";
import { runConsultationPreparation } from "./consultationPreparation";

describe("consultation preparation orchestration", () => {
  let db: LingDatabase;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "ling-preparation-"));
    db = createLingDatabase({ path: join(tempDir, "ling.sqlite") });
  });

  afterEach(() => {
    if (counselorPackageRegistry.get("community-preparation-test")) {
      counselorPackageRegistry.unregister("community-preparation-test");
    }
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("publishes single conceptualization, Li Yanyun supervision, and memo for a first session", async () => {
    const repositories = createRepositories(db);
    const endedAt = "2026-07-11T10:00:00.000Z";
    await repositories.sessions.create({
      id: "session-1",
      title: "第一次会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      modelName: "deepseek-v4-pro",
      status: "ended",
      createdAt: "2026-07-11T09:00:00.000Z",
      updatedAt: endedAt,
      endedAt
    });
    await repositories.messages.append({
      id: "user-1",
      sessionId: "session-1",
      role: "user",
      content: "我担心同事觉得我不够好。",
      status: "sent",
      createdAt: "2026-07-11T09:10:00.000Z"
    });
    await repositories.preparations.upsert({
      id: "preparation-1",
      sessionId: "session-1",
      counselorId: "chengling",
      sourceEndedAt: endedAt,
      modelName: "deepseek-v4-pro",
      status: "pending",
      phase: "session-conceptualization",
      createdAt: endedAt,
      updatedAt: endedAt
    });
    const outputs = [
      { fullMd: "# 本次会谈个案概念化\n\n## 本次会谈主题与来访者主体体验\n担心评价。" },
      { supervisionMd: "# 本次会谈督导意见\n\n咨询师需要保留其他理解。" },
      { memoMd: "# 下一次咨询备忘录\n\n来访者担心同事评价，仍需保持开放。" }
    ];
    let callIndex = 0;
    const provider: LlmProvider = {
      complete: async () => ({ content: JSON.stringify(outputs[callIndex++]) }),
      stream: async function* () { yield { type: "status", status: "done" }; }
    };

    await expect(runConsultationPreparation({
      sessionId: "session-1",
      preparationId: "preparation-1",
      sourceEndedAt: endedAt,
      provider,
      modelName: "deepseek-v4-pro",
      repositories,
      now: () => "2026-07-11T10:05:00.000Z"
    })).resolves.toBe("published");

    expect(callIndex).toBe(3);
    await expect(repositories.preparations.getBySessionId("session-1")).resolves.toMatchObject({
      status: "ready",
      phase: "complete"
    });
    await expect(repositories.conceptualizations.getBySessionId("session-1")).resolves.toMatchObject({
      fullMd: expect.stringContaining("担心评价")
    });
    await expect(repositories.supervisions.getBySessionId("session-1")).resolves.toMatchObject({
      supervisorId: "li-yanyun"
    });
    await expect(repositories.memos.getLatestReadyByCounselorId("chengling")).resolves.toMatchObject({
      memoMd: expect.stringContaining("保持开放")
    });
  });

  it("updates the full long-term conceptualization before supervision and memo from the second session onward", async () => {
    const repositories = createRepositories(db);
    const firstEndedAt = "2026-07-10T10:00:00.000Z";
    const secondEndedAt = "2026-07-11T10:00:00.000Z";
    await repositories.sessions.create({
      id: "session-1",
      title: "第一次会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      modelName: "deepseek-v4-pro",
      status: "ended",
      createdAt: "2026-07-10T09:00:00.000Z",
      updatedAt: firstEndedAt,
      endedAt: firstEndedAt
    });
    await repositories.conceptualizations.upsert({
      id: "conceptualization-1",
      sessionId: "session-1",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      fullMd: "# 第一次完整个案概念化\n\n面对评价时倾向退缩。",
      status: "ready",
      createdAt: firstEndedAt,
      updatedAt: firstEndedAt
    });
    await repositories.sessions.create({
      id: "session-2",
      title: "第二次会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      modelName: "deepseek-v4-pro",
      status: "ended",
      createdAt: "2026-07-11T09:00:00.000Z",
      updatedAt: secondEndedAt,
      endedAt: secondEndedAt
    });
    await repositories.messages.append({
      id: "user-2",
      sessionId: "session-2",
      role: "user",
      content: "这周我跟同事起了冲突，又想躲开。",
      status: "sent",
      createdAt: "2026-07-11T09:10:00.000Z"
    });
    await repositories.preparations.upsert({
      id: "preparation-2",
      sessionId: "session-2",
      counselorId: "chengling",
      sourceEndedAt: secondEndedAt,
      modelName: "deepseek-v4-pro",
      status: "pending",
      phase: "session-conceptualization",
      createdAt: secondEndedAt,
      updatedAt: secondEndedAt
    });
    const outputs = [
      { fullMd: "# 第二次完整个案概念化\n\n冲突后想退缩。" },
      { fullMd: "# 长期完整个案概念化\n\n评价和冲突可能与退缩循环有关，仍待验证。" },
      { supervisionMd: "# 本次会谈督导意见\n\n不要过早把两次材料合并成定论。" },
      { memoMd: "# 下一次咨询备忘录\n\n记得评价与退缩线索，但从来访者当下经验重新理解。" }
    ];
    let callIndex = 0;
    const provider: LlmProvider = {
      complete: async () => ({ content: JSON.stringify(outputs[callIndex++]) }),
      stream: async function* () { yield { type: "status", status: "done" }; }
    };

    await expect(runConsultationPreparation({
      sessionId: "session-2",
      preparationId: "preparation-2",
      sourceEndedAt: secondEndedAt,
      provider,
      modelName: "deepseek-v4-pro",
      repositories,
      now: () => "2026-07-11T10:05:00.000Z"
    })).resolves.toBe("published");

    expect(callIndex).toBe(4);
    await expect(repositories.longTermConceptualizations.getByCounselorId("chengling")).resolves.toMatchObject({
      coveredSessionIds: ["session-1", "session-2"],
      fullMd: expect.stringContaining("仍待验证")
    });
    await expect(repositories.memos.getLatestReadyByCounselorId("chengling")).resolves.toMatchObject({
      sourceSessionId: "session-2",
      memoMd: expect.stringContaining("重新理解")
    });
  });

  it("does not let a delayed worker consume a replacement ending cycle", async () => {
    const repositories = createRepositories(db);
    const firstEndedAt = "2026-07-11T10:00:00.000Z";
    const secondEndedAt = "2026-07-11T11:00:00.000Z";
    await repositories.sessions.create({
      id: "session-reended",
      title: "重新结束的会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      modelName: "deepseek-v4-pro",
      status: "ended",
      createdAt: "2026-07-11T09:00:00.000Z",
      updatedAt: secondEndedAt,
      endedAt: secondEndedAt
    });
    await repositories.preparations.upsert({
      id: "preparation-cycle-2",
      sessionId: "session-reended",
      counselorId: "chengling",
      sourceEndedAt: secondEndedAt,
      modelName: "deepseek-v4-pro",
      status: "pending",
      phase: "session-conceptualization",
      createdAt: secondEndedAt,
      updatedAt: secondEndedAt
    });
    let completionCalls = 0;
    const provider: LlmProvider = {
      complete: async () => {
        completionCalls += 1;
        return { content: "{}" };
      },
      stream: async function* () { yield { type: "status", status: "done" }; }
    };

    await expect(runConsultationPreparation({
      sessionId: "session-reended",
      preparationId: "preparation-cycle-1",
      sourceEndedAt: firstEndedAt,
      provider,
      modelName: "deepseek-v4-pro",
      repositories
    })).resolves.toBe("stale");

    expect(completionCalls).toBe(0);
    await expect(repositories.preparations.getBySessionId("session-reended")).resolves.toMatchObject({
      id: "preparation-cycle-2",
      sourceEndedAt: secondEndedAt,
      status: "pending"
    });
  });

  it("runs the complete production preparation flow for a community counselor package", async () => {
    const packageDirectory = resolve(tempDir, "community-package");
    const scaffold = spawnSync(process.execPath, [
      resolve(process.cwd(), "scripts/create-counselor-package.mjs"),
      packageDirectory,
      "community-preparation-test"
    ], { encoding: "utf8" });
    expect(scaffold.status, scaffold.stderr).toBe(0);
    loadDirectoryCounselorPackage(packageDirectory);

    const repositories = createRepositories(db);
    const endedAt = "2026-08-07T10:00:00.000Z";
    await repositories.sessions.create({
      id: "community-session",
      title: "社区咨询师会谈",
      counselorId: "community-preparation-test",
      roomThemeId: "community-room",
      modelName: "community-test-model",
      status: "ended",
      createdAt: "2026-08-07T09:00:00.000Z",
      updatedAt: endedAt,
      endedAt
    });
    await repositories.messages.append({
      id: "community-user-message",
      sessionId: "community-session",
      role: "user",
      content: "我想慢一点理解自己现在的感受。",
      status: "sent",
      createdAt: "2026-08-07T09:10:00.000Z"
    });
    await repositories.preparations.upsert({
      id: "community-preparation",
      sessionId: "community-session",
      counselorId: "community-preparation-test",
      sourceEndedAt: endedAt,
      modelName: "community-test-model",
      status: "pending",
      phase: "session-conceptualization",
      createdAt: endedAt,
      updatedAt: endedAt
    });
    const outputs = [
      { fullMd: "# 本次会谈个案概念化\n\n来访者希望慢下来。" },
      { supervisionMd: "# 本次会谈督导意见\n\n保持开放，不把慢解读为固定特质。" },
      { memoMd: "# 下一次咨询备忘录\n\n从当下经验重新进入，注意节奏。" }
    ];
    const requestedPrompts: string[] = [];
    const provider: LlmProvider = {
      complete: async (request) => {
        requestedPrompts.push(request.messages.map(({ content }) => content).join("\n"));
        return { content: JSON.stringify(outputs[requestedPrompts.length - 1]) };
      },
      stream: async function* () { yield { type: "status", status: "done" }; }
    };

    await expect(runConsultationPreparation({
      sessionId: "community-session",
      preparationId: "community-preparation",
      sourceEndedAt: endedAt,
      provider,
      modelName: "community-test-model",
      repositories
    })).resolves.toBe("published");

    expect(requestedPrompts).toHaveLength(3);
    expect(requestedPrompts.every((prompt) => prompt.includes("# 社区倾听者核心设定"))).toBe(true);
    await expect(repositories.supervisions.getBySessionId("community-session")).resolves.toMatchObject({
      supervisorId: "li-yanyun"
    });
    await expect(repositories.memos.getLatestReadyByCounselorId("community-preparation-test")).resolves.toMatchObject({
      memoMd: expect.stringContaining("注意节奏")
    });
  });
});

function createRepositories(db: LingDatabase) {
  return {
    sessions: createSessionRepository(db),
    messages: createMessageRepository(db),
    rollingSummaries: createRollingSummaryRepository(db),
    conceptualizations: createSessionConceptualizationRepository(db),
    longTermConceptualizations: createLongTermConceptualizationRepository(db),
    preparations: createConsultationPreparationRepository(db),
    supervisions: createSessionSupervisionRepository(db),
    memos: createConsultationMemoRepository(db)
  };
}
