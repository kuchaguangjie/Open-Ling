import type { LongTermConceptualization } from "../../../shared/src/index.js";
import type { LingDatabase } from "../db.js";

export interface LongTermConceptualizationRepository {
  getByCounselorId: (counselorId: string) => Promise<LongTermConceptualization | null>;
  upsert: (conceptualization: LongTermConceptualization) => Promise<void>;
  markFailed: (failure: {
    id: string;
    counselorId: string;
    modelName: string;
    failedAt: string;
    errorMessage: string;
  }) => Promise<void>;
}

interface LongTermConceptualizationRow {
  id: string;
  counselor_id: string;
  model_name: string;
  full_md: string;
  covered_session_ids: string;
  covered_until_session_id: string | null;
  covered_until_ended_at: string | null;
  status: LongTermConceptualization["status"];
  created_at: string;
  updated_at: string;
  error_message: string | null;
}

export function createLongTermConceptualizationRepository(db: LingDatabase): LongTermConceptualizationRepository {
  return {
    async getByCounselorId(counselorId) {
      const row = db
        .prepare<[string], LongTermConceptualizationRow>(
          "SELECT * FROM long_term_conceptualizations WHERE counselor_id = ?"
        )
        .get(counselorId);
      return row ? mapLongTermConceptualizationRow(row) : null;
    },
    async upsert(conceptualization) {
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
    },
    async markFailed({ id, counselorId, modelName, failedAt, errorMessage }) {
      const existing = await this.getByCounselorId(counselorId);
      await this.upsert({
        id,
        counselorId,
        modelName,
        fullMd: existing?.fullMd ?? "",
        coveredSessionIds: existing?.coveredSessionIds ?? [],
        coveredUntilSessionId: existing?.coveredUntilSessionId,
        coveredUntilEndedAt: existing?.coveredUntilEndedAt,
        status: "failed",
        createdAt: existing?.createdAt ?? failedAt,
        updatedAt: failedAt,
        errorMessage
      });
    }
  };
}

function mapLongTermConceptualizationRow(row: LongTermConceptualizationRow): LongTermConceptualization {
  const conceptualization: LongTermConceptualization = {
    id: row.id,
    counselorId: row.counselor_id,
    modelName: row.model_name,
    fullMd: row.full_md,
    coveredSessionIds: parseSessionIds(row.covered_session_ids),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (row.covered_until_session_id) {
    conceptualization.coveredUntilSessionId = row.covered_until_session_id;
  }
  if (row.covered_until_ended_at) {
    conceptualization.coveredUntilEndedAt = row.covered_until_ended_at;
  }
  if (row.error_message) {
    conceptualization.errorMessage = row.error_message;
  }
  return conceptualization;
}

function parseSessionIds(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
