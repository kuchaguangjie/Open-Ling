import { chmod, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import Database from "better-sqlite3";
import EncryptedDatabase from "better-sqlite3-multiple-ciphers";
import type { LingDatabase } from "../../../../../packages/database/src/index.js";
import {
  type RecoveryKeyRecord,
  unwrapRecoveryKey
} from "../security/dataVault.js";

const SQLITE_HEADER = "SQLite format 3\u0000";
const LING_BACKUP_VERSION = 1;
const BACKUP_FOOTER_MARKER = "\n--LING_BACKUP_RECOVERY_V1--\n";

export class RecoveryRequiredError extends Error {
  constructor() {
    super("这份备份来自另一台设备，请使用原来的恢复码。");
    this.name = "RecoveryRequiredError";
  }
}

export function createLocalBackupFileName(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `Ling-本地备份-${year}-${month}-${day}.ling-backup`;
}

export async function createLocalBackup(
  db: LingDatabase,
  filePath: string,
  dataKey?: Buffer,
  recoveryRecord?: RecoveryKeyRecord
) {
  if (dataKey) {
    await rm(filePath, { force: true });
    db.exec(`VACUUM INTO '${filePath.replace(/'/g, "''")}'`);
  } else {
    await db.backup(filePath);
  }
  const backup = openBackupDatabase(filePath, dataKey);
  try {
    // API Key 即使当前落在 SQLite fallback 中，也不能随资料备份带走。
    backup.pragma("secure_delete = ON");
    backup.prepare("DELETE FROM secrets").run();
    backup.exec(
      `CREATE TABLE IF NOT EXISTS ling_backup_meta (
        backup_version INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )`
    );
    backup.prepare(
      "INSERT OR REPLACE INTO ling_backup_meta (backup_version, created_at) VALUES (?, ?)"
    ).run(LING_BACKUP_VERSION, new Date().toISOString());
    // 删除记录后的空闲页也可能残留旧内容，重写数据库文件以避免将 Key 带入备份。
    backup.exec("VACUUM");
  } finally {
    backup.close();
  }
  if (dataKey && recoveryRecord) {
    const databaseBytes = await readFile(filePath);
    const footer = `${BACKUP_FOOTER_MARKER}${JSON.stringify(recoveryRecord)}`;
    await writeFile(filePath, Buffer.concat([databaseBytes, Buffer.from(footer, "utf8")]));
  }
  await chmod(filePath, 0o600);
  return basename(filePath);
}

export async function restoreLocalBackup({
  sourcePath,
  databasePath,
  dataKey,
  recoveryPhrase,
  closeDatabase
}: {
  sourcePath: string;
  databasePath: string;
  dataKey?: Buffer;
  recoveryPhrase?: string;
  closeDatabase: () => void;
}) {
  const fileBuffer = await readFile(sourcePath);
  const { databaseBytes, recoveryRecord } = splitBackupFile(fileBuffer);
  const temporaryPath = `${databasePath}.restore-${Date.now()}.tmp`;
  const previousPath = `${databasePath}.restore-previous-${Date.now()}.tmp`;
  await writeFile(temporaryPath, databaseBytes, { mode: 0o600 });
  try {
    if (!dataKey) {
      assertPlaintextHeader(databaseBytes);
      validateBackupDatabase(temporaryPath);
    } else {
      try {
        validateBackupDatabase(temporaryPath, dataKey);
      } catch {
        if (!recoveryRecord || !recoveryPhrase) throw new RecoveryRequiredError();
        let oldDataKey: Buffer;
        try {
          oldDataKey = unwrapRecoveryKey(recoveryRecord, recoveryPhrase);
          validateBackupDatabase(temporaryPath, oldDataKey);
        } catch {
          throw new RecoveryRequiredError();
        }
        const recoveryBackup = openBackupDatabase(temporaryPath, oldDataKey, { readonly: false });
        try {
          recoveryBackup.pragma(`rekey = "x'${dataKey.toString("hex")}'"`);
          recoveryBackup.pragma("secure_delete = ON");
          recoveryBackup.exec("VACUUM");
        } finally {
          recoveryBackup.close();
        }
        validateBackupDatabase(temporaryPath, dataKey);
      }
    }

    closeDatabase();
    await rm(`${databasePath}-wal`, { force: true });
    await rm(`${databasePath}-shm`, { force: true });
    let movedPrevious = false;
    try {
      await rename(databasePath, previousPath);
      movedPrevious = true;
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }
    try {
      await rename(temporaryPath, databasePath);
    } catch (error) {
      if (movedPrevious) await rename(previousPath, databasePath);
      throw error;
    }
    await chmod(databasePath, 0o600);
    if (movedPrevious) await rm(previousPath, { force: true });
  } finally {
    await rm(temporaryPath, { force: true });
  }
  return basename(sourcePath);
}

export async function assertValidLingBackup(filePath: string, dataKey?: Buffer) {
  const fileBuffer = await readFile(filePath).catch(() => null);
  if (!fileBuffer) throw new Error("没有读取到备份文件。请确认文件仍在原位置且可访问。");
  const { databaseBytes, recoveryRecord } = splitBackupFile(fileBuffer);
  if (!dataKey) assertPlaintextHeader(databaseBytes);
  if (!recoveryRecord) {
    validateBackupDatabase(filePath, dataKey);
    return;
  }
  const validationPath = `${filePath}.validate-${Date.now()}.tmp`;
  await writeFile(validationPath, databaseBytes, { mode: 0o600 });
  try {
    validateBackupDatabase(validationPath, dataKey);
  } finally {
    await rm(validationPath, { force: true });
  }
}

function validateBackupDatabase(filePath: string, dataKey?: Buffer) {
  const backup = openBackupDatabase(filePath, dataKey, { readonly: true });
  try {
    const metaTable = backup
      .prepare<[], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'ling_backup_meta'"
      )
      .get();
    if (metaTable) {
      const metaRow = backup
        .prepare<[], { backup_version: number }>("SELECT backup_version FROM ling_backup_meta LIMIT 1")
        .get();
      if (metaRow?.backup_version !== LING_BACKUP_VERSION) {
        throw new Error("所选备份版本与当前 Ling 不兼容。现有资料没有被替换。");
      }
    } else {
      assertLegacyLingSchema(backup);
    }
  } finally {
    backup.close();
  }
}

function assertPlaintextHeader(databaseBytes: Buffer) {
  if (databaseBytes.subarray(0, 16).toString("utf8") !== SQLITE_HEADER) {
    throw new Error("所选文件不是可读取的 Ling 备份。请选择 .ling-backup 文件。");
  }
}

type BackupDatabaseHandle = {
  pragma: (source: string) => unknown;
  prepare: <Bind extends unknown[] = [], Result = unknown>(source: string) => {
    get: (...params: any[]) => Result | undefined;
    run: (...params: any[]) => unknown;
    all: (...params: any[]) => Result[];
  };
  exec: (source: string) => unknown;
  close: () => unknown;
};

function openBackupDatabase(
  filePath: string,
  dataKey?: Buffer,
  options: { readonly?: boolean } = {}
): BackupDatabaseHandle {
  if (!dataKey) return new Database(filePath, options) as unknown as BackupDatabaseHandle;
  const database = new EncryptedDatabase(filePath, options) as unknown as BackupDatabaseHandle;
  database.pragma(`key = "x'${dataKey.toString("hex")}'"`);
  return database;
}

function splitBackupFile(buffer: Buffer): {
  databaseBytes: Buffer;
  recoveryRecord: RecoveryKeyRecord | null;
} {
  const markerIndex = buffer.lastIndexOf(Buffer.from(BACKUP_FOOTER_MARKER));
  if (markerIndex < 0) return { databaseBytes: buffer, recoveryRecord: null };
  const databaseBytes = buffer.subarray(0, markerIndex);
  const metadataText = buffer.subarray(markerIndex + Buffer.byteLength(BACKUP_FOOTER_MARKER)).toString("utf8");
  try {
    const recoveryRecord = parseRecoveryRecord(JSON.parse(metadataText));
    if (!recoveryRecord) throw new Error("invalid recovery record");
    return { databaseBytes, recoveryRecord };
  } catch {
    throw new Error("备份中的恢复信息已损坏。现有资料没有被替换。");
  }
}

function parseRecoveryRecord(value: unknown): RecoveryKeyRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<RecoveryKeyRecord>;
  if (
    typeof record.salt !== "string" ||
    typeof record.nonce !== "string" ||
    typeof record.ciphertext !== "string" ||
    typeof record.tag !== "string"
  ) {
    return null;
  }
  return record as RecoveryKeyRecord;
}

function assertLegacyLingSchema(backup: BackupDatabaseHandle) {
  for (const tableName of ["schema_migrations", "sessions", "messages", "settings"]) {
    const row = backup
      .prepare<[string], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
      )
      .get(tableName);
    if (!row) throw new Error("所选数据库不是由 Ling 创建的本地资料备份。现有资料没有被替换。");
  }

  const columns = backup.prepare<[], { name: string }>("PRAGMA table_info(sessions)").all();
  const sessionColumns = new Set(columns.map((column) => column.name));
  const requiredSessionColumns = [
    "id",
    "title",
    "counselor_id",
    "room_theme_id",
    "model_name",
    "created_at",
    "updated_at",
    "started_at",
    "status"
  ];
  const missingColumn = requiredSessionColumns.find((column) => !sessionColumns.has(column));
  if (missingColumn) throw new Error("所选备份中的会谈表结构不完整。现有资料没有被替换。");
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
