// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createLingDatabase,
  createConsultationMemoRepository,
  createConsultationPreparationRepository,
  createImportedDocumentRepository,
  createMemoryRepository,
  createMessageRepository,
  createLongTermConceptualizationRepository,
  createRollingSummaryRepository,
  createSecretRepository,
  createSessionConceptualizationRepository,
  createSessionLetterRepository,
  createSessionRepository,
  createSessionSupervisionRepository,
  createSettingsRepository,
  getAppliedMigrations,
  migrateLingDatabase,
  migrations,
  type LingDatabase
} from "../index";
import type {
  CounselingSession,
  ConsultationMemo,
  ConsultationPreparation,
  ImportedDocument,
  LongTermConceptualization,
  MemoryItem,
  RollingSummary,
  SessionConceptualization,
  SessionLetter,
  SessionMessage,
  SessionSupervision,
  UserSettings
} from "@shared/index";

let tempDir: string;
let databasePath: string;
let db: LingDatabase;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "ling-db-"));
  databasePath = join(tempDir, "ling.sqlite");
  db = createLingDatabase({ path: databasePath });
});

afterEach(() => {
  db.close();
  rmSync(tempDir, { recursive: true, force: true });
});

describe("Ling local data foundation", () => {
  it("persists draft → active without a schema change and can cancel the empty draft", async () => {
    const sessions = createSessionRepository(db);
    const createdAt = "2026-07-12T10:00:00.000Z";
    await sessions.create({
      id: "session-draft-flow",
      title: "尚未开始的咨询",
      counselorId: "chengling",
      roomThemeId: "warm-study",
      modelName: "test",
      status: "draft",
      createdAt,
      startedAt: createdAt,
      updatedAt: createdAt
    });

    await expect(sessions.getById("session-draft-flow")).resolves.toMatchObject({ status: "draft" });
    const startedAt = "2026-07-12T10:05:00.000Z";
    await sessions.update("session-draft-flow", { status: "active", startedAt, updatedAt: startedAt });
    await expect(sessions.getById("session-draft-flow")).resolves.toMatchObject({ status: "active", startedAt });
    await sessions.delete("session-draft-flow");
    await expect(sessions.getById("session-draft-flow")).resolves.toBeNull();
  });

  it("atomically rejects external messages and documents after a consultation has ended", async () => {
    const sessions = createSessionRepository(db);
    const messages = createMessageRepository(db);
    const documents = createImportedDocumentRepository(db);
    const sessionId = "session-active-writes";
    await sessions.create({
      id: sessionId,
      title: "状态边界测试",
      counselorId: "chengling",
      roomThemeId: "warm-study",
      modelName: "test",
      status: "active",
      createdAt: "2026-07-12T10:00:00.000Z",
      updatedAt: "2026-07-12T10:00:00.000Z"
    });
    const activeMessage: SessionMessage = {
      id: "message-active",
      sessionId,
      role: "user",
      content: "进行中可以写入",
      createdAt: "2026-07-12T10:01:00.000Z",
      status: "sent"
    };
    const activeDocument: ImportedDocument = {
      id: "document-active",
      sessionId,
      title: "资料.md",
      kind: "pasted-text",
      content: "进行中资料",
      contentLength: 6,
      createdAt: "2026-07-12T10:01:00.000Z",
      status: "ready"
    };
    await expect(messages.appendForActiveSession(activeMessage)).resolves.toBe(true);
    await expect(documents.createForActiveSession(activeDocument)).resolves.toBe(true);
    await sessions.update(sessionId, {
      status: "ended",
      endedAt: "2026-07-12T10:02:00.000Z",
      updatedAt: "2026-07-12T10:02:00.000Z"
    });

    await expect(messages.appendForActiveSession({ ...activeMessage, id: "message-stale" })).resolves.toBe(false);
    await expect(documents.createForActiveSession({ ...activeDocument, id: "document-stale" })).resolves.toBe(false);
    await expect(messages.listBySessionId(sessionId)).resolves.toHaveLength(1);
    await expect(documents.listBySessionId(sessionId)).resolves.toHaveLength(1);
  });

  it("uses full conceptualizations plus supervised consultation preparation tables without brief columns", () => {
    const tableNames = db
      .prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name);
    const sessionConceptualizationColumns = db
      .prepare<[], { name: string }>("PRAGMA table_info(session_conceptualizations)")
      .all()
      .map((row) => row.name);
    const longTermConceptualizationColumns = db
      .prepare<[], { name: string }>("PRAGMA table_info(long_term_conceptualizations)")
      .all()
      .map((row) => row.name);

    expect(tableNames).toEqual(expect.arrayContaining([
      "consultation_preparations",
      "session_supervisions",
      "consultation_memos"
    ]));
    expect(sessionConceptualizationColumns).not.toContain("context_brief");
    expect(longTermConceptualizationColumns).not.toContain("context_brief");
  });

  it("tracks consultation preparation phases and failure details", async () => {
    const repository = createConsultationPreparationRepository(db);
    const preparation: ConsultationPreparation = {
      id: "preparation-session-1-2026-07-11",
      sessionId: "session-1",
      counselorId: "chengling",
      sourceEndedAt: "2026-07-11T10:00:00.000Z",
      modelName: "deepseek-v4-pro",
      status: "pending",
      phase: "session-conceptualization",
      createdAt: "2026-07-11T10:00:00.000Z",
      updatedAt: "2026-07-11T10:00:00.000Z"
    };

    await repository.upsert(preparation);
    await repository.markProcessing(preparation.id, "supervision", "2026-07-11T10:01:00.000Z");
    await expect(repository.getBySessionId(preparation.sessionId)).resolves.toEqual({
      ...preparation,
      status: "processing",
      phase: "supervision",
      updatedAt: "2026-07-11T10:01:00.000Z"
    });

    await repository.markFailed(preparation.id, "督导输出格式无效", "2026-07-11T10:02:00.000Z");
    await expect(repository.getBySessionId(preparation.sessionId)).resolves.toMatchObject({
      status: "failed",
      phase: "supervision",
      errorMessage: "督导输出格式无效"
    });
  });

  it("returns the latest ready consultation memo for one counselor", async () => {
    const repository = createConsultationMemoRepository(db);
    const sessions = createSessionRepository(db);
    const older: ConsultationMemo = {
      id: "memo-old",
      preparationId: "preparation-old",
      sourceSessionId: "session-old",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      memoMd: "# 下一次咨询备忘录\n\n旧版本",
      status: "ready",
      createdAt: "2026-07-10T10:00:00.000Z",
      updatedAt: "2026-07-10T10:00:00.000Z"
    };
    const newer: ConsultationMemo = {
      ...older,
      id: "memo-new",
      preparationId: "preparation-new",
      sourceSessionId: "session-new",
      memoMd: "# 下一次咨询备忘录\n\n新版本",
      createdAt: "2026-07-11T10:00:00.000Z",
      updatedAt: "2026-07-11T10:00:00.000Z"
    };

    await sessions.create({
      id: "session-old",
      title: "旧会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      modelName: "deepseek-v4-pro",
      status: "ended",
      createdAt: "2026-07-10T09:00:00.000Z",
      updatedAt: "2026-07-12T10:00:00.000Z",
      endedAt: "2026-07-10T10:00:00.000Z"
    });
    await sessions.create({
      id: "session-new",
      title: "新会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      modelName: "deepseek-v4-pro",
      status: "ended",
      createdAt: "2026-07-11T09:00:00.000Z",
      updatedAt: "2026-07-11T10:00:00.000Z",
      endedAt: "2026-07-11T10:00:00.000Z"
    });

    await repository.upsert(older);
    await repository.upsert(newer);

    await expect(repository.getLatestReadyByCounselorId("chengling")).resolves.toEqual(newer);
    await expect(repository.getLatestReadyByCounselorId("zhouzhou")).resolves.toBeNull();
    await expect(sessions.getLatestEndedByCounselorId("chengling")).resolves.toMatchObject({ id: "session-new" });
  });

  it("invalidates already published consultation artifacts when an ended session resumes", async () => {
    const sessions = createSessionRepository(db);
    const preparations = createConsultationPreparationRepository(db);
    const conceptualizations = createSessionConceptualizationRepository(db);
    const longTerm = createLongTermConceptualizationRepository(db);
    const supervisions = createSessionSupervisionRepository(db);
    const memos = createConsultationMemoRepository(db);
    const letters = createSessionLetterRepository(db);
    const endedAt = "2026-07-11T10:00:00.000Z";
    await sessions.create({
      id: "session-published-then-resumed",
      title: "已发布后继续的会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      modelName: "deepseek-v4-pro",
      status: "ended",
      createdAt: "2026-07-11T09:00:00.000Z",
      updatedAt: endedAt,
      endedAt
    });
    const preparation: ConsultationPreparation = {
      id: "preparation-published-then-resumed",
      sessionId: "session-published-then-resumed",
      counselorId: "chengling",
      sourceEndedAt: endedAt,
      modelName: "deepseek-v4-pro",
      status: "processing",
      phase: "consultation-memo",
      createdAt: endedAt,
      updatedAt: endedAt
    };
    await preparations.upsert(preparation);
    await expect(preparations.publishReady({
      preparationId: preparation.id,
      sessionConceptualization: {
        id: "conceptualization-published-then-resumed",
        sessionId: preparation.sessionId,
        counselorId: "chengling",
        modelName: "deepseek-v4-pro",
        fullMd: "# 本次会谈个案概念化",
        status: "ready",
        createdAt: endedAt,
        updatedAt: endedAt
      },
      longTermConceptualization: {
        id: "long-term-published-then-resumed",
        counselorId: "chengling",
        modelName: "deepseek-v4-pro",
        fullMd: "# 长期个案概念化",
        coveredSessionIds: [preparation.sessionId],
        coveredUntilSessionId: preparation.sessionId,
        coveredUntilEndedAt: endedAt,
        status: "ready",
        createdAt: endedAt,
        updatedAt: endedAt
      },
      supervision: {
        id: "supervision-published-then-resumed",
        preparationId: preparation.id,
        sessionId: preparation.sessionId,
        counselorId: "chengling",
        supervisorId: "li-yanyun",
        modelName: "deepseek-v4-pro",
        supervisionMd: "# 本次会谈督导意见",
        status: "ready",
        createdAt: endedAt,
        updatedAt: endedAt
      },
      memo: {
        id: "memo-published-then-resumed",
        preparationId: preparation.id,
        sourceSessionId: preparation.sessionId,
        counselorId: "chengling",
        modelName: "deepseek-v4-pro",
        memoMd: "# 下一次咨询备忘录",
        status: "ready",
        createdAt: endedAt,
        updatedAt: endedAt
      },
      publishedAt: "2026-07-11T10:01:00.000Z"
    })).resolves.toBe(true);
    await letters.upsert({
      id: "letter-published-then-resumed",
      sessionId: preparation.sessionId,
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      letterMd: "旧结束周期的来信",
      status: "ready",
      createdAt: endedAt,
      updatedAt: endedAt,
      readAt: "2026-07-11T10:00:30.000Z"
    });

    await expect(
      preparations.resumeSessionAndInvalidatePublished(preparation.sessionId, "2026-07-11T10:02:00.000Z")
    ).resolves.toBe(true);

    await expect(sessions.getById(preparation.sessionId)).resolves.toMatchObject({ status: "active", endedAt: undefined });
    await expect(preparations.getBySessionId(preparation.sessionId)).resolves.toMatchObject({ status: "stale" });
    await expect(conceptualizations.getBySessionId(preparation.sessionId)).resolves.toBeNull();
    await expect(longTerm.getByCounselorId("chengling")).resolves.toBeNull();
    await expect(supervisions.getBySessionId(preparation.sessionId)).resolves.toBeNull();
    await expect(memos.getBySourceSessionId(preparation.sessionId)).resolves.toBeNull();

    // The letter is deliberately the one artifact that survives: the client may
    // already have read it, and resuming must not destroy it.
    await expect(letters.getBySessionId(preparation.sessionId)).resolves.toMatchObject({
      letterMd: "旧结束周期的来信",
      status: "ready",
      readAt: "2026-07-11T10:00:30.000Z"
    });

    // Ending again regenerates the letter over the same row, and the read stamp
    // goes with the text it described — the client has not seen this one.
    const reEndedAt = "2026-07-11T11:00:00.000Z";
    db.prepare("UPDATE sessions SET status = 'ended', ended_at = ? WHERE id = ?").run(reEndedAt, preparation.sessionId);
    await expect(letters.upsertForEndedCycle({
      id: "letter-published-then-resumed",
      sessionId: preparation.sessionId,
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      letterMd: "继续之后的第二封来信",
      status: "ready",
      createdAt: reEndedAt,
      updatedAt: reEndedAt
    }, reEndedAt)).resolves.toBe(true);
    const regenerated = await letters.getBySessionId(preparation.sessionId);
    expect(regenerated).toMatchObject({ letterMd: "继续之后的第二封来信", status: "ready" });
    expect(regenerated?.readAt).toBeUndefined();
  });

  it("does not publish a stale consultation preparation after the session resumes", async () => {
    const sessions = createSessionRepository(db);
    const preparations = createConsultationPreparationRepository(db);
    const supervisions = createSessionSupervisionRepository(db);
    const memos = createConsultationMemoRepository(db);
    const endedAt = "2026-07-11T10:00:00.000Z";
    await sessions.create({
      id: "session-stale-preparation",
      title: "会继续的会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      modelName: "deepseek-v4-pro",
      status: "ended",
      createdAt: "2026-07-11T09:00:00.000Z",
      updatedAt: endedAt,
      endedAt
    });
    const preparation: ConsultationPreparation = {
      id: "preparation-stale",
      sessionId: "session-stale-preparation",
      counselorId: "chengling",
      sourceEndedAt: endedAt,
      modelName: "deepseek-v4-pro",
      status: "processing",
      phase: "consultation-memo",
      createdAt: endedAt,
      updatedAt: endedAt
    };
    await preparations.upsert(preparation);
    await sessions.update(preparation.sessionId, {
      status: "active",
      endedAt: null as unknown as string,
      updatedAt: "2026-07-11T10:05:00.000Z"
    });

    const supervision: SessionSupervision = {
      id: "supervision-stale",
      preparationId: preparation.id,
      sessionId: preparation.sessionId,
      counselorId: "chengling",
      supervisorId: "li-yanyun",
      modelName: "deepseek-v4-pro",
      supervisionMd: "# 本次会谈督导意见",
      status: "ready",
      createdAt: endedAt,
      updatedAt: endedAt
    };
    const memo: ConsultationMemo = {
      id: "memo-stale",
      preparationId: preparation.id,
      sourceSessionId: preparation.sessionId,
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      memoMd: "# 下一次咨询备忘录",
      status: "ready",
      createdAt: endedAt,
      updatedAt: endedAt
    };

    await expect(preparations.publishReady({
      preparationId: preparation.id,
      sessionConceptualization: {
        id: "conceptualization-stale",
        sessionId: preparation.sessionId,
        counselorId: "chengling",
        modelName: "deepseek-v4-pro",
        fullMd: "# 本次会谈个案概念化",
        status: "ready",
        createdAt: endedAt,
        updatedAt: endedAt
      },
      supervision,
      memo,
      publishedAt: "2026-07-11T10:06:00.000Z"
    })).resolves.toBe(false);
    await expect(preparations.getBySessionId(preparation.sessionId)).resolves.toMatchObject({ status: "stale" });
    await expect(supervisions.getBySessionId(preparation.sessionId)).resolves.toBeNull();
    await expect(memos.getBySourceSessionId(preparation.sessionId)).resolves.toBeNull();
  });

  it("runs migrations repeatedly without losing existing data", async () => {
    const settingsRepository = createSettingsRepository(db);
    const settings: UserSettings = {
      api: {
        apiBaseUrl: "https://api.example.test/v1",
        apiKey: "local-secret",
        modelName: "test-model"
      },
      defaultCounselorId: "chengling",
      defaultRoomThemeId: "quiet-study"
    };

    await settingsRepository.save(settings);
    migrateLingDatabase(db);

    expect(await settingsRepository.read()).toEqual({
      ...settings,
      api: {
        ...settings.api,
        apiKey: "",
        apiKeySaved: true,
        apiKeyPreview: "lo...et"
      }
    });
  });

  it("saves and reads user settings", async () => {
    const settingsRepository = createSettingsRepository(db);
    const settings: UserSettings = {
      api: {
        apiBaseUrl: "http://localhost:11434/v1",
        apiKey: "placeholder-key",
        modelName: "local-model"
      },
      defaultCounselorId: "zhouzhou",
      defaultRoomThemeId: "rain-night-room"
    };

    await settingsRepository.save(settings);

    expect(await settingsRepository.read()).toEqual({
      ...settings,
      api: {
        ...settings.api,
        apiKey: "",
        apiKeySaved: true,
        apiKeyPreview: "pl...ey"
      }
    });
  });

  it("does not expose a full api key when reading user settings", async () => {
    const settingsRepository = createSettingsRepository(db);
    const settings: UserSettings = {
      api: {
        apiBaseUrl: "http://localhost:11434/v1",
        apiKey: "secret-key-for-test",
        modelName: "local-model"
      },
      defaultCounselorId: "zhouzhou",
      defaultRoomThemeId: "rain-night-room"
    };

    await settingsRepository.save(settings);

    expect(await settingsRepository.read()).toEqual({
      api: {
        apiBaseUrl: "http://localhost:11434/v1",
        apiKey: "",
        apiKeySaved: true,
        apiKeyPreview: "se...st",
        modelName: "local-model"
      },
      defaultCounselorId: "zhouzhou",
      defaultRoomThemeId: "rain-night-room"
    });
    const raw = db
      .prepare<[string], { value: string }>("SELECT value FROM settings WHERE key = ?")
      .get("userSettings");
    expect(raw?.value).not.toContain("secret-key-for-test");
  });

  it("saves, overwrites, reads, and deletes local secrets", async () => {
    const secretRepository = createSecretRepository(db);

    expect(await secretRepository.hasApiKey()).toBe(false);
    expect(await secretRepository.readApiKey()).toBe(null);

    await secretRepository.saveApiKey("first-secret");
    expect(await secretRepository.hasApiKey()).toBe(true);
    expect(await secretRepository.readApiKey()).toBe("first-secret");

    await secretRepository.saveApiKey("second-secret");
    expect(await secretRepository.readApiKey()).toBe("second-secret");

    await secretRepository.deleteApiKey();
    expect(await secretRepository.hasApiKey()).toBe(false);
    expect(await secretRepository.readApiKey()).toBe(null);

    expect(await secretRepository.hasDoubaoAccessToken()).toBe(false);
    await secretRepository.saveDoubaoAccessToken("doubao-secret");
    expect(await secretRepository.hasDoubaoAccessToken()).toBe(true);
    expect(await secretRepository.readDoubaoAccessToken()).toBe("doubao-secret");
    await secretRepository.deleteDoubaoAccessToken();
    expect(await secretRepository.readDoubaoAccessToken()).toBe(null);

    await secretRepository.saveTencentSecretId("tencent-id");
    await secretRepository.saveTencentSecretKey("tencent-key");
    expect(await secretRepository.hasTencentSecretId()).toBe(true);
    expect(await secretRepository.readTencentSecretId()).toBe("tencent-id");
    expect(await secretRepository.hasTencentSecretKey()).toBe(true);
    expect(await secretRepository.readTencentSecretKey()).toBe("tencent-key");
    await secretRepository.deleteTencentSecretId();
    await secretRepository.deleteTencentSecretKey();
    expect(await secretRepository.hasTencentSecretId()).toBe(false);
    expect(await secretRepository.hasTencentSecretKey()).toBe(false);

    await secretRepository.saveAliyunApiKey("aliyun-key");
    expect(await secretRepository.hasAliyunApiKey()).toBe(true);
    expect(await secretRepository.readAliyunApiKey()).toBe("aliyun-key");
    await secretRepository.deleteAliyunApiKey();
    expect(await secretRepository.hasAliyunApiKey()).toBe(false);
  });

  it("creates, reads, updates, and lists sessions", async () => {
    const sessionRepository = createSessionRepository(db);
    const session: CounselingSession = {
      id: "session-1",
      title: "第一次会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      teamId: "default-team",
      modelName: "test-model",
      memorySnapshot: {
        version: 2,
        enabled: true,
        consultationMemo: "冻结的下一次咨询备忘录",
        sourceMemoId: "memo-1",
        createdAt: "2026-07-10T08:00:00.000Z"
      },
      createdAt: "2026-07-03T09:00:00.000Z",
      updatedAt: "2026-07-03T09:00:00.000Z",
      status: "active"
    };

    await sessionRepository.create(session);
    expect((await sessionRepository.getById("session-1"))?.memorySnapshot).toEqual(session.memorySnapshot);
    await sessionRepository.update("session-1", {
      title: "第一次会谈：更新后",
      updatedAt: "2026-07-03T09:05:00.000Z",
      status: "ended",
      endedAt: "2026-07-03T09:30:00.000Z",
      memorySnapshot: {
        version: 2,
        enabled: false,
        createdAt: "2026-07-10T09:00:00.000Z"
      }
    });

    expect(await sessionRepository.getById("session-1")).toEqual({
      ...session,
      title: "第一次会谈：更新后",
      updatedAt: "2026-07-03T09:05:00.000Z",
      status: "ended",
      endedAt: "2026-07-03T09:30:00.000Z",
      memorySnapshot: {
        version: 2,
        enabled: false,
        createdAt: "2026-07-10T09:00:00.000Z"
      }
    });
    expect(await sessionRepository.list()).toHaveLength(1);
  });

  it("ignores a malformed session memory snapshot", async () => {
    const sessionRepository = createSessionRepository(db);
    await sessionRepository.create({
      id: "session-malformed-memory-snapshot",
      title: "损坏快照会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      modelName: "test-model",
      createdAt: "2026-07-10T09:00:00.000Z",
      updatedAt: "2026-07-10T09:00:00.000Z",
      status: "active"
    });
    db.prepare("UPDATE sessions SET memory_snapshot = ? WHERE id = ?").run(
      "{not-valid-json",
      "session-malformed-memory-snapshot"
    );

    expect((await sessionRepository.getById("session-malformed-memory-snapshot"))?.memorySnapshot).toBeUndefined();
  });

  it("deletes a session with its local conversation context", async () => {
    const sessionRepository = createSessionRepository(db);
    const messageRepository = createMessageRepository(db);
    const documentRepository = createImportedDocumentRepository(db);
    const rollingSummaryRepository = createRollingSummaryRepository(db);
    const conceptualizationRepository = createSessionConceptualizationRepository(db);
    const sessionLetterRepository = createSessionLetterRepository(db);
    const preparationRepository = createConsultationPreparationRepository(db);
    const supervisionRepository = createSessionSupervisionRepository(db);
    const memoRepository = createConsultationMemoRepository(db);
    const longTermConceptualizationRepository = createLongTermConceptualizationRepository(db);
    const session: CounselingSession = {
      id: "session-delete",
      title: "待删除会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      teamId: "one-way-mirror",
      modelName: "test-model",
      createdAt: "2026-07-05T09:00:00.000Z",
      updatedAt: "2026-07-05T09:00:00.000Z",
      status: "active"
    };

    await sessionRepository.create(session);
    await messageRepository.append({
      id: "message-delete",
      sessionId: session.id,
      role: "user",
      content: "要删除的消息",
      createdAt: "2026-07-05T09:01:00.000Z",
      status: "sent"
    });
    await documentRepository.create({
      id: "document-delete",
      sessionId: session.id,
      title: "资料.md",
      kind: "pasted-text",
      content: "要删除的资料",
      contentLength: 6,
      createdAt: "2026-07-05T09:01:00.000Z",
      status: "ready"
    });
    await rollingSummaryRepository.upsert({
      sessionId: session.id,
      counselorId: "chengling",
      summary: "要删除的摘要",
      coveredMessageCount: 1,
      createdAt: "2026-07-05T09:02:00.000Z",
      updatedAt: "2026-07-05T09:02:00.000Z",
      status: "active"
    });
    await conceptualizationRepository.upsert({
      id: "conceptualization-delete",
      sessionId: session.id,
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      fullMd: "# 本次会谈个案概念化\n\n要删除的完整记录",
      status: "ready",
      createdAt: "2026-07-05T09:03:00.000Z",
      updatedAt: "2026-07-05T09:03:00.000Z"
    });
    await sessionLetterRepository.upsert({
      id: "session-letter-delete",
      sessionId: session.id,
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      letterMd: "亲爱的你：\n\n这封信会随着会谈一起删除。",
      status: "ready",
      createdAt: "2026-07-05T09:03:30.000Z",
      updatedAt: "2026-07-05T09:03:30.000Z"
    });
    await preparationRepository.upsert({
      id: "preparation-delete",
      sessionId: session.id,
      counselorId: "chengling",
      sourceEndedAt: "2026-07-05T09:03:00.000Z",
      modelName: "deepseek-v4-pro",
      status: "ready",
      phase: "complete",
      createdAt: "2026-07-05T09:03:00.000Z",
      updatedAt: "2026-07-05T09:03:00.000Z"
    });
    await supervisionRepository.upsert({
      id: "supervision-delete",
      preparationId: "preparation-delete",
      sessionId: session.id,
      counselorId: "chengling",
      supervisorId: "li-yanyun",
      modelName: "deepseek-v4-pro",
      supervisionMd: "# 本次会谈督导意见\n\n会随会谈删除。",
      status: "ready",
      createdAt: "2026-07-05T09:03:00.000Z",
      updatedAt: "2026-07-05T09:03:00.000Z"
    });
    await memoRepository.upsert({
      id: "memo-delete",
      preparationId: "preparation-delete",
      sourceSessionId: session.id,
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      memoMd: "# 下一次咨询备忘录\n\n会随会谈删除。",
      status: "ready",
      createdAt: "2026-07-05T09:03:00.000Z",
      updatedAt: "2026-07-05T09:03:00.000Z"
    });
    await longTermConceptualizationRepository.upsert({
      id: "long-term-conceptualization-chengling",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      fullMd: "# 长期个案概念化\n\n不会因删除单次会谈而删除",
      coveredSessionIds: [session.id],
      coveredUntilSessionId: session.id,
      coveredUntilEndedAt: "2026-07-05T09:03:00.000Z",
      status: "ready",
      createdAt: "2026-07-05T09:04:00.000Z",
      updatedAt: "2026-07-05T09:04:00.000Z"
    });

    await sessionRepository.delete(session.id);

    expect(await sessionRepository.getById(session.id)).toBeNull();
    expect(await messageRepository.listBySessionId(session.id)).toEqual([]);
    expect(await documentRepository.listBySessionId(session.id)).toEqual([]);
    expect(await rollingSummaryRepository.getBySessionId(session.id)).toBeNull();
    expect(await conceptualizationRepository.getBySessionId(session.id)).toBeNull();
    expect(await sessionLetterRepository.getBySessionId(session.id)).toBeNull();
    expect(await preparationRepository.getBySessionId(session.id)).toBeNull();
    expect(await supervisionRepository.getBySessionId(session.id)).toBeNull();
    expect(await memoRepository.getBySourceSessionId(session.id)).toBeNull();
    expect(await longTermConceptualizationRepository.getByCounselorId("chengling")).toMatchObject({
      counselorId: "chengling",
      fullMd: expect.stringContaining("不会因删除单次会谈而删除")
    });
    await expect(rollingSummaryRepository.upsertForExistingSession({
      sessionId: session.id,
      counselorId: "chengling",
      summary: "迟到摘要不应复活",
      coveredMessageCount: 1,
      createdAt: "2026-07-05T09:05:00.000Z",
      updatedAt: "2026-07-05T09:05:00.000Z",
      status: "active"
    })).resolves.toBe(false);
    await expect(rollingSummaryRepository.markFailedForExistingSession({
      sessionId: session.id,
      counselorId: "chengling",
      attemptedMessageCount: 1,
      errorMessage: "迟到失败不应复活",
      failedAt: "2026-07-05T09:05:00.000Z"
    })).resolves.toBe(false);
    await expect(rollingSummaryRepository.getBySessionId(session.id)).resolves.toBeNull();
  });

  it("persists a session prompt snapshot", async () => {
    const sessionRepository = createSessionRepository(db);
    const session: CounselingSession = {
      id: "session-prompt-snapshot",
      title: "带提示词快照的会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      teamId: "one-way-mirror",
      modelName: "deepseek-v4-flash",
      promptSnapshot: {
        version: 2,
        counselorId: "chengling",
        teamId: "one-way-mirror",
        modelName: "deepseek-v4-flash",
        counselorCorePrompt: "冻结的程灵核心",
        counselingTaskPrompt: "冻结的咨询对话场景提示词",
        teamPrompt: "",
        systemPrompt: "冻结的系统提示词",
        createdAt: "2026-07-05T12:00:00.000Z"
      },
      createdAt: "2026-07-05T12:00:00.000Z",
      updatedAt: "2026-07-05T12:00:00.000Z",
      status: "active"
    };

    await sessionRepository.create(session);

    expect(await sessionRepository.getById(session.id)).toEqual(session);
  });

  it("persists a modular session prompt snapshot with shared counseling values", async () => {
    const sessionRepository = createSessionRepository(db);
    const session: CounselingSession = {
      id: "session-prompt-snapshot-v3",
      title: "带共同价值观快照的会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      teamId: "one-way-mirror",
      modelName: "deepseek-v4-flash",
      promptSnapshot: {
        version: 3,
        counselorId: "chengling",
        teamId: "one-way-mirror",
        modelName: "deepseek-v4-flash",
        counselorCorePrompt: "冻结的程灵核心",
        sharedCounselingValuesPrompt: "冻结的共同咨询价值观",
        counselingTaskPrompt: "冻结的咨询对话场景提示词",
        teamPrompt: "",
        systemPrompt: "冻结的系统提示词",
        createdAt: "2026-07-05T12:00:00.000Z"
      },
      createdAt: "2026-07-05T12:00:00.000Z",
      updatedAt: "2026-07-05T12:00:00.000Z",
      status: "active"
    };

    await sessionRepository.create(session);

    expect(await sessionRepository.getById(session.id)).toEqual(session);
  });

  it("persists a v4 prompt snapshot with counselor package identity", async () => {
    const sessionRepository = createSessionRepository(db);
    const session: CounselingSession = {
      id: "session-prompt-snapshot-v4",
      title: "带咨询师包版本的会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      teamId: "one-way-mirror",
      modelName: "deepseek-v4-flash",
      promptSnapshot: {
        version: 4,
        locale: "zh-CN",
        counselorId: "chengling",
        teamId: "one-way-mirror",
        modelName: "deepseek-v4-flash",
        counselorPackageVersion: "1.0.0",
        promptContentHash: "fnv1a32:12345678",
        counselorCorePrompt: "冻结的程灵核心",
        sharedCounselingValuesPrompt: "冻结的共同咨询价值观",
        counselingTaskPrompt: "冻结的咨询对话场景提示词",
        teamPrompt: "",
        systemPrompt: "冻结的系统提示词",
        createdAt: "2026-08-07T12:00:00.000Z"
      },
      createdAt: "2026-08-07T12:00:00.000Z",
      updatedAt: "2026-08-07T12:00:00.000Z",
      status: "active"
    };

    await sessionRepository.create(session);

    expect(await sessionRepository.getById(session.id)).toEqual(session);
  });

  it("persists a v5 prompt snapshot with a standalone counselor voice", async () => {
    const sessionRepository = createSessionRepository(db);
    const session: CounselingSession = {
      id: "session-prompt-snapshot-v5",
      title: "带独立语言风格快照的会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      teamId: "one-way-mirror",
      modelName: "deepseek-v4-flash",
      promptSnapshot: {
        version: 5,
        locale: "zh-CN",
        counselorId: "chengling",
        teamId: "one-way-mirror",
        modelName: "deepseek-v4-flash",
        counselorPackageVersion: "1.0.0",
        promptContentHash: "fnv1a32:87654321",
        counselorCorePrompt: "冻结的程灵核心",
        counselorVoicePrompt: "冻结的程灵语言风格",
        sharedCounselingValuesPrompt: "冻结的共同咨询价值观",
        counselingTaskPrompt: "冻结的咨询对话场景提示词",
        teamPrompt: "",
        systemPrompt: "冻结的系统提示词",
        createdAt: "2026-08-25T12:00:00.000Z"
      },
      createdAt: "2026-08-25T12:00:00.000Z",
      updatedAt: "2026-08-25T12:00:00.000Z",
      status: "active"
    };

    await sessionRepository.create(session);

    expect(await sessionRepository.getById(session.id)).toEqual(session);
  });

  it("ignores malformed modular prompt snapshots", async () => {
    const sessionRepository = createSessionRepository(db);
    await sessionRepository.create({
      id: "session-malformed-prompt-snapshot",
      title: "损坏提示词快照会谈",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      modelName: "deepseek-v4-flash",
      createdAt: "2026-07-05T12:00:00.000Z",
      updatedAt: "2026-07-05T12:00:00.000Z",
      status: "active"
    });
    db.prepare("UPDATE sessions SET prompt_snapshot = ? WHERE id = ?").run(
      JSON.stringify({ version: 2, counselorId: "chengling", systemPrompt: "缺少模块字段" }),
      "session-malformed-prompt-snapshot"
    );

    expect((await sessionRepository.getById("session-malformed-prompt-snapshot"))?.promptSnapshot).toBeUndefined();
  });

  it("ignores a v3 prompt snapshot without shared counseling values", async () => {
    const sessionRepository = createSessionRepository(db);
    await sessionRepository.create({
      id: "session-malformed-prompt-snapshot-v3",
      title: "缺少共同价值观的损坏快照",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      modelName: "deepseek-v4-flash",
      createdAt: "2026-07-05T12:00:00.000Z",
      updatedAt: "2026-07-05T12:00:00.000Z",
      status: "active"
    });
    db.prepare("UPDATE sessions SET prompt_snapshot = ? WHERE id = ?").run(
      JSON.stringify({
        version: 3,
        counselorId: "chengling",
        modelName: "deepseek-v4-flash",
        counselorCorePrompt: "冻结的程灵核心",
        counselingTaskPrompt: "冻结的咨询对话场景提示词",
        teamPrompt: "",
        systemPrompt: "冻结的系统提示词",
        createdAt: "2026-07-05T12:00:00.000Z"
      }),
      "session-malformed-prompt-snapshot-v3"
    );

    expect((await sessionRepository.getById("session-malformed-prompt-snapshot-v3"))?.promptSnapshot).toBeUndefined();
  });

  it("updates and persists a session prompt snapshot", async () => {
    const sessionRepository = createSessionRepository(db);
    const session: CounselingSession = {
      id: "legacy-session-prompt-snapshot",
      title: "旧会话",
      counselorId: "chengling",
      roomThemeId: "quiet-study",
      teamId: "one-way-mirror",
      modelName: "deepseek-v4-flash",
      createdAt: "2026-07-05T12:00:00.000Z",
      updatedAt: "2026-07-05T12:00:00.000Z",
      status: "active"
    };
    const promptSnapshot = {
      version: 1 as const,
      counselorId: "chengling",
      teamId: "one-way-mirror",
      modelName: "deepseek-v4-flash",
      systemPrompt: "按需回填的系统提示词",
      createdAt: "2026-07-05T12:00:00.000Z"
    };

    await sessionRepository.create(session);
    await sessionRepository.update(session.id, { promptSnapshot });

    expect(await sessionRepository.getById(session.id)).toEqual({
      ...session,
      promptSnapshot
    });
  });

  it("appends and reads session messages in creation order", async () => {
    const messageRepository = createMessageRepository(db);
    const firstMessage: SessionMessage = {
      id: "message-1",
      sessionId: "session-1",
      role: "user",
      content: "最近有点累。",
      createdAt: "2026-07-03T09:01:00.000Z",
      status: "sent"
    };
    const secondMessage: SessionMessage = {
      id: "message-2",
      sessionId: "session-1",
      role: "assistant",
      content: "我们可以先慢慢看这种累。",
      createdAt: "2026-07-03T09:02:00.000Z",
      status: "sent",
      metadata: { source: "prototype" }
    };

    await messageRepository.append(firstMessage);
    await messageRepository.append(secondMessage);

    expect(await messageRepository.listBySessionId("session-1")).toEqual([firstMessage, secondMessage]);
  });

  it("updates an existing message with the same id instead of duplicating it", async () => {
    const messageRepository = createMessageRepository(db);
    const message: SessionMessage = {
      id: "message-upsert",
      sessionId: "session-1",
      role: "assistant",
      content: "草稿",
      createdAt: "2026-07-03T09:02:00.000Z",
      status: "sending"
    };

    await messageRepository.append(message);
    await messageRepository.append({ ...message, content: "最终内容", status: "sent" });

    expect(await messageRepository.listBySessionId("session-1")).toEqual([{ ...message, content: "最终内容", status: "sent" }]);
  });

  it("creates, reads, and lists imported documents by session", async () => {
    const documentRepository = createImportedDocumentRepository(db);
    const document: ImportedDocument = {
      id: "doc-1",
      sessionId: "session-1",
      title: "长文本资料",
      kind: "pasted-text",
      content: "完整长文本",
      contentLength: 5,
      createdAt: "2026-07-05T10:00:00.000Z",
      status: "ready"
    };

    await documentRepository.create(document);
    await documentRepository.updateSummary(document.id, "资料摘要");

    expect(await documentRepository.getById(document.id)).toEqual({ ...document, summary: "资料摘要" });
    expect(await documentRepository.listBySessionId("session-1")).toEqual([{ ...document, summary: "资料摘要" }]);
  });

  it("keeps a memory repository ready for later agent integration", async () => {
    const memoryRepository = createMemoryRepository(db);
    await memoryRepository.create({
      id: "memory-1",
      type: "theme",
      title: "压力主题",
      content: "用户最近频繁提到疲惫和压力。",
      sourceSessionId: "session-1",
      status: "confirmed",
      createdAt: "2026-07-03T09:10:00.000Z",
      updatedAt: "2026-07-03T09:10:00.000Z"
    });

    expect(await memoryRepository.list()).toEqual([
      {
        id: "memory-1",
        type: "theme",
        title: "压力主题",
        content: "用户最近频繁提到疲惫和压力。",
        sourceSessionId: "session-1",
        status: "confirmed",
        createdAt: "2026-07-03T09:10:00.000Z",
        updatedAt: "2026-07-03T09:10:00.000Z"
      }
    ]);
  });

  it("updates and deletes persisted memories", async () => {
    const memoryRepository = createMemoryRepository(db);
    const memory: MemoryItem = {
      id: "memory-2",
      type: "event",
      title: "会谈里的重要事件",
      content: "用户提到一次具体冲突。",
      sourceSessionId: "session-2",
      status: "pending",
      createdAt: "2026-07-03T09:20:00.000Z",
      updatedAt: "2026-07-03T09:20:00.000Z"
    };

    await memoryRepository.create(memory);
    await memoryRepository.update("memory-2", {
      title: "已确认的重要事件",
      status: "hidden",
      updatedAt: "2026-07-03T09:30:00.000Z"
    });

    expect(await memoryRepository.list()).toEqual([
      {
        ...memory,
        title: "已确认的重要事件",
        status: "hidden",
        updatedAt: "2026-07-03T09:30:00.000Z"
      }
    ]);

    await memoryRepository.delete("memory-2");

    expect(await memoryRepository.list()).toEqual([]);
  });

  it("creates, updates, and preserves rolling summaries", async () => {
    const rollingSummaryRepository = createRollingSummaryRepository(db);
    const summary: RollingSummary = {
      sessionId: "session-summary",
      counselorId: "chengling",
      summary: "### 重要事实\n- 用户提到最近很累。\n\n### 事情经过\n- 用户先描述疲惫感。",
      coveredMessageCount: 13,
      coveredUntilMessageId: "message-13",
      createdAt: "2026-07-05T10:00:00.000Z",
      updatedAt: "2026-07-05T10:00:00.000Z",
      status: "active"
    };

    await rollingSummaryRepository.upsert(summary);
    await rollingSummaryRepository.upsert({
      ...summary,
      summary: "### 重要事实\n- 用户提到最近很累。\n- 用户提到睡眠变浅。\n\n### 事情经过\n- 用户先描述疲惫感，随后谈到睡眠。",
      coveredMessageCount: 17,
      coveredUntilMessageId: "message-17",
      updatedAt: "2026-07-05T10:05:00.000Z"
    });

    expect(await rollingSummaryRepository.getBySessionId("session-summary")).toEqual({
      ...summary,
      summary: "### 重要事实\n- 用户提到最近很累。\n- 用户提到睡眠变浅。\n\n### 事情经过\n- 用户先描述疲惫感，随后谈到睡眠。",
      coveredMessageCount: 17,
      coveredUntilMessageId: "message-17",
      updatedAt: "2026-07-05T10:05:00.000Z"
    });
  });

  it("records rolling summary failures without advancing the covered message count", async () => {
    const rollingSummaryRepository = createRollingSummaryRepository(db);
    const summary: RollingSummary = {
      sessionId: "session-summary-failure",
      counselorId: "chengling",
      summary: "### 重要事实\n- 用户提到最近很累。\n\n### 事情经过\n- 用户先描述疲惫感。",
      coveredMessageCount: 13,
      coveredUntilMessageId: "message-13",
      createdAt: "2026-07-05T10:00:00.000Z",
      updatedAt: "2026-07-05T10:00:00.000Z",
      status: "active"
    };

    await rollingSummaryRepository.upsert(summary);
    await rollingSummaryRepository.markFailed({
      sessionId: "session-summary-failure",
      counselorId: "chengling",
      attemptedMessageCount: 17,
      failedAt: "2026-07-05T10:06:00.000Z",
      errorMessage: "format invalid after repair"
    });

    expect(await rollingSummaryRepository.getBySessionId("session-summary-failure")).toEqual({
      ...summary,
      lastAttemptedMessageCount: 17,
      lastErrorAt: "2026-07-05T10:06:00.000Z",
      updatedAt: "2026-07-05T10:06:00.000Z",
      status: "failed",
      errorMessage: "format invalid after repair"
    });
  });

  it("stores a complete session conceptualization", async () => {
    const conceptualizationRepository = createSessionConceptualizationRepository(db);
    const conceptualization: SessionConceptualization = {
      id: "session-conceptualization-1",
      sessionId: "session-conceptualization-session",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      fullMd: "# 本次会谈个案概念化\n\n## 本次会谈主题\n用户谈到最近的疲惫。",
      status: "ready",
      createdAt: "2026-07-06T10:00:00.000Z",
      updatedAt: "2026-07-06T10:00:00.000Z"
    };

    await conceptualizationRepository.upsert(conceptualization);

    expect(await conceptualizationRepository.getBySessionId(conceptualization.sessionId)).toEqual(conceptualization);
  });

  it("records session conceptualization generation failures", async () => {
    const conceptualizationRepository = createSessionConceptualizationRepository(db);

    await conceptualizationRepository.markFailed({
      id: "session-conceptualization-failure",
      sessionId: "session-conceptualization-failed-session",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      failedAt: "2026-07-06T10:05:00.000Z",
      errorMessage: "模型返回格式无效"
    });

    expect(await conceptualizationRepository.getBySessionId("session-conceptualization-failed-session")).toEqual({
      id: "session-conceptualization-failure",
      sessionId: "session-conceptualization-failed-session",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      fullMd: "",
      status: "failed",
      createdAt: "2026-07-06T10:05:00.000Z",
      updatedAt: "2026-07-06T10:05:00.000Z",
      errorMessage: "模型返回格式无效"
    });
  });

  it("stores session letters and keeps failed retries visible", async () => {
    const repository = createSessionLetterRepository(db);
    const letter: SessionLetter = {
      id: "session-letter-1",
      sessionId: "session-letter-session",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      letterMd: "亲爱的你：\n\n我记得你今天说到疲惫。",
      status: "ready",
      createdAt: "2026-07-06T10:00:00.000Z",
      updatedAt: "2026-07-06T10:00:00.000Z"
    };

    await repository.upsert(letter);
    await expect(repository.getBySessionId(letter.sessionId)).resolves.toEqual(letter);

    db.prepare("UPDATE session_letters SET letter_md = ? WHERE session_id = ?")
      .run(String.raw`亲爱的你：\n\n我记得你今天说到疲惫。`, letter.sessionId);
    await expect(repository.getBySessionId(letter.sessionId)).resolves.toEqual(letter);

    await repository.markPending({
      id: letter.id,
      sessionId: letter.sessionId,
      counselorId: letter.counselorId,
      modelName: letter.modelName,
      now: "2026-07-06T10:05:00.000Z"
    });
    await expect(repository.getBySessionId(letter.sessionId)).resolves.toEqual({
      ...letter,
      status: "pending",
      updatedAt: "2026-07-06T10:05:00.000Z"
    });

    await repository.markFailed({
      id: letter.id,
      sessionId: letter.sessionId,
      counselorId: letter.counselorId,
      modelName: letter.modelName,
      failedAt: "2026-07-06T10:06:00.000Z",
      errorMessage: "咨询师来信生成失败"
    });
    await expect(repository.getBySessionId(letter.sessionId)).resolves.toEqual({
      ...letter,
      status: "failed",
      updatedAt: "2026-07-06T10:06:00.000Z",
      errorMessage: "咨询师来信生成失败"
    });
  });

  it("tracks whether a letter has been read and clears the stamp when it is rewritten", async () => {
    const repository = createSessionLetterRepository(db);
    const letter: SessionLetter = {
      id: "session-letter-read-state",
      sessionId: "session-letter-read-state-session",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      letterMd: "亲爱的你：\n\n这是第一封信。",
      status: "ready",
      createdAt: "2026-07-06T10:00:00.000Z",
      updatedAt: "2026-07-06T10:00:00.000Z"
    };

    await repository.upsert(letter);
    expect((await repository.getBySessionId(letter.sessionId))?.readAt).toBeUndefined();

    await repository.markRead(letter.sessionId, "2026-07-06T10:02:00.000Z");
    expect(await repository.getBySessionId(letter.sessionId)).toMatchObject({
      readAt: "2026-07-06T10:02:00.000Z",
      // Reading must not reorder the archive, which sorts on updatedAt.
      updatedAt: "2026-07-06T10:00:00.000Z"
    });

    // A failure leaves the text untouched, so the letter stays read.
    await repository.markFailed({
      id: letter.id,
      sessionId: letter.sessionId,
      counselorId: letter.counselorId,
      modelName: letter.modelName,
      failedAt: "2026-07-06T10:04:00.000Z",
      errorMessage: "重新生成失败"
    });
    expect(await repository.getBySessionId(letter.sessionId)).toMatchObject({
      status: "failed",
      readAt: "2026-07-06T10:02:00.000Z"
    });

    // Regeneration shows the old text while the new one is written, so the old
    // stamp holds until the replacement actually lands.
    await repository.markPending({
      id: letter.id,
      sessionId: letter.sessionId,
      counselorId: letter.counselorId,
      modelName: letter.modelName,
      now: "2026-07-06T10:05:00.000Z"
    });
    expect(await repository.getBySessionId(letter.sessionId)).toMatchObject({
      status: "pending",
      letterMd: letter.letterMd,
      readAt: "2026-07-06T10:02:00.000Z"
    });

    // Writing the new text clears it: the client has not seen this letter.
    await repository.upsert({
      ...letter,
      letterMd: "第二封信，换了一个说法。",
      updatedAt: "2026-07-06T10:06:00.000Z"
    });
    const rewritten = await repository.getBySessionId(letter.sessionId);
    expect(rewritten).toMatchObject({ status: "ready", letterMd: "第二封信，换了一个说法。" });
    expect(rewritten?.readAt).toBeUndefined();
  });

  it("does not let an old ending cycle overwrite the current pending letter or preparation", async () => {
    const sessions = createSessionRepository(db);
    const letters = createSessionLetterRepository(db);
    const preparations = createConsultationPreparationRepository(db);
    const sessionId = "session-letter-cycle";
    const currentEndedAt = "2026-07-12T12:00:00.000Z";
    const oldEndedAt = "2026-07-12T11:00:00.000Z";
    await sessions.create({
      id: sessionId,
      title: "再次结束的会谈",
      counselorId: "chengling",
      roomThemeId: "warm-study",
      modelName: "test",
      status: "ended",
      createdAt: "2026-07-12T10:00:00.000Z",
      updatedAt: currentEndedAt,
      endedAt: currentEndedAt
    });
    await expect(letters.markPendingForEndedCycle({
      id: `session-letter-${sessionId}`,
      sessionId,
      counselorId: "chengling",
      modelName: "test",
      now: currentEndedAt
    }, currentEndedAt)).resolves.toBe(true);
    await expect(letters.upsertForEndedCycle({
      id: `session-letter-${sessionId}`,
      sessionId,
      counselorId: "chengling",
      modelName: "test",
      letterMd: "旧周期晚到的来信",
      status: "ready",
      createdAt: oldEndedAt,
      updatedAt: oldEndedAt
    }, oldEndedAt)).resolves.toBe(false);
    await expect(letters.markFailedForEndedCycle({
      id: `session-letter-${sessionId}`,
      sessionId,
      counselorId: "chengling",
      modelName: "test",
      failedAt: oldEndedAt,
      errorMessage: "旧周期失败"
    }, oldEndedAt)).resolves.toBe(false);
    await expect(preparations.upsertForEndedCycle({
      id: "preparation-old-cycle",
      sessionId,
      counselorId: "chengling",
      sourceEndedAt: oldEndedAt,
      modelName: "test",
      status: "pending",
      phase: "session-conceptualization",
      createdAt: oldEndedAt,
      updatedAt: oldEndedAt
    })).resolves.toBe(false);

    await expect(letters.getBySessionId(sessionId)).resolves.toMatchObject({
      status: "pending",
      letterMd: "",
      updatedAt: currentEndedAt
    });
    await expect(preparations.getBySessionId(sessionId)).resolves.toBeNull();
  });

  it("lists ready session conceptualizations by counselor in session timeline order", async () => {
    const sessionRepository = createSessionRepository(db);
    const conceptualizationRepository = createSessionConceptualizationRepository(db);
    const baseSession = {
      roomThemeId: "warm-study",
      teamId: "one-way-mirror",
      modelName: "deepseek-v4-flash",
      status: "ended" as const
    };
    await sessionRepository.create({
      ...baseSession,
      id: "session-old",
      title: "旧会谈",
      counselorId: "chengling",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T11:00:00.000Z",
      endedAt: "2026-07-01T11:00:00.000Z"
    });
    await sessionRepository.create({
      ...baseSession,
      id: "session-new",
      title: "新会谈",
      counselorId: "chengling",
      createdAt: "2026-07-03T10:00:00.000Z",
      updatedAt: "2026-07-03T11:00:00.000Z",
      endedAt: "2026-07-03T11:00:00.000Z"
    });
    await sessionRepository.create({
      ...baseSession,
      id: "session-other-counselor",
      title: "其他咨询师会谈",
      counselorId: "zhouzhou",
      createdAt: "2026-07-02T10:00:00.000Z",
      updatedAt: "2026-07-02T11:00:00.000Z",
      endedAt: "2026-07-02T11:00:00.000Z"
    });

    await conceptualizationRepository.upsert({
      id: "conceptualization-new",
      sessionId: "session-new",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      fullMd: "# 新会谈",
      status: "ready",
      createdAt: "2026-07-03T11:01:00.000Z",
      updatedAt: "2026-07-03T11:01:00.000Z"
    });
    await conceptualizationRepository.upsert({
      id: "conceptualization-old",
      sessionId: "session-old",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      fullMd: "# 旧会谈",
      status: "ready",
      createdAt: "2026-07-01T11:01:00.000Z",
      updatedAt: "2026-07-01T11:01:00.000Z"
    });
    await conceptualizationRepository.upsert({
      id: "conceptualization-other-counselor",
      sessionId: "session-other-counselor",
      counselorId: "zhouzhou",
      modelName: "deepseek-v4-pro",
      fullMd: "# 其他咨询师会谈",
      status: "ready",
      createdAt: "2026-07-02T11:01:00.000Z",
      updatedAt: "2026-07-02T11:01:00.000Z"
    });
    await conceptualizationRepository.markFailed({
      id: "conceptualization-failed",
      sessionId: "session-failed",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      failedAt: "2026-07-04T11:01:00.000Z",
      errorMessage: "失败记录不应进入 ready 列表"
    });

    await expect(conceptualizationRepository.listReadyByCounselorId("chengling")).resolves.toEqual([
      expect.objectContaining({ sessionId: "session-old", fullMd: "# 旧会谈" }),
      expect.objectContaining({ sessionId: "session-new", fullMd: "# 新会谈" })
    ]);
  });

  it("stores long-term conceptualization by counselor with covered session ids", async () => {
    const repository = createLongTermConceptualizationRepository(db);
    const conceptualization: LongTermConceptualization = {
      id: "long-term-conceptualization-chengling",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      fullMd: "# 长期个案概念化\n\n## 当前主要议题\n工作压力。",
      coveredSessionIds: ["session-1", "session-2"],
      coveredUntilSessionId: "session-2",
      coveredUntilEndedAt: "2026-07-06T10:00:00.000Z",
      status: "ready",
      createdAt: "2026-07-06T10:01:00.000Z",
      updatedAt: "2026-07-06T10:01:00.000Z"
    };

    await repository.upsert(conceptualization);

    await expect(repository.getByCounselorId("chengling")).resolves.toEqual(conceptualization);
    await expect(repository.getByCounselorId("zhouzhou")).resolves.toBeNull();
  });

  it("records long-term conceptualization failures without deleting previous content", async () => {
    const repository = createLongTermConceptualizationRepository(db);
    await repository.upsert({
      id: "long-term-conceptualization-chengling",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      fullMd: "# 旧长期个案概念化",
      coveredSessionIds: ["session-1"],
      coveredUntilSessionId: "session-1",
      coveredUntilEndedAt: "2026-07-05T10:00:00.000Z",
      status: "ready",
      createdAt: "2026-07-05T10:01:00.000Z",
      updatedAt: "2026-07-05T10:01:00.000Z"
    });

    await repository.markFailed({
      id: "long-term-conceptualization-chengling",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      failedAt: "2026-07-06T10:01:00.000Z",
      errorMessage: "长期个案概念化生成失败"
    });

    await expect(repository.getByCounselorId("chengling")).resolves.toEqual({
      id: "long-term-conceptualization-chengling",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      fullMd: "# 旧长期个案概念化",
      coveredSessionIds: ["session-1"],
      coveredUntilSessionId: "session-1",
      coveredUntilEndedAt: "2026-07-05T10:00:00.000Z",
      status: "failed",
      createdAt: "2026-07-05T10:01:00.000Z",
      updatedAt: "2026-07-06T10:01:00.000Z",
      errorMessage: "长期个案概念化生成失败"
    });
  });
});

describe("Ling versioned migrations", () => {
  let tempDir: string;
  let databasePath: string;
  let db: LingDatabase;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "ling-migration-"));
    databasePath = join(tempDir, "ling.sqlite");
    db = createLingDatabase({ path: databasePath });
  });

  afterEach(() => {
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("records applied migrations in schema_migrations table", () => {
    const applied = getAppliedMigrations(db);
    expect(applied.length).toBeGreaterThan(0);
    expect(applied[0]).toHaveProperty("name");
    expect(applied[0]).toHaveProperty("applied_at");
    expect(applied.map((migration) => migration.name)).toEqual(migrations.map((migration) => migration.name));
  });

  it("does not insert duplicate migration records on repeated run", () => {
    const firstRun = getAppliedMigrations(db);
    migrateLingDatabase(db);
    const secondRun = getAppliedMigrations(db);
    expect(secondRun).toEqual(firstRun);
  });

  it("adds the letter read stamp to a database written before it existed", async () => {
    const letters = createSessionLetterRepository(db);
    await letters.upsert({
      id: "session-letter-predates-read-state",
      sessionId: "session-predates-read-state",
      counselorId: "chengling",
      modelName: "deepseek-v4-pro",
      letterMd: "旧版本写下的来信",
      status: "ready",
      createdAt: "2026-07-06T10:00:00.000Z",
      updatedAt: "2026-07-06T10:00:00.000Z"
    });

    // Roll the database back to its pre-015 shape: no column, no record that the
    // migration ran.
    db.exec("ALTER TABLE session_letters DROP COLUMN read_at");
    db.prepare("DELETE FROM schema_migrations WHERE name = ?").run("015_session_letter_read_state");

    migrateLingDatabase(db);

    // The column is back and the letter that was already there now reads as
    // unread — the client never saw it through a reader that tracks reading.
    const restored = await letters.getBySessionId("session-predates-read-state");
    expect(restored).toMatchObject({ letterMd: "旧版本写下的来信", status: "ready" });
    expect(restored?.readAt).toBeUndefined();
    await letters.markRead("session-predates-read-state", "2026-07-06T10:05:00.000Z");
    expect((await letters.getBySessionId("session-predates-read-state"))?.readAt).toBe("2026-07-06T10:05:00.000Z");
  });

  it("preserves existing settings/session/message/memory data after repeated migration", async () => {
    const settingsRepo = createSettingsRepository(db);
    const sessionRepo = createSessionRepository(db);
    const messageRepo = createMessageRepository(db);
    const memoryRepo = createMemoryRepository(db);
    const rollingSummaryRepo = createRollingSummaryRepository(db);

    const settings: UserSettings = {
      api: { apiBaseUrl: "http://localhost:11434/v1", apiKey: "key", modelName: "m" },
      defaultCounselorId: "chengling",
      defaultRoomThemeId: "quiet-study"
    };
    await settingsRepo.save(settings);

    const session: CounselingSession = {
      id: "s1", title: "测试会谈", counselorId: "chengling",
      roomThemeId: "quiet-study", modelName: "m",
      createdAt: "2026-07-03T10:00:00.000Z", updatedAt: "2026-07-03T10:00:00.000Z",
      status: "active"
    };
    await sessionRepo.create(session);

    const msg: SessionMessage = {
      id: "m1", sessionId: "s1", role: "user",
      content: "测试消息", createdAt: "2026-07-03T10:01:00.000Z", status: "sent"
    };
    await messageRepo.append(msg);

    await memoryRepo.create({
      id: "mem1", type: "theme", title: "测试记忆",
      content: "内容", sourceSessionId: "s1", status: "confirmed", createdAt: "2026-07-03T10:02:00.000Z",
      updatedAt: "2026-07-03T10:02:00.000Z"
    });

    await rollingSummaryRepo.upsert({
      sessionId: "s1",
      counselorId: "chengling",
      summary: "### 重要事实\n- 测试事实。\n\n### 事情经过\n- 测试经过。",
      coveredMessageCount: 2,
      createdAt: "2026-07-03T10:03:00.000Z",
      updatedAt: "2026-07-03T10:03:00.000Z",
      status: "active"
    });

    // Run migration again
    migrateLingDatabase(db);

    // All data should still be readable
    expect(await settingsRepo.read()).toEqual({
      ...settings,
      api: {
        ...settings.api,
        apiKey: "",
        apiKeySaved: true,
        apiKeyPreview: "••••"
      }
    });
    expect(await sessionRepo.getById("s1")).toBeTruthy();
    expect(await messageRepo.listBySessionId("s1")).toHaveLength(1);
    expect(await memoryRepo.list()).toHaveLength(1);
    expect(await rollingSummaryRepo.getBySessionId("s1")).toBeTruthy();
  });

  it("migrates old Cheng Ling counselor ids from lingjie to chengling", async () => {
    db.prepare("DELETE FROM schema_migrations WHERE name = ?").run("007_rename_chengling_counselor_id");
    db.prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES ('userSettings', @value, '2026-07-05T00:00:00.000Z')
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run({
      value: JSON.stringify({
        api: { apiBaseUrl: "https://api.example.test", apiKey: "", modelName: "m" },
        defaultCounselorId: "lingjie",
        defaultRoomThemeId: "quiet-study"
      })
    });
    db.prepare(
      `INSERT INTO sessions (
        id, title, counselor_id, room_theme_id, team_id, model_name, prompt_snapshot,
        created_at, updated_at, started_at, status
      ) VALUES (
        'old-s1', '旧会谈', 'lingjie', 'quiet-study', 'one-way-mirror', 'm', @promptSnapshot,
        '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z', 'active'
      )`
    ).run({
      promptSnapshot: JSON.stringify({
        version: 1,
        counselorId: "lingjie",
        teamId: "one-way-mirror",
        modelName: "m",
        systemPrompt: "旧快照",
        createdAt: "2026-07-05T00:00:00.000Z"
      })
    });
    db.prepare(
      `INSERT INTO rolling_summaries (
        session_id, counselor_id, summary, covered_message_count, created_at, updated_at, status
      ) VALUES (
        'old-s1', 'lingjie', '### 重要事实\n- 旧摘要。\n\n### 事情经过\n- 旧经过。', 2,
        '2026-07-05T00:00:00.000Z', '2026-07-05T00:00:00.000Z', 'active'
      )`
    ).run();

    migrateLingDatabase(db);

    const settingsRepo = createSettingsRepository(db);
    const sessionRepo = createSessionRepository(db);
    const rollingSummaryRepo = createRollingSummaryRepository(db);
    expect((await settingsRepo.read())?.defaultCounselorId).toBe("chengling");
    expect((await sessionRepo.getById("old-s1"))?.counselorId).toBe("chengling");
    expect((await sessionRepo.getById("old-s1"))?.promptSnapshot?.counselorId).toBe("chengling");
    expect((await rollingSummaryRepo.getBySessionId("old-s1"))?.counselorId).toBe("chengling");
  });

  it("does not record a failed migration and preserves existing data", () => {
    // Push a broken migration that will fail partway through
    const brokenMigration = {
      name: "999_doomed_to_fail",
      statements: [
        // This statement is fine — it creates a table
        "CREATE TABLE IF NOT EXISTS innocent_table (id INTEGER PRIMARY KEY)",
        // This statement deliberately fails (parse error)
        "GARBAGE THAT WILL NEVER PARSE",
      ]
    };
    const originalMigrations = [...migrations];
    migrations.push(brokenMigration);

    // Write some data before attempting the broken migration
    db.exec(
      "INSERT INTO settings (key, value, updated_at) VALUES ('test-key', 'test-value', '2026-07-03T10:00:00.000Z')"
    );

    try {
      // Attempting to apply the broken migration should throw
      migrateLingDatabase(db);
    } catch {
      // Expected — the broken statement should cause a failure
    } finally {
      // Restore migrations list so other tests aren't polluted
      migrations.length = 0;
      migrations.push(...originalMigrations);
    }

    // Assert: the broken migration must NOT appear in schema_migrations
    const appliedNames = getAppliedMigrations(db).map((m) => m.name);
    expect(appliedNames).not.toContain("999_doomed_to_fail");

    // Assert: the innocent_table must NOT exist (transaction rolled back)
    const tableCheck = db
      .prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='innocent_table'")
      .all();
    expect(tableCheck).toHaveLength(0);

    // Assert: pre-existing data must still be readable
    const row = db
      .prepare<[string], { value: string }>("SELECT value FROM settings WHERE key = ?")
      .get("test-key");
    expect(row?.value).toBe("test-value");
  });
});
