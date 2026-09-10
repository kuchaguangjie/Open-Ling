import {
  normalizeSessionLetterMarkdown,
  type SessionLetter
} from "../../../shared/src/index.js";
import type { LingDatabase } from "../db.js";

export interface SessionLetterRepository {
  list: () => Promise<SessionLetter[]>;
  getBySessionId: (sessionId: string) => Promise<SessionLetter | null>;
  upsert: (letter: SessionLetter) => Promise<void>;
  upsertForEndedCycle: (letter: SessionLetter, sourceEndedAt: string) => Promise<boolean>;
  markPending: (pending: SessionLetterPendingInput) => Promise<void>;
  markPendingForEndedCycle: (pending: SessionLetterPendingInput, sourceEndedAt: string) => Promise<boolean>;
  markFailed: (failure: SessionLetterFailureInput) => Promise<void>;
  markFailedForEndedCycle: (failure: SessionLetterFailureInput, sourceEndedAt: string) => Promise<boolean>;
  markRead: (sessionId: string, readAt: string) => Promise<void>;
}

interface SessionLetterPendingInput {
  id: string;
  sessionId: string;
  counselorId: string;
  modelName: string;
  now: string;
}

interface SessionLetterFailureInput {
  id: string;
  sessionId: string;
  counselorId: string;
  modelName: string;
  failedAt: string;
  errorMessage: string;
}

interface SessionLetterRow {
  id: string;
  session_id: string;
  counselor_id: string;
  model_name: string;
  letter_md: string;
  status: SessionLetter["status"];
  created_at: string;
  updated_at: string;
  error_message: string | null;
  read_at: string | null;
}

export function createSessionLetterRepository(db: LingDatabase): SessionLetterRepository {
  const upsertForEndedCycle = db.transaction((letter: SessionLetter, sourceEndedAt: string) => {
    if (!isCurrentEndedCycle(db, letter.sessionId, sourceEndedAt)) return false;
    upsertSessionLetter(db, letter);
    return true;
  });
  const markPendingForEndedCycle = db.transaction((pending: SessionLetterPendingInput, sourceEndedAt: string) => {
    if (!isCurrentEndedCycle(db, pending.sessionId, sourceEndedAt)) return false;
    markSessionLetterPending(db, pending);
    return true;
  });
  const markFailedForEndedCycle = db.transaction((failure: SessionLetterFailureInput, sourceEndedAt: string) => {
    if (!isCurrentEndedCycle(db, failure.sessionId, sourceEndedAt)) return false;
    markSessionLetterFailed(db, failure);
    return true;
  });

  return {
    async list() {
      const rows = db
        .prepare<[], SessionLetterRow>(
          `SELECT sl.*
           FROM session_letters sl
           LEFT JOIN sessions s ON s.id = sl.session_id
           ORDER BY COALESCE(s.ended_at, sl.updated_at) DESC, sl.updated_at DESC`
        )
        .all();
      return rows.map(mapSessionLetterRow);
    },
    async getBySessionId(sessionId) {
      return getSessionLetterBySessionId(db, sessionId);
    },
    async upsert(letter) {
      upsertSessionLetter(db, letter);
    },
    async upsertForEndedCycle(letter, sourceEndedAt) {
      return upsertForEndedCycle(letter, sourceEndedAt);
    },
    async markPending(pending) {
      markSessionLetterPending(db, pending);
    },
    async markPendingForEndedCycle(pending, sourceEndedAt) {
      return markPendingForEndedCycle(pending, sourceEndedAt);
    },
    async markFailed(failure) {
      markSessionLetterFailed(db, failure);
    },
    async markFailedForEndedCycle(failure, sourceEndedAt) {
      return markFailedForEndedCycle(failure, sourceEndedAt);
    },
    async markRead(sessionId, readAt) {
      markSessionLetterRead(db, sessionId, readAt);
    }
  };
}

function getSessionLetterBySessionId(db: LingDatabase, sessionId: string) {
  const row = db
    .prepare<[string], SessionLetterRow>("SELECT * FROM session_letters WHERE session_id = ?")
    .get(sessionId);
  return row ? mapSessionLetterRow(row) : null;
}

function upsertSessionLetter(db: LingDatabase, letter: SessionLetter) {
  db.prepare(
    `INSERT INTO session_letters (
      id, session_id, counselor_id, model_name, letter_md, status, created_at, updated_at, error_message, read_at
    ) VALUES (
      @id, @sessionId, @counselorId, @modelName, @letterMd, @status, @createdAt, @updatedAt, @errorMessage, @readAt
    )
    ON CONFLICT(session_id) DO UPDATE SET
      id = excluded.id,
      counselor_id = excluded.counselor_id,
      model_name = excluded.model_name,
      letter_md = excluded.letter_md,
      status = excluded.status,
      updated_at = excluded.updated_at,
      error_message = excluded.error_message,
      read_at = excluded.read_at`
  ).run({
    ...letter,
    letterMd: normalizeSessionLetterMarkdown(letter.letterMd),
    errorMessage: letter.errorMessage ?? null,
    readAt: letter.readAt ?? null
  });
}

function markSessionLetterRead(db: LingDatabase, sessionId: string, readAt: string) {
  // updated_at is deliberately untouched: reading a letter must not reorder the
  // archive, which sorts on COALESCE(session.ended_at, letter.updated_at).
  db.prepare("UPDATE session_letters SET read_at = ? WHERE session_id = ?").run(readAt, sessionId);
}

function markSessionLetterPending(db: LingDatabase, { id, sessionId, counselorId, modelName, now }: SessionLetterPendingInput) {
  const existing = getSessionLetterBySessionId(db, sessionId);
  upsertSessionLetter(db, {
    id,
    sessionId,
    counselorId,
    modelName,
    // The previous text is kept on screen while the new one is written, so its
    // read stamp stays with it. The stamp is cleared once the pipeline writes
    // the freshly drafted letter, which carries no readAt — that is, once the
    // text the client already read is actually replaced.
    letterMd: existing?.letterMd ?? "",
    status: "pending",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    readAt: existing?.readAt
  });
}

function markSessionLetterFailed(
  db: LingDatabase,
  { id, sessionId, counselorId, modelName, failedAt, errorMessage }: SessionLetterFailureInput
) {
  const existing = getSessionLetterBySessionId(db, sessionId);
  upsertSessionLetter(db, {
    id,
    sessionId,
    counselorId,
    modelName,
    letterMd: existing?.letterMd ?? "",
    status: "failed",
    createdAt: existing?.createdAt ?? failedAt,
    updatedAt: failedAt,
    errorMessage,
    // A failure leaves the text as it was, so it must not resurrect as unread.
    readAt: existing?.readAt
  });
}

function isCurrentEndedCycle(db: LingDatabase, sessionId: string, sourceEndedAt: string) {
  const session = db
    .prepare<[string], { status: string; ended_at: string | null }>("SELECT status, ended_at FROM sessions WHERE id = ?")
    .get(sessionId);
  return session?.status === "ended" && session.ended_at === sourceEndedAt;
}

function mapSessionLetterRow(row: SessionLetterRow): SessionLetter {
  const letter: SessionLetter = {
    id: row.id,
    sessionId: row.session_id,
    counselorId: row.counselor_id,
    modelName: row.model_name,
    letterMd: normalizeSessionLetterMarkdown(row.letter_md),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (row.error_message) {
    letter.errorMessage = row.error_message;
  }
  if (row.read_at) {
    letter.readAt = row.read_at;
  }
  return letter;
}
