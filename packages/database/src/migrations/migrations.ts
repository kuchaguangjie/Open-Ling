import type { LingDatabase } from "../db.js";

export interface Migration {
  name: string;
  statements: string[];
}

/**
 * All forward migrations in execution order.
 * Each migration runs only once; its name is recorded in schema_migrations.
 * The schema_migrations table is not a migration entry — it's always created
 * as part of the first migration run.
 */
export const migrations: Migration[] = [
  {
    name: "001_initial_schema",
    statements: [
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        counselor_id TEXT NOT NULL,
        room_theme_id TEXT NOT NULL,
        team_id TEXT,
        model_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        status TEXT NOT NULL,
        summary TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'sent',
        metadata TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    ]
  },
  {
    name: "002_local_secret_store",
    statements: [
      `CREATE TABLE IF NOT EXISTS secrets (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    ]
  },
  {
    name: "003_memory_source_and_status",
    statements: [
      "ALTER TABLE memories ADD COLUMN source_session_id TEXT",
      "ALTER TABLE memories ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed'"
    ]
  },
  {
    name: "004_rolling_summaries",
    statements: [
      `CREATE TABLE IF NOT EXISTS rolling_summaries (
        session_id TEXT PRIMARY KEY,
        counselor_id TEXT NOT NULL,
        summary TEXT NOT NULL,
        covered_message_count INTEGER NOT NULL DEFAULT 0,
        covered_until_message_id TEXT,
        last_attempted_message_count INTEGER,
        last_error_at TEXT,
        source_hash TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        error_message TEXT
      )`
    ]
  },
  {
    name: "005_session_prompt_snapshot",
    statements: [
      "ALTER TABLE sessions ADD COLUMN prompt_snapshot TEXT"
    ]
  },
  {
    name: "006_imported_documents",
    statements: [
      `CREATE TABLE IF NOT EXISTS imported_documents (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        kind TEXT NOT NULL,
        content TEXT NOT NULL,
        content_length INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        summary TEXT
      )`
    ]
  },
  {
    name: "007_rename_chengling_counselor_id",
    statements: [
      `UPDATE sessions SET counselor_id = 'chengling' WHERE counselor_id = 'lingjie'`,
      `UPDATE rolling_summaries SET counselor_id = 'chengling' WHERE counselor_id = 'lingjie'`,
      `UPDATE sessions
         SET prompt_snapshot = REPLACE(prompt_snapshot, '"counselorId":"lingjie"', '"counselorId":"chengling"')
         WHERE prompt_snapshot LIKE '%"counselorId":"lingjie"%'`,
      `UPDATE sessions
         SET prompt_snapshot = REPLACE(prompt_snapshot, '"counselorId": "lingjie"', '"counselorId": "chengling"')
         WHERE prompt_snapshot LIKE '%"counselorId": "lingjie"%'`,
      `UPDATE settings
         SET value = REPLACE(value, '"defaultCounselorId":"lingjie"', '"defaultCounselorId":"chengling"')
         WHERE key = 'userSettings' AND value LIKE '%"defaultCounselorId":"lingjie"%'`,
      `UPDATE settings
         SET value = REPLACE(value, '"defaultCounselorId": "lingjie"', '"defaultCounselorId": "chengling"')
         WHERE key = 'userSettings' AND value LIKE '%"defaultCounselorId": "lingjie"%'`
    ]
  },
  {
    name: "008_session_conceptualizations",
    statements: [
      `CREATE TABLE IF NOT EXISTS session_conceptualizations (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        counselor_id TEXT NOT NULL,
        full_md TEXT NOT NULL,
        context_brief TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        error_message TEXT
      )`
    ]
  },
  {
    name: "009_session_conceptualization_model_name",
    statements: [
      "ALTER TABLE session_conceptualizations ADD COLUMN model_name TEXT NOT NULL DEFAULT 'deepseek-v4-pro'"
    ]
  },
  {
    name: "010_long_term_conceptualizations",
    statements: [
      `CREATE TABLE IF NOT EXISTS long_term_conceptualizations (
        id TEXT PRIMARY KEY,
        counselor_id TEXT NOT NULL UNIQUE,
        model_name TEXT NOT NULL,
        full_md TEXT NOT NULL,
        context_brief TEXT NOT NULL,
        covered_session_ids TEXT NOT NULL,
        covered_until_session_id TEXT,
        covered_until_ended_at TEXT,
        status TEXT NOT NULL DEFAULT 'ready',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        error_message TEXT
      )`
    ]
  },
  {
    name: "011_session_letters",
    statements: [
      `CREATE TABLE IF NOT EXISTS session_letters (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        counselor_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        letter_md TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        error_message TEXT
      )`
    ]
  },
  {
    name: "012_session_memory_snapshot",
    statements: [
      "ALTER TABLE sessions ADD COLUMN memory_snapshot TEXT"
    ]
  },
  {
    name: "013_supervised_consultation_memos",
    statements: [
      "ALTER TABLE session_conceptualizations DROP COLUMN context_brief",
      "ALTER TABLE long_term_conceptualizations DROP COLUMN context_brief",
      "UPDATE sessions SET memory_snapshot = NULL",
      `CREATE TABLE consultation_preparations (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        counselor_id TEXT NOT NULL,
        source_ended_at TEXT NOT NULL,
        model_name TEXT NOT NULL,
        status TEXT NOT NULL,
        phase TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        error_message TEXT
      )`,
      `CREATE TABLE session_supervisions (
        id TEXT PRIMARY KEY,
        preparation_id TEXT NOT NULL UNIQUE,
        session_id TEXT NOT NULL,
        counselor_id TEXT NOT NULL,
        supervisor_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        supervision_md TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        error_message TEXT
      )`,
      `CREATE TABLE consultation_memos (
        id TEXT PRIMARY KEY,
        preparation_id TEXT NOT NULL UNIQUE,
        source_session_id TEXT NOT NULL,
        counselor_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        memo_md TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        error_message TEXT
      )`
    ]
  },
  {
    name: "014_model_usage",
    statements: [
      `CREATE TABLE IF NOT EXISTS model_usage (
        id TEXT PRIMARY KEY,
        provider_name TEXT NOT NULL,
        model_name TEXT NOT NULL,
        connection_kind TEXT NOT NULL,
        scope TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )`
    ]
  }
];

export function getAppliedMigrationNames(db: LingDatabase): string[] {
  const rows = db
    .prepare<[], { name: string }>("SELECT name FROM schema_migrations ORDER BY applied_at ASC, id ASC")
    .all();
  return rows.map((r) => r.name);
}

export function recordMigration(db: LingDatabase, name: string): void {
  db.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (@name, @appliedAt)").run({
    name,
    appliedAt: new Date().toISOString()
  });
}
