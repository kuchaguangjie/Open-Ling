import type { SessionConceptualization } from "../../../shared/src/index.js";
import type { LingDatabase } from "../db.js";

export interface SessionConceptualizationRepository {
  getBySessionId: (sessionId: string) => Promise<SessionConceptualization | null>;
  listReadyByCounselorId: (counselorId: string) => Promise<SessionConceptualization[]>;
  upsert: (conceptualization: SessionConceptualization) => Promise<void>;
  markFailed: (failure: {
    id: string;
    sessionId: string;
    counselorId: string;
    modelName: string;
    failedAt: string;
    errorMessage: string;
  }) => Promise<void>;
}

interface SessionConceptualizationRow {
  id: string;
  session_id: string;
  counselor_id: string;
  model_name: string;
  full_md: string;
  status: SessionConceptualization["status"];
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

export function createSessionConceptualizationRepository(db: LingDatabase): SessionConceptualizationRepository {
  return {
    async getBySessionId(sessionId) {
      const row = db
        .prepare<[string], SessionConceptualizationRow>("SELECT * FROM session_conceptualizations WHERE session_id = ?")
        .get(sessionId);
      return row ? mapSessionConceptualizationRow(row) : null;
    },
    async listReadyByCounselorId(counselorId) {
      const rows = db
        .prepare<[string], SessionConceptualizationRow>(
          `SELECT sc.*
           FROM session_conceptualizations sc
           LEFT JOIN sessions s ON s.id = sc.session_id
           WHERE sc.counselor_id = ? AND sc.status = 'ready'
           ORDER BY COALESCE(s.ended_at, s.updated_at, sc.updated_at) ASC, sc.updated_at ASC`
        )
        .all(counselorId);
      return rows.map(mapSessionConceptualizationRow);
    },
    async upsert(conceptualization) {
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
      ).run({
        ...conceptualization,
        errorMessage: conceptualization.errorMessage ?? null
      });
    },
    async markFailed({ id, sessionId, counselorId, modelName, failedAt, errorMessage }) {
      await this.upsert({
        id,
        sessionId,
        counselorId,
        modelName,
        fullMd: "",
        status: "failed",
        createdAt: failedAt,
        updatedAt: failedAt,
        errorMessage
      });
    }
  };
}

function mapSessionConceptualizationRow(row: SessionConceptualizationRow): SessionConceptualization {
  const conceptualization: SessionConceptualization = {
    id: row.id,
    sessionId: row.session_id,
    counselorId: row.counselor_id,
    modelName: row.model_name,
    fullMd: row.full_md,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (row.error_message) {
    conceptualization.errorMessage = row.error_message;
  }
  return conceptualization;
}
