import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { LingDatabase } from "../../../../../packages/database/src/index.js";

const accessLockKey = "accessLock";
const keyLength = 64;

interface AccessLockRow {
  value: string;
}

interface AccessLockRecord {
  version: 1;
  passwordSalt: string;
  passwordHash: string;
  recoverySalt: string;
  recoveryHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessLockRepository {
  read: () => AccessLockRecord | null;
  setup: (password: string, recoveryPhrase: string) => void;
  verifyPassword: (password: string) => boolean;
  recover: (recoveryPhrase: string, newPassword: string) => boolean;
  changePassword: (currentPassword: string, newPassword: string) => boolean;
  disable: (password: string) => boolean;
}

export function createAccessLockRepository(db: LingDatabase): AccessLockRepository {
  function read() {
    const row = db.prepare<[string], AccessLockRow>("SELECT value FROM settings WHERE key = ?").get(accessLockKey);
    if (!row) return null;
    return parseRecord(row.value);
  }

  function save(record: AccessLockRecord) {
    db.prepare<[string, string, string]>(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`
    ).run(accessLockKey, JSON.stringify(record), record.updatedAt);
  }

  return {
    read,
    setup(password, recoveryPhrase) {
      save(createAccessLockRecord(password, recoveryPhrase));
    },
    verifyPassword(password) {
      const record = read();
      return Boolean(record && verifySecret(password, record.passwordSalt, record.passwordHash));
    },
    recover(recoveryPhrase, newPassword) {
      const record = read();
      if (!record || !verifySecret(normalizeRecoveryPhrase(recoveryPhrase), record.recoverySalt, record.recoveryHash)) return false;
      save(replacePassword(record, newPassword));
      return true;
    },
    changePassword(currentPassword, newPassword) {
      const record = read();
      if (!record || !verifySecret(currentPassword, record.passwordSalt, record.passwordHash)) return false;
      save(replacePassword(record, newPassword));
      return true;
    },
    disable(password) {
      const record = read();
      if (!record || !verifySecret(password, record.passwordSalt, record.passwordHash)) return false;
      db.prepare<[string]>("DELETE FROM settings WHERE key = ?").run(accessLockKey);
      return true;
    }
  };
}

export function validatePassword(value: unknown) {
  if (typeof value !== "string") return "请输入密码。";
  if (value.length < 8) return "密码至少需要 8 位。";
  if (value.length > 128) return "密码不能超过 128 位。";
  return null;
}

export function validateRecoveryPhrase(value: unknown) {
  if (typeof value !== "string" || normalizeRecoveryPhrase(value).length < 8) {
    return "恢复码不完整，请按原样输入。";
  }
  return null;
}

export function normalizeRecoveryPhrase(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[“”"‘’]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export function createAccessLockRecord(password: string, recoveryPhrase: string, now = new Date()): AccessLockRecord {
  const passwordSalt = randomBytes(16).toString("base64");
  const recoverySalt = randomBytes(16).toString("base64");
  const timestamp = now.toISOString();
  return {
    version: 1,
    passwordSalt,
    passwordHash: hashSecret(password, passwordSalt),
    recoverySalt,
    recoveryHash: hashSecret(normalizeRecoveryPhrase(recoveryPhrase), recoverySalt),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function replacePassword(record: AccessLockRecord, newPassword: string): AccessLockRecord {
  const passwordSalt = randomBytes(16).toString("base64");
  return {
    ...record,
    passwordSalt,
    passwordHash: hashSecret(newPassword, passwordSalt),
    updatedAt: new Date().toISOString()
  };
}

function hashSecret(secret: string, salt: string) {
  return scryptSync(secret, Buffer.from(salt, "base64"), keyLength).toString("base64");
}

function verifySecret(secret: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(hashSecret(secret, salt), "base64");
  const expected = Buffer.from(expectedHash, "base64");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function parseRecord(value: string): AccessLockRecord | null {
  try {
    const record = JSON.parse(value) as Partial<AccessLockRecord>;
    if (
      record.version !== 1 ||
      typeof record.passwordSalt !== "string" ||
      typeof record.passwordHash !== "string" ||
      typeof record.recoverySalt !== "string" ||
      typeof record.recoveryHash !== "string" ||
      typeof record.createdAt !== "string" ||
      typeof record.updatedAt !== "string"
    ) {
      return null;
    }
    return record as AccessLockRecord;
  } catch {
    return null;
  }
}
