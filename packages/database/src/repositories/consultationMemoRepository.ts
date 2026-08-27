import type { ConsultationMemo } from "../../../shared/src/index.js";
import type { LingDatabase } from "../db.js";

export interface ConsultationMemoRepository {
  getBySourceSessionId: (sessionId: string) => Promise<ConsultationMemo | null>;
  getLatestReadyByCounselorId: (counselorId: string) => Promise<ConsultationMemo | null>;
  upsert: (memo: ConsultationMemo) => Promise<void>;
}

interface ConsultationMemoRow {
  id: string;
  preparation_id: string;
  source_session_id: string;
  counselor_id: string;
  model_name: string;
  memo_md: string;
  status: ConsultationMemo["status"];
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

export function createConsultationMemoRepository(db: LingDatabase): ConsultationMemoRepository {
  return {
    async getBySourceSessionId(sessionId) {
      const row = db
        .prepare<[string], ConsultationMemoRow>(
          "SELECT * FROM consultation_memos WHERE source_session_id = ? ORDER BY updated_at DESC LIMIT 1"
        )
        .get(sessionId);
      return row ? mapConsultationMemoRow(row) : null;
    },
    async getLatestReadyByCounselorId(counselorId) {
      const row = db
        .prepare<[string], ConsultationMemoRow>(
          `SELECT cm.* FROM consultation_memos cm
           JOIN sessions s ON s.id = cm.source_session_id
           WHERE cm.counselor_id = ? AND cm.status = 'ready' AND s.status = 'ended'
           ORDER BY s.ended_at DESC, cm.updated_at DESC LIMIT 1`
        )
        .get(counselorId);
      return row ? mapConsultationMemoRow(row) : null;
    },
    async upsert(memo) {
      upsertConsultationMemo(db, memo);
    }
  };
}

export function upsertConsultationMemo(db: LingDatabase, memo: ConsultationMemo) {
  db.prepare(
    `INSERT INTO consultation_memos (
      id, preparation_id, source_session_id, counselor_id, model_name, memo_md,
      status, created_at, updated_at, error_message
    ) VALUES (
      @id, @preparationId, @sourceSessionId, @counselorId, @modelName, @memoMd,
      @status, @createdAt, @updatedAt, @errorMessage
    )
    ON CONFLICT(preparation_id) DO UPDATE SET
      id = excluded.id,
      source_session_id = excluded.source_session_id,
      counselor_id = excluded.counselor_id,
      model_name = excluded.model_name,
      memo_md = excluded.memo_md,
      status = excluded.status,
      updated_at = excluded.updated_at,
      error_message = excluded.error_message`
  ).run({ ...memo, errorMessage: memo.errorMessage ?? null });
}

function mapConsultationMemoRow(row: ConsultationMemoRow): ConsultationMemo {
  return {
    id: row.id,
    preparationId: row.preparation_id,
    sourceSessionId: row.source_session_id,
    counselorId: row.counselor_id,
    modelName: row.model_name,
    memoMd: row.memo_md,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.error_message ? { errorMessage: row.error_message } : {})
  };
}
