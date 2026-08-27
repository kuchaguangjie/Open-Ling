import { schemaStatements } from "./schema.js";
import {
  type Migration,
  migrations,
  getAppliedMigrationNames,
  recordMigration
} from "./migrations/migrations.js";
import Database from "better-sqlite3";
import { chmodSync } from "node:fs";

export interface DatabaseAdapter {
  exec: (statement: string) => void;
}

export interface CreateLingDatabaseOptions {
  path: string;
  readonly?: boolean;
}

export type LingDatabase = Database.Database;

const additiveColumns = {
  sessions: [
    "team_id TEXT",
    "created_at TEXT",
    "updated_at TEXT",
    "prompt_snapshot TEXT"
  ],
  messages: ["status TEXT NOT NULL DEFAULT 'sent'"]
} as const;

type AdditiveTable = keyof typeof additiveColumns;

interface TableColumnRow {
  name: string;
}

export function createLingDatabase(options: CreateLingDatabaseOptions): LingDatabase {
  const db = new Database(options.path, options.readonly === undefined ? undefined : { readonly: options.readonly });
  if (!options.readonly) {
    try {
      chmodSync(options.path, 0o600);
    } catch {
      // The database may live on a filesystem that does not expose POSIX modes.
      // Ling keeps running; the explicit userData directory mode remains the
      // primary local-privacy boundary.
    }
  }
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrateLingDatabase(db);
  return db;
}

export function initializeSchema(db: DatabaseAdapter) {
  for (const statement of schemaStatements) {
    db.exec(statement);
  }
}

/**
 * Apply all pending versioned migrations.
 * First creates the schema_migrations tracking table (if it doesn't exist),
 * then runs each named migration that hasn't been applied yet.
 * Each migration's statements and record insertion run inside a single
 * transaction — if any statement fails, nothing is committed for that
 * migration and no schema_migrations row is written.
 * Already-applied migrations are skipped to guarantee idempotency.
 */
export function migrateLingDatabase(db: LingDatabase) {
  // Always ensure the tracking table exists before querying it
  ensureSchemaMigrationsTable(db);

  const applied = new Set(getAppliedMigrationNames(db));

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue;

    const applyOne = db.transaction(() => {
      for (const statement of migration.statements) {
        db.exec(statement);
      }
      recordMigration(db, migration.name);
    });

    applyOne();
  }

  // Run additive-column legacy logic for backwards compatibility
  for (const tableName of Object.keys(additiveColumns) as AdditiveTable[]) {
    for (const columnDefinition of additiveColumns[tableName]) {
      const columnName = columnDefinition.split(" ")[0];
      if (!hasColumn(db, tableName, columnName)) {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
      }
    }
  }
}

function ensureSchemaMigrationsTable(db: LingDatabase) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`
  );
}

export function getAppliedMigrations(db: LingDatabase): Array<{ name: string; applied_at: string }> {
  return db
    .prepare<[], { name: string; applied_at: string }>(
      "SELECT name, applied_at FROM schema_migrations ORDER BY applied_at ASC, id ASC"
    )
    .all();
}

function hasColumn(db: LingDatabase, tableName: string, columnName: string) {
  const columns = db.prepare<[], TableColumnRow>(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}
