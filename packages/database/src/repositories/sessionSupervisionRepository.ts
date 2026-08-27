import type { SessionSupervision } from "../../../shared/src/index.js";
import type { LingDatabase } from "../db.js";

export interface SessionSupervisionRepository {
  getBySessionId: (sessionId: string) => Promise<SessionSupervision | null>;
  upsert: (supervision: SessionSupervision) => Promise<void>;
}

interface SessionSupervisionRow {
  id: string;
  preparation_id: string;
  session_id: string;
  counselor_id: string;
  supervisor_id: SessionSupervision["supervisorId"];
  model_name: string;
  supervision_md: string;
  status: SessionSupervision["status"];
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

export function createSessionSupervisionRepository(db: LingDatabase): SessionSupervisionRepository {
  return {
    async getBySessionId(sessionId) {
      const row = db
        .prepare<[string], SessionSupervisionRow>(
          "SELECT * FROM session_supervisions WHERE session_id = ? ORDER BY updated_at DESC LIMIT 1"
        )
        .get(sessionId);
      return row ? mapSessionSupervisionRow(row) : null;
    },
    async upsert(supervision) {
      upsertSessionSupervision(db, supervision);
    }
  };
}

export function upsertSessionSupervision(db: LingDatabase, supervision: SessionSupervision) {
  db.prepare(
    `INSERT INTO session_supervisions (
      id, preparation_id, session_id, counselor_id, supervisor_id, model_name,
      supervision_md, status, created_at, updated_at, error_message
    ) VALUES (
      @id, @preparationId, @sessionId, @counselorId, @supervisorId, @modelName,
      @supervisionMd, @status, @createdAt, @updatedAt, @errorMessage
    )
    ON CONFLICT(preparation_id) DO UPDATE SET
      id = excluded.id,
      session_id = excluded.session_id,
      counselor_id = excluded.counselor_id,
      supervisor_id = excluded.supervisor_id,
      model_name = excluded.model_name,
      supervision_md = excluded.supervision_md,
      status = excluded.status,
      updated_at = excluded.updated_at,
      error_message = excluded.error_message`
  ).run({ ...supervision, errorMessage: supervision.errorMessage ?? null });
}

function mapSessionSupervisionRow(row: SessionSupervisionRow): SessionSupervision {
  return {
    id: row.id,
    preparationId: row.preparation_id,
    sessionId: row.session_id,
    counselorId: row.counselor_id,
    supervisorId: row.supervisor_id,
    modelName: row.model_name,
    supervisionMd: row.supervision_md,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.error_message ? { errorMessage: row.error_message } : {})
  };
}
