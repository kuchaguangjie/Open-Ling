import type { RollingSummary } from "../../../shared/src/index.js";
import type { LingDatabase } from "../db.js";

export interface RollingSummaryRepository {
  getBySessionId: (sessionId: string) => Promise<RollingSummary | null>;
  upsert: (summary: RollingSummary) => Promise<void>;
  upsertForExistingSession: (summary: RollingSummary) => Promise<boolean>;
  markFailed: (input: {
    sessionId: string;
    counselorId: string;
    attemptedMessageCount: number;
    errorMessage: string;
    failedAt: string;
  }) => Promise<void>;
  markFailedForExistingSession: (input: RollingSummaryFailureInput) => Promise<boolean>;
}

interface RollingSummaryFailureInput {
  sessionId: string;
  counselorId: string;
  attemptedMessageCount: number;
  errorMessage: string;
  failedAt: string;
}

interface RollingSummaryRow {
  session_id: string;
  counselor_id: string;
  summary: string;
  covered_message_count: number;
  covered_until_message_id: string | null;
  last_attempted_message_count: number | null;
  last_error_at: string | null;
  source_hash: string | null;
  created_at: string;
  updated_at: string;
  status: RollingSummary["status"];
  error_message: string | null;
}

export function createRollingSummaryRepository(db: LingDatabase): RollingSummaryRepository {
  const upsertForExistingSession = db.transaction((summary: RollingSummary) => {
    if (!sessionExists(db, summary.sessionId)) return false;
    upsertRollingSummary(db, summary);
    return true;
  });
  const markFailedForExistingSession = db.transaction((input: RollingSummaryFailureInput) => {
    if (!sessionExists(db, input.sessionId)) return false;
    markRollingSummaryFailed(db, input);
    return true;
  });
  return {
    async getBySessionId(sessionId) {
      const row = db.prepare<[string], RollingSummaryRow>("SELECT * FROM rolling_summaries WHERE session_id = ?").get(sessionId);
      return row ? mapRollingSummaryRow(row) : null;
    },
    async upsert(summary) {
      upsertRollingSummary(db, summary);
    },
    async upsertForExistingSession(summary) {
      return upsertForExistingSession(summary);
    },
    async markFailed(input) {
      markRollingSummaryFailed(db, input);
    },
    async markFailedForExistingSession(input) {
      return markFailedForExistingSession(input);
    }
  };
}

function upsertRollingSummary(db: LingDatabase, summary: RollingSummary) {
  db.prepare(
    `INSERT INTO rolling_summaries (
      session_id, counselor_id, summary, covered_message_count, covered_until_message_id,
      last_attempted_message_count, last_error_at, source_hash, created_at, updated_at, status, error_message
    ) VALUES (
      @sessionId, @counselorId, @summary, @coveredMessageCount, @coveredUntilMessageId,
      @lastAttemptedMessageCount, @lastErrorAt, @sourceHash, @createdAt, @updatedAt, @status, @errorMessage
    )
    ON CONFLICT(session_id) DO UPDATE SET
      counselor_id = excluded.counselor_id,
      summary = excluded.summary,
      covered_message_count = excluded.covered_message_count,
      covered_until_message_id = excluded.covered_until_message_id,
      last_attempted_message_count = excluded.last_attempted_message_count,
      last_error_at = excluded.last_error_at,
      source_hash = excluded.source_hash,
      updated_at = excluded.updated_at,
      status = excluded.status,
      error_message = excluded.error_message`
  ).run({
    sessionId: summary.sessionId,
    counselorId: summary.counselorId,
    summary: summary.summary,
    coveredMessageCount: summary.coveredMessageCount,
    coveredUntilMessageId: summary.coveredUntilMessageId ?? null,
    lastAttemptedMessageCount: summary.lastAttemptedMessageCount ?? null,
    lastErrorAt: summary.lastErrorAt ?? null,
    sourceHash: summary.sourceHash ?? null,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    status: summary.status,
    errorMessage: summary.errorMessage ?? null
  });
}

function markRollingSummaryFailed(db: LingDatabase, input: RollingSummaryFailureInput) {
  const existing = db
    .prepare<[string], RollingSummaryRow>("SELECT * FROM rolling_summaries WHERE session_id = ?")
    .get(input.sessionId);
  const now = input.failedAt;
  db.prepare(
    `INSERT INTO rolling_summaries (
      session_id, counselor_id, summary, covered_message_count, covered_until_message_id,
      last_attempted_message_count, last_error_at, source_hash, created_at, updated_at, status, error_message
    ) VALUES (
      @sessionId, @counselorId, @summary, @coveredMessageCount, @coveredUntilMessageId,
      @lastAttemptedMessageCount, @lastErrorAt, @sourceHash, @createdAt, @updatedAt, @status, @errorMessage
    )
    ON CONFLICT(session_id) DO UPDATE SET
      counselor_id = excluded.counselor_id,
      last_attempted_message_count = excluded.last_attempted_message_count,
      last_error_at = excluded.last_error_at,
      updated_at = excluded.updated_at,
      status = excluded.status,
      error_message = excluded.error_message`
  ).run({
    sessionId: input.sessionId,
    counselorId: input.counselorId,
    summary: existing?.summary ?? "",
    coveredMessageCount: existing?.covered_message_count ?? 0,
    coveredUntilMessageId: existing?.covered_until_message_id ?? null,
    lastAttemptedMessageCount: input.attemptedMessageCount,
    lastErrorAt: input.failedAt,
    sourceHash: existing?.source_hash ?? null,
    createdAt: existing?.created_at ?? now,
    updatedAt: now,
    status: existing?.summary ? "failed" : "stale",
    errorMessage: input.errorMessage
  });
}

function sessionExists(db: LingDatabase, sessionId: string) {
  return Boolean(db.prepare<[string], { id: string }>("SELECT id FROM sessions WHERE id = ?").get(sessionId));
}

function mapRollingSummaryRow(row: RollingSummaryRow): RollingSummary {
  return {
    sessionId: row.session_id,
    counselorId: row.counselor_id,
    summary: row.summary,
    coveredMessageCount: row.covered_message_count,
    coveredUntilMessageId: row.covered_until_message_id ?? undefined,
    lastAttemptedMessageCount: row.last_attempted_message_count ?? undefined,
    lastErrorAt: row.last_error_at ?? undefined,
    sourceHash: row.source_hash ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    errorMessage: row.error_message ?? undefined
  };
}
