import type { ImportedDocument } from "../../../shared/src/index.js";
import type { LingDatabase } from "../db.js";

export interface ImportedDocumentRepository {
  create: (document: ImportedDocument) => Promise<void>;
  createForActiveSession: (document: ImportedDocument) => Promise<boolean>;
  updateSummary: (id: string, summary: string) => Promise<void>;
  getById: (id: string) => Promise<ImportedDocument | null>;
  listBySessionId: (sessionId: string) => Promise<ImportedDocument[]>;
}

interface ImportedDocumentRow {
  id: string;
  session_id: string;
  title: string;
  kind: ImportedDocument["kind"];
  content: string;
  content_length: number;
  created_at: string;
  status: ImportedDocument["status"];
  summary: string | null;
}

export function createImportedDocumentRepository(db: LingDatabase): ImportedDocumentRepository {
  const createForActiveSession = db.transaction((document: ImportedDocument) => {
    const session = db
      .prepare<[string], { status: string }>("SELECT status FROM sessions WHERE id = ?")
      .get(document.sessionId);
    if (session?.status !== "active") return false;
    upsertImportedDocument(db, document);
    return true;
  });
  return {
    async create(document) {
      upsertImportedDocument(db, document);
    },
    async createForActiveSession(document) {
      return createForActiveSession(document);
    },
    async updateSummary(id, summary) {
      db.prepare("UPDATE imported_documents SET summary = ? WHERE id = ?").run(summary, id);
    },
    async getById(id) {
      const row = db.prepare<[string], ImportedDocumentRow>("SELECT * FROM imported_documents WHERE id = ?").get(id);
      return row ? mapImportedDocumentRow(row) : null;
    },
    async listBySessionId(sessionId) {
      return db
        .prepare<[string], ImportedDocumentRow>("SELECT * FROM imported_documents WHERE session_id = ? ORDER BY created_at ASC, id ASC")
        .all(sessionId)
        .map(mapImportedDocumentRow);
    }
  };
}

function upsertImportedDocument(db: LingDatabase, document: ImportedDocument) {
  db.prepare(
    `INSERT INTO imported_documents (
      id, session_id, title, kind, content, content_length, created_at, status, summary
    ) VALUES (
      @id, @sessionId, @title, @kind, @content, @contentLength, @createdAt, @status, @summary
    )
    ON CONFLICT(id) DO UPDATE SET
      session_id = excluded.session_id,
      title = excluded.title,
      kind = excluded.kind,
      content = excluded.content,
      content_length = excluded.content_length,
      created_at = excluded.created_at,
      status = excluded.status,
      summary = excluded.summary`
  ).run({
    ...document,
    summary: document.summary ?? null
  });
}

function mapImportedDocumentRow(row: ImportedDocumentRow): ImportedDocument {
  return {
    id: row.id,
    sessionId: row.session_id,
    title: row.title,
    kind: row.kind,
    content: row.content,
    contentLength: row.content_length,
    createdAt: row.created_at,
    status: row.status,
    summary: row.summary ?? undefined
  };
}
