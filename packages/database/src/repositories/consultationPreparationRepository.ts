import type {
  ConsultationPreparation,
  ConsultationPreparationPhase,
  PublishConsultationPreparationInput
} from "../../../shared/src/index.js";
import type { LingDatabase } from "../db.js";
import { upsertConsultationMemo } from "./consultationMemoRepository.js";
import { upsertSessionSupervision } from "./sessionSupervisionRepository.js";

export interface ConsultationPreparationRepository {
  getBySessionId: (sessionId: string) => Promise<ConsultationPreparation | null>;
  getLatestByCounselorId: (counselorId: string) => Promise<ConsultationPreparation | null>;
  upsert: (preparation: ConsultationPreparation) => Promise<void>;
  upsertForEndedCycle: (preparation: ConsultationPreparation) => Promise<boolean>;
  markProcessing: (id: string, phase: ConsultationPreparationPhase, updatedAt: string) => Promise<void>;
  markFailed: (id: string, errorMessage: string, updatedAt: string) => Promise<void>;
  markStale: (id: string, updatedAt: string) => Promise<void>;
  invalidatePublishedBySessionId: (sessionId: string, updatedAt: string) => Promise<void>;
  resumeSessionAndInvalidatePublished: (sessionId: string, updatedAt: string) => Promise<boolean>;
  publishReady: (input: PublishConsultationPreparationInput) => Promise<boolean>;
}

interface ConsultationPreparationRow {
  id: string;
  session_id: string;
  counselor_id: string;
  source_ended_at: string;
  model_name: string;
  status: ConsultationPreparation["status"];
  phase: ConsultationPreparation["phase"];
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

export function createConsultationPreparationRepository(db: LingDatabase): ConsultationPreparationRepository {
  const upsertForEndedCycle = db.transaction((preparation: ConsultationPreparation) => {
    const session = db
      .prepare<[string], { status: string; ended_at: string | null }>("SELECT status, ended_at FROM sessions WHERE id = ?")
      .get(preparation.sessionId);
    if (
      !session ||
      session.status !== "ended" ||
      session.ended_at !== preparation.sourceEndedAt
    ) {
      return false;
    }
    upsertConsultationPreparation(db, preparation);
    return true;
  });
  const publish = db.transaction((input: PublishConsultationPreparationInput) => {
    const preparation = db
      .prepare<[string], ConsultationPreparationRow>("SELECT * FROM consultation_preparations WHERE id = ?")
      .get(input.preparationId);
    if (!preparation) return false;
    const session = db
      .prepare<[string], { status: string; ended_at: string | null }>("SELECT status, ended_at FROM sessions WHERE id = ?")
      .get(preparation.session_id);
    if (
      preparation.status === "stale" ||
      !session ||
      session.status !== "ended" ||
      session.ended_at !== preparation.source_ended_at
    ) {
      db.prepare(
        "UPDATE consultation_preparations SET status = 'stale', updated_at = @updatedAt, error_message = NULL WHERE id = @id"
      ).run({ id: preparation.id, updatedAt: input.publishedAt });
      return false;
    }

    upsertSessionConceptualization(db, input.sessionConceptualization);
    if (input.longTermConceptualization) {
      upsertLongTermConceptualization(db, input.longTermConceptualization);
    }
    upsertSessionSupervision(db, input.supervision);
    upsertConsultationMemo(db, input.memo);
    db.prepare(
      `UPDATE consultation_preparations
       SET status = 'ready', phase = 'complete', updated_at = @updatedAt, error_message = NULL
       WHERE id = @id`
    ).run({ id: preparation.id, updatedAt: input.publishedAt });
    return true;
  });
  const invalidatePublished = db.transaction((sessionId: string, updatedAt: string) => {
    db.prepare(
      `UPDATE consultation_preparations
       SET status = 'stale', updated_at = @updatedAt, error_message = NULL
       WHERE session_id = @sessionId AND status != 'stale'`
    ).run({ sessionId, updatedAt });
    db.prepare("DELETE FROM consultation_memos WHERE source_session_id = ?").run(sessionId);
    db.prepare("DELETE FROM session_supervisions WHERE session_id = ?").run(sessionId);
    db.prepare("DELETE FROM session_conceptualizations WHERE session_id = ?").run(sessionId);

    // The letter is deliberately kept. Unlike the working artifacts above it is
    // a user-facing document the client may already have read, and resuming a
    // session must not silently destroy it. `session_letters.session_id` is
    // UNIQUE and written with ON CONFLICT(session_id) DO UPDATE, so the next
    // ending cycle simply overwrites it — and because regenerated letters carry
    // no read_at, the replacement comes back unread. Deleting here would lose
    // the letter for a client who only wanted to keep talking.

    const rows = db.prepare<[], { counselor_id: string; covered_session_ids: string }>(
      "SELECT counselor_id, covered_session_ids FROM long_term_conceptualizations"
    ).all();
    for (const row of rows) {
      const coveredSessionIds = parseCoveredSessionIds(row.covered_session_ids);
      if (coveredSessionIds.includes(sessionId)) {
        db.prepare("DELETE FROM long_term_conceptualizations WHERE counselor_id = ?").run(row.counselor_id);
      }
    }
  });
  const resumeSessionAndInvalidate = db.transaction((sessionId: string, updatedAt: string) => {
    const session = db
      .prepare<[string], { status: string; counselor_id: string }>("SELECT status, counselor_id FROM sessions WHERE id = ?")
      .get(sessionId);
    if (!session || session.status !== "ended") return false;
    const latestEnded = db.prepare<[string], { id: string }>(
      `SELECT id FROM sessions
       WHERE counselor_id = ? AND status = 'ended' AND ended_at IS NOT NULL
       ORDER BY ended_at DESC, created_at DESC, id DESC LIMIT 1`
    ).get(session.counselor_id);
    if (latestEnded?.id !== sessionId) return false;
    const otherUnfinished = db.prepare<[string, string], { id: string }>(
      `SELECT id FROM sessions
       WHERE counselor_id = ? AND id != ? AND status IN ('active', 'draft') LIMIT 1`
    ).get(session.counselor_id, sessionId);
    if (otherUnfinished) return false;
    db.prepare(
      "UPDATE sessions SET status = 'active', ended_at = NULL, updated_at = @updatedAt WHERE id = @sessionId"
    ).run({ sessionId, updatedAt });
    invalidatePublished(sessionId, updatedAt);
    return true;
  });

  return {
    async getBySessionId(sessionId) {
      const row = db
        .prepare<[string], ConsultationPreparationRow>("SELECT * FROM consultation_preparations WHERE session_id = ?")
        .get(sessionId);
      return row ? mapConsultationPreparationRow(row) : null;
    },
    async getLatestByCounselorId(counselorId) {
      const row = db
        .prepare<[string], ConsultationPreparationRow>(
          `SELECT * FROM consultation_preparations
           WHERE counselor_id = ? ORDER BY source_ended_at DESC, updated_at DESC LIMIT 1`
        )
        .get(counselorId);
      return row ? mapConsultationPreparationRow(row) : null;
    },
    async upsert(preparation) {
      upsertConsultationPreparation(db, preparation);
    },
    async upsertForEndedCycle(preparation) {
      return upsertForEndedCycle(preparation);
    },
    async markProcessing(id, phase, updatedAt) {
      db.prepare(
        `UPDATE consultation_preparations
         SET status = 'processing', phase = @phase, updated_at = @updatedAt, error_message = NULL
         WHERE id = @id AND status != 'stale'`
      ).run({ id, phase, updatedAt });
    },
    async markFailed(id, errorMessage, updatedAt) {
      db.prepare(
        `UPDATE consultation_preparations
         SET status = 'failed', updated_at = @updatedAt, error_message = @errorMessage
         WHERE id = @id AND status != 'stale'`
      ).run({ id, errorMessage, updatedAt });
    },
    async markStale(id, updatedAt) {
      db.prepare(
        `UPDATE consultation_preparations
         SET status = 'stale', updated_at = @updatedAt, error_message = NULL
         WHERE id = @id AND status != 'stale'`
      ).run({ id, updatedAt });
    },
    async invalidatePublishedBySessionId(sessionId, updatedAt) {
      invalidatePublished(sessionId, updatedAt);
    },
    async resumeSessionAndInvalidatePublished(sessionId, updatedAt) {
      return resumeSessionAndInvalidate.immediate(sessionId, updatedAt);
    },
    async publishReady(input) {
      return publish(input);
    }
  };
}

function upsertConsultationPreparation(db: LingDatabase, preparation: ConsultationPreparation) {
  db.prepare(
    `INSERT INTO consultation_preparations (
      id, session_id, counselor_id, source_ended_at, model_name, status, phase,
      created_at, updated_at, error_message
    ) VALUES (
      @id, @sessionId, @counselorId, @sourceEndedAt, @modelName, @status, @phase,
      @createdAt, @updatedAt, @errorMessage
    )
    ON CONFLICT(session_id) DO UPDATE SET
      id = excluded.id,
      counselor_id = excluded.counselor_id,
      source_ended_at = excluded.source_ended_at,
      model_name = excluded.model_name,
      status = excluded.status,
      phase = excluded.phase,
      updated_at = excluded.updated_at,
      error_message = excluded.error_message`
  ).run({ ...preparation, errorMessage: preparation.errorMessage ?? null });
}

function parseCoveredSessionIds(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function mapConsultationPreparationRow(row: ConsultationPreparationRow): ConsultationPreparation {
  return {
    id: row.id,
    sessionId: row.session_id,
    counselorId: row.counselor_id,
    sourceEndedAt: row.source_ended_at,
    modelName: row.model_name,
    status: row.status,
    phase: row.phase,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.error_message ? { errorMessage: row.error_message } : {})
  };
}

function upsertSessionConceptualization(
  db: LingDatabase,
  conceptualization: PublishConsultationPreparationInput["sessionConceptualization"]
) {
  db.prepare(
    `INSERT INTO session_conceptualizations (
      id, session_id, counselor_id, model_name, full_md, status, created_at, updated_at, error_message
    ) VALUES (
      @id, @sessionId, @counselorId, @modelName, @fullMd, @status, @createdAt, @updatedAt, @errorMessage
    )
    ON CONFLICT(session_id) DO UPDATE SET
      id = excluded.id,
      counselor_id = excluded.counselor_id,
      model_name = excluded.model_name,
      full_md = excluded.full_md,
      status = excluded.status,
      updated_at = excluded.updated_at,
      error_message = excluded.error_message`
  ).run({ ...conceptualization, errorMessage: conceptualization.errorMessage ?? null });
}

function upsertLongTermConceptualization(
  db: LingDatabase,
  conceptualization: NonNullable<PublishConsultationPreparationInput["longTermConceptualization"]>
) {
  db.prepare(
    `INSERT INTO long_term_conceptualizations (
      id, counselor_id, model_name, full_md, covered_session_ids,
      covered_until_session_id, covered_until_ended_at, status, created_at, updated_at, error_message
    ) VALUES (
      @id, @counselorId, @modelName, @fullMd, @coveredSessionIds,
      @coveredUntilSessionId, @coveredUntilEndedAt, @status, @createdAt, @updatedAt, @errorMessage
    )
    ON CONFLICT(counselor_id) DO UPDATE SET
      id = excluded.id,
      model_name = excluded.model_name,
      full_md = excluded.full_md,
      covered_session_ids = excluded.covered_session_ids,
      covered_until_session_id = excluded.covered_until_session_id,
      covered_until_ended_at = excluded.covered_until_ended_at,
      status = excluded.status,
      updated_at = excluded.updated_at,
      error_message = excluded.error_message`
  ).run({
    ...conceptualization,
    coveredSessionIds: JSON.stringify(conceptualization.coveredSessionIds),
    coveredUntilSessionId: conceptualization.coveredUntilSessionId ?? null,
    coveredUntilEndedAt: conceptualization.coveredUntilEndedAt ?? null,
    errorMessage: conceptualization.errorMessage ?? null
  });
}
