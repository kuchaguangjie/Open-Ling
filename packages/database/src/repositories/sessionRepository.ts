import type {
  CounselingMemorySnapshot,
  CounselingPromptSnapshot,
  CounselingSession
} from "../../../shared/src/index.js";
import type { LingDatabase } from "../db.js";

export interface SessionRepository {
  list: () => Promise<CounselingSession[]>;
  getLatestEndedByCounselorId: (counselorId: string) => Promise<CounselingSession | null>;
  getById: (id: string) => Promise<CounselingSession | null>;
  create: (session: CounselingSession) => Promise<void>;
  createDraftIfNoUnfinishedForCounselor: (session: CounselingSession) => Promise<boolean>;
  deleteActiveSessionsWithoutUserMessages: () => Promise<string[]>;
  replaceUnfinishedWithDraft: (
    session: CounselingSession,
    replacementTargetId: string
  ) => Promise<{ ok: true; endedSessions: CounselingSession[] } | { ok: false; reason: "not-found" | "wrong-counselor" | "not-unfinished" }>;
  update: (id: string, changes: Partial<Omit<CounselingSession, "id">>) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

interface SessionRow {
  id: string;
  title: string;
  counselor_id: string;
  room_theme_id: string;
  team_id: string | null;
  model_name: string;
  prompt_snapshot: string | null;
  memory_snapshot: string | null;
  created_at: string;
  updated_at: string;
  started_at: string;
  ended_at: string | null;
  status: CounselingSession["status"];
  summary: string | null;
}

const sessionUpdateColumns = {
  title: "title",
  counselorId: "counselor_id",
  roomThemeId: "room_theme_id",
  teamId: "team_id",
  modelName: "model_name",
  promptSnapshot: "prompt_snapshot",
  memorySnapshot: "memory_snapshot",
  createdAt: "created_at",
  updatedAt: "updated_at",
  startedAt: "started_at",
  endedAt: "ended_at",
  status: "status",
  summary: "summary"
} as const satisfies Record<keyof Omit<CounselingSession, "id">, string>;

export function createSessionRepository(db: LingDatabase): SessionRepository {
  const createDraftIfNoUnfinishedForCounselor = db.transaction((session: CounselingSession) => {
    if (session.status !== "draft") return false;
    const unfinished = db.prepare<[string], { id: string }>(
      `SELECT id FROM sessions
       WHERE counselor_id = ? AND status IN ('active', 'draft') LIMIT 1`
    ).get(session.counselorId);
    if (unfinished) return false;
    insertSession(db, session);
    return true;
  });
  const replaceUnfinishedWithDraft = db.transaction((session: CounselingSession, replacementTargetId: string) => {
    if (session.status !== "draft") return { ok: false as const, reason: "not-unfinished" as const };
    const targetRow = db.prepare<[string], SessionRow>("SELECT * FROM sessions WHERE id = ?").get(replacementTargetId);
    if (!targetRow) return { ok: false as const, reason: "not-found" as const };
    const target = mapSessionRow(targetRow);
    if (target.counselorId !== session.counselorId) return { ok: false as const, reason: "wrong-counselor" as const };
    if (target.status !== "active" && target.status !== "draft") return { ok: false as const, reason: "not-unfinished" as const };

    const unfinished = db.prepare<[string], SessionRow>(
      `SELECT * FROM sessions WHERE counselor_id = ? AND status IN ('active', 'draft')`
    ).all(session.counselorId).map(mapSessionRow);
    const endedAt = new Date().toISOString();
    const endedSessions: CounselingSession[] = [];
    for (const existing of unfinished) {
      if (existing.status === "draft") {
        deleteSessionRecords(db, existing.id);
        continue;
      }
      const userMessageCount = db.prepare<[string], { count: number }>("SELECT COUNT(*) AS count FROM messages WHERE session_id = ? AND role = 'user'").get(existing.id)?.count ?? 0;
      if (userMessageCount === 0) {
        deleteSessionRecords(db, existing.id);
        continue;
      }
      const ended = { ...existing, status: "ended" as const, endedAt, updatedAt: endedAt };
      db.prepare("UPDATE sessions SET status = 'ended', ended_at = @endedAt, updated_at = @updatedAt WHERE id = @id").run(ended);
      endedSessions.push(ended);
    }
    insertSession(db, session);
    return { ok: true as const, endedSessions };
  });
  const deleteActiveSessionsWithoutUserMessages = db.transaction(() => {
    const ids = db.prepare<[], { id: string }>(
      `SELECT s.id FROM sessions s
       WHERE s.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM messages m WHERE m.session_id = s.id AND m.role = 'user'
         )`
    ).all().map((row) => row.id);
    ids.forEach((id) => deleteSessionRecords(db, id));
    return ids;
  });
  return {
    async list() {
      const rows = db
        .prepare<[], SessionRow>("SELECT * FROM sessions ORDER BY updated_at DESC, created_at DESC")
        .all();
      return rows.map(mapSessionRow);
    },
    async getLatestEndedByCounselorId(counselorId) {
      const row = db.prepare<[string], SessionRow>(
        `SELECT * FROM sessions
         WHERE counselor_id = ? AND status = 'ended' AND ended_at IS NOT NULL
         ORDER BY ended_at DESC, created_at DESC, id DESC LIMIT 1`
      ).get(counselorId);
      return row ? mapSessionRow(row) : null;
    },
    async getById(id) {
      const row = db.prepare<[string], SessionRow>("SELECT * FROM sessions WHERE id = ?").get(id);
      return row ? mapSessionRow(row) : null;
    },
    async create(session) {
      insertSession(db, session);
    },
    async createDraftIfNoUnfinishedForCounselor(session) {
      return createDraftIfNoUnfinishedForCounselor.immediate(session);
    },
    async deleteActiveSessionsWithoutUserMessages() {
      return deleteActiveSessionsWithoutUserMessages.immediate();
    },
    async replaceUnfinishedWithDraft(session, replacementTargetId) {
      return replaceUnfinishedWithDraft.immediate(session, replacementTargetId);
    },
    async update(id, changes) {
      const entries = Object.entries(changes).filter(([, value]) => value !== undefined);
      if (entries.length === 0) return;

      const assignments = entries.map(([key]) => `${sessionUpdateColumns[key as keyof typeof sessionUpdateColumns]} = @${key}`);
      db.prepare(`UPDATE sessions SET ${assignments.join(", ")} WHERE id = @id`).run({
        id,
        ...changes,
        promptSnapshot: changes.promptSnapshot ? JSON.stringify(changes.promptSnapshot) : changes.promptSnapshot,
        memorySnapshot: changes.memorySnapshot ? JSON.stringify(changes.memorySnapshot) : changes.memorySnapshot
      });
    },
    async delete(id) {
      const removeSession = db.transaction((sessionId: string) => {
        deleteSessionRecords(db, sessionId);
      });
      removeSession(id);
    }
  };
}

function deleteSessionRecords(db: LingDatabase, sessionId: string) {
  db.prepare("DELETE FROM messages WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM imported_documents WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM rolling_summaries WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM consultation_memos WHERE source_session_id = ?").run(sessionId);
  db.prepare("DELETE FROM session_supervisions WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM consultation_preparations WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM session_conceptualizations WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM session_letters WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

function insertSession(db: LingDatabase, session: CounselingSession) {
  const createdAt = session.createdAt ?? session.startedAt ?? new Date().toISOString();
  const updatedAt = session.updatedAt ?? createdAt;
  const startedAt = session.startedAt ?? createdAt;
  db.prepare(
    `INSERT INTO sessions (
      id, title, counselor_id, room_theme_id, team_id, model_name, prompt_snapshot, memory_snapshot,
      created_at, updated_at, started_at, ended_at, status, summary
    ) VALUES (
      @id, @title, @counselorId, @roomThemeId, @teamId, @modelName, @promptSnapshot, @memorySnapshot,
      @createdAt, @updatedAt, @startedAt, @endedAt, @status, @summary
    )`
  ).run({
    ...session,
    teamId: session.teamId ?? null,
    promptSnapshot: session.promptSnapshot ? JSON.stringify(session.promptSnapshot) : null,
    memorySnapshot: session.memorySnapshot ? JSON.stringify(session.memorySnapshot) : null,
    createdAt,
    updatedAt,
    startedAt,
    endedAt: session.endedAt ?? null,
    summary: session.summary ?? null
  });
}

function mapSessionRow(row: SessionRow): CounselingSession {
  const session: CounselingSession = {
    id: row.id,
    title: row.title,
    counselorId: row.counselor_id,
    roomThemeId: row.room_theme_id,
    teamId: row.team_id ?? undefined,
    modelName: row.model_name,
    promptSnapshot: parsePromptSnapshot(row.prompt_snapshot),
    memorySnapshot: parseMemorySnapshot(row.memory_snapshot),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    endedAt: row.ended_at ?? undefined,
    status: row.status
  };
  if (row.started_at !== row.created_at) {
    session.startedAt = row.started_at;
  }
  if (row.summary) {
    session.summary = row.summary;
  }
  return session;
}

function parseMemorySnapshot(value: string | null): CounselingMemorySnapshot | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<CounselingMemorySnapshot>;
    if (parsed.version !== 2 || typeof parsed.enabled !== "boolean" || typeof parsed.createdAt !== "string") {
      return undefined;
    }
    if (
      (parsed.consultationMemo !== undefined && typeof parsed.consultationMemo !== "string") ||
      (parsed.sourceMemoId !== undefined && typeof parsed.sourceMemoId !== "string")
    ) {
      return undefined;
    }
    return parsed as CounselingMemorySnapshot;
  } catch {
    return undefined;
  }
}

function parsePromptSnapshot(value: string | null): CounselingPromptSnapshot | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<CounselingPromptSnapshot> & Record<string, unknown>;
    if (
      typeof parsed.counselorId !== "string" ||
      typeof parsed.modelName !== "string" ||
      typeof parsed.systemPrompt !== "string" ||
      typeof parsed.createdAt !== "string" ||
      (parsed.teamId !== undefined && typeof parsed.teamId !== "string")
    ) {
      return undefined;
    }
    if (parsed.version === 1) return parsed as CounselingPromptSnapshot;
    if (
      parsed.version === 2 &&
      typeof parsed.counselorCorePrompt === "string" &&
      typeof parsed.counselingTaskPrompt === "string" &&
      typeof parsed.teamPrompt === "string"
    ) {
      return parsed as CounselingPromptSnapshot;
    }
    if (
      parsed.version === 3 &&
      typeof parsed.counselorCorePrompt === "string" &&
      typeof parsed.sharedCounselingValuesPrompt === "string" &&
      typeof parsed.counselingTaskPrompt === "string" &&
      typeof parsed.teamPrompt === "string" &&
      (parsed.locale === undefined || parsed.locale === "zh-CN" || parsed.locale === "en-US")
    ) {
      return parsed as CounselingPromptSnapshot;
    }
    if (
      parsed.version === 4 &&
      typeof parsed.counselorPackageVersion === "string" &&
      typeof parsed.promptContentHash === "string" &&
      typeof parsed.counselorCorePrompt === "string" &&
      typeof parsed.sharedCounselingValuesPrompt === "string" &&
      typeof parsed.counselingTaskPrompt === "string" &&
      typeof parsed.teamPrompt === "string" &&
      (parsed.locale === "zh-CN" || parsed.locale === "en-US")
    ) {
      return parsed as CounselingPromptSnapshot;
    }
    if (
      parsed.version === 5 &&
      typeof parsed.counselorPackageVersion === "string" &&
      typeof parsed.promptContentHash === "string" &&
      typeof parsed.counselorCorePrompt === "string" &&
      typeof parsed.counselorVoicePrompt === "string" &&
      typeof parsed.sharedCounselingValuesPrompt === "string" &&
      typeof parsed.counselingTaskPrompt === "string" &&
      typeof parsed.teamPrompt === "string" &&
      (parsed.locale === "zh-CN" || parsed.locale === "en-US")
    ) {
      return parsed as CounselingPromptSnapshot;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
