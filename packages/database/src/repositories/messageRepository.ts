import type { SessionMessage } from "../../../shared/src/index.js";
import type { LingDatabase } from "../db.js";

export interface MessageRepository {
  listBySessionId: (sessionId: string) => Promise<SessionMessage[]>;
  append: (message: SessionMessage) => Promise<void>;
  appendForActiveSession: (message: SessionMessage) => Promise<boolean>;
  appendManyForActiveSession: (messages: SessionMessage[]) => Promise<boolean>;
}

interface MessageRow {
  id: string;
  session_id: string;
  role: SessionMessage["role"];
  content: string;
  created_at: string;
  status: NonNullable<SessionMessage["status"]>;
  metadata: string | null;
}

export function createMessageRepository(db: LingDatabase): MessageRepository {
  const appendManyForActiveSession = db.transaction((messages: SessionMessage[]) => {
    if (messages.length === 0) return true;
    const sessionId = messages[0].sessionId;
    if (messages.some((message) => message.sessionId !== sessionId)) return false;
    const session = db.prepare<[string], { status: string }>("SELECT status FROM sessions WHERE id = ?").get(sessionId);
    if (session?.status !== "active") return false;
    messages.forEach((message) => upsertMessage(db, message));
    return true;
  });
  return {
    async listBySessionId(sessionId) {
      const rows = db
        .prepare<[string], MessageRow>("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC, id ASC")
        .all(sessionId);
      return rows.map(mapMessageRow);
    },
    async append(message) {
      upsertMessage(db, message);
    },
    async appendForActiveSession(message) {
      return appendManyForActiveSession([message]);
    },
    async appendManyForActiveSession(messages) {
      return appendManyForActiveSession(messages);
    }
  };
}

function upsertMessage(db: LingDatabase, message: SessionMessage) {
  db.prepare(
    `INSERT INTO messages (id, session_id, role, content, created_at, status, metadata)
     VALUES (@id, @sessionId, @role, @content, @createdAt, @status, @metadata)
     ON CONFLICT(id) DO UPDATE SET
       session_id = excluded.session_id,
       role = excluded.role,
       content = excluded.content,
       created_at = excluded.created_at,
       status = excluded.status,
       metadata = excluded.metadata`
  ).run({
    ...message,
    status: message.status ?? "sent",
    metadata: message.metadata ? JSON.stringify(message.metadata) : null
  });
}

function mapMessageRow(row: MessageRow): SessionMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    status: row.status,
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined
  };
}
