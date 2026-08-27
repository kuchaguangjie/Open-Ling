import type { MemoryItem } from "../../../shared/src/index.js";
import type { LingDatabase } from "../db.js";

export interface MemoryRepository {
  list: () => Promise<MemoryItem[]>;
  create: (memory: MemoryItem) => Promise<void>;
  update: (id: string, changes: Partial<Omit<MemoryItem, "id" | "createdAt">>) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

interface MemoryRow {
  id: string;
  type: MemoryItem["type"];
  title: string;
  content: string;
  source_session_id: string | null;
  status: MemoryItem["status"];
  created_at: string;
  updated_at: string;
}

const memoryUpdateColumns = {
  type: "type",
  title: "title",
  content: "content",
  sourceSessionId: "source_session_id",
  status: "status",
  updatedAt: "updated_at"
} as const satisfies Record<keyof Omit<MemoryItem, "id" | "createdAt">, string>;

export function createMemoryRepository(db: LingDatabase): MemoryRepository {
  return {
    async list() {
      const rows = db.prepare<[], MemoryRow>("SELECT * FROM memories ORDER BY updated_at DESC, created_at DESC").all();
      return rows.map(mapMemoryRow);
    },
    async create(memory) {
      db.prepare(
        `INSERT INTO memories (id, type, title, content, source_session_id, status, created_at, updated_at)
         VALUES (@id, @type, @title, @content, @sourceSessionId, @status, @createdAt, @updatedAt)`
      ).run({
        ...memory,
        sourceSessionId: memory.sourceSessionId ?? null
      });
    },
    async update(id, changes) {
      const entries = Object.entries(changes).filter(([, value]) => value !== undefined);
      if (entries.length === 0) return;

      const assignments = entries.map(([key]) => `${memoryUpdateColumns[key as keyof typeof memoryUpdateColumns]} = @${key}`);
      db.prepare(`UPDATE memories SET ${assignments.join(", ")} WHERE id = @id`).run({
        id,
        ...changes,
        sourceSessionId: changes.sourceSessionId ?? null
      });
    },
    async delete(id) {
      db.prepare("DELETE FROM memories WHERE id = ?").run(id);
    }
  };
}

function mapMemoryRow(row: MemoryRow): MemoryItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    sourceSessionId: row.source_session_id ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
