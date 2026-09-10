import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { chmodSync } from "node:fs";
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import Database from "better-sqlite3-multiple-ciphers";
import { migrateLingDatabase, type LingDatabase } from "../../../../../packages/database/src/index.js";

const VAULT_VERSION = 1;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

interface WrappedKey {
  salt: string;
  nonce: string;
  ciphertext: string;
  tag: string;
}

export type RecoveryKeyRecord = WrappedKey;

interface DataVaultFile {
  version: 1;
  password: WrappedKey;
  recovery: WrappedKey;
  device?: DeviceWrappedKey;
  graceMinutes: number;
  createdAt: string;
  updatedAt: string;
}

interface DeviceWrappedKey {
  encryptedKey: string;
}

export interface DeviceKeyEncryption {
  decryptString: (encrypted: Buffer) => string;
  encryptString: (plainText: string) => Buffer;
  isEncryptionAvailable: () => boolean;
}

export class DataVault {
  constructor(
    readonly databasePath: string,
    readonly vaultPath: string,
    private record: DataVaultFile
  ) {}

  async unlock(password: string) {
    return unwrapKeyWithSecret(this.record.password, password);
  }

  getRecoveryRecord() {
    return { ...this.record.recovery };
  }

  getGraceMinutes() {
    return this.record.graceMinutes;
  }

  isPasswordEnabled() {
    return !this.record.device;
  }

  async unlockWithDevice(encryption: DeviceKeyEncryption) {
    if (!this.record.device || !encryption.isEncryptionAvailable()) {
      throw new Error("这台设备无法使用系统安全存储打开本地资料。");
    }
    return Buffer.from(
      encryption.decryptString(Buffer.from(this.record.device.encryptedKey, "base64")),
      "base64"
    );
  }

  async setGraceMinutes(minutes: number) {
    const next = {
      ...this.record,
      graceMinutes: minutes,
      updatedAt: new Date().toISOString()
    };
    await this.persist(next);
    this.record = next;
  }

  async recover(recoveryPhrase: string, newPassword: string) {
    const dataKey = unwrapRecoverySecret(this.record.recovery, recoveryPhrase);
    const password = wrapKeyWithSecret(dataKey, newPassword);
    const next = {
      ...this.record,
      password,
      updatedAt: new Date().toISOString()
    };
    await this.persist(next);
    this.record = next;
    return dataKey;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const dataKey = unwrapKeyWithSecret(this.record.password, currentPassword);
    const password = wrapKeyWithSecret(dataKey, newPassword);
    const next = {
      ...this.record,
      password,
      updatedAt: new Date().toISOString()
    };
    await this.persist(next);
    this.record = next;
  }

  async disablePassword(password: string, encryption: DeviceKeyEncryption) {
    if (!encryption.isEncryptionAvailable()) {
      throw new Error("当前系统安全存储不可用，无法关闭启动密码。");
    }
    const dataKey = unwrapKeyWithSecret(this.record.password, password);
    const next: DataVaultFile = {
      ...this.record,
      device: {
        encryptedKey: encryption.encryptString(dataKey.toString("base64")).toString("base64")
      },
      updatedAt: new Date().toISOString()
    };
    await this.persist(next);
    this.record = next;
    return dataKey;
  }

  async enablePassword(dataKey: Buffer, password: string, recoveryPhrase: string) {
    const next: DataVaultFile = {
      version: VAULT_VERSION,
      password: wrapKeyWithSecret(dataKey, password),
      recovery: wrapKeyWithSecret(dataKey, normalizeRecoveryPhrase(recoveryPhrase)),
      graceMinutes: this.record.graceMinutes,
      createdAt: this.record.createdAt,
      updatedAt: new Date().toISOString()
    };
    await this.persist(next);
    this.record = next;
  }

  private async persist(next: DataVaultFile) {
    await writeAtomicJson(this.vaultPath, next);
  }
}

export async function createDataVault(input: {
  databasePath: string;
  vaultPath: string;
  password: string;
  recoveryPhrase: string;
}) {
  const dataKey = randomBytes(KEY_BYTES);
  const record: DataVaultFile = {
    version: VAULT_VERSION,
    password: wrapKeyWithSecret(dataKey, input.password),
    recovery: wrapKeyWithSecret(dataKey, normalizeRecoveryPhrase(input.recoveryPhrase)),
    graceMinutes: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await writeAtomicJson(input.vaultPath, record);
  try {
    const db = await openOrMigrateEncryptedDatabase(input.databasePath, dataKey);
    db.close();
  } catch (error) {
    await rm(input.vaultPath, { force: true });
    throw error;
  }
  return new DataVault(input.databasePath, input.vaultPath, record);
}

export async function createDeviceProtectedDataVault(input: {
  databasePath: string;
  vaultPath: string;
  encryption: DeviceKeyEncryption;
}) {
  if (!input.encryption.isEncryptionAvailable()) {
    throw new Error("当前系统安全存储不可用，无法初始化本地资料。");
  }
  const dataKey = randomBytes(KEY_BYTES);
  const internalPassword = randomBytes(KEY_BYTES).toString("base64");
  const internalRecovery = randomBytes(KEY_BYTES).toString("base64");
  const now = new Date().toISOString();
  const record: DataVaultFile = {
    version: VAULT_VERSION,
    password: wrapKeyWithSecret(dataKey, internalPassword),
    recovery: wrapKeyWithSecret(dataKey, internalRecovery),
    device: {
      encryptedKey: input.encryption.encryptString(dataKey.toString("base64")).toString("base64")
    },
    graceMinutes: 5,
    createdAt: now,
    updatedAt: now
  };
  await writeAtomicJson(input.vaultPath, record);
  try {
    const db = await openOrMigrateEncryptedDatabase(input.databasePath, dataKey);
    db.close();
  } catch (error) {
    await rm(input.vaultPath, { force: true });
    throw error;
  }
  return { vault: new DataVault(input.databasePath, input.vaultPath, record), dataKey };
}

export async function loadDataVault(vaultPath: string, databasePath: string) {
  const raw = await readFile(vaultPath, "utf8").catch((error: unknown) => {
    if (isMissingFileError(error)) return null;
    throw error;
  });
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<DataVaultFile>;
  if (
    parsed.version !== VAULT_VERSION ||
    !isWrappedKey(parsed.password) ||
    !isWrappedKey(parsed.recovery) ||
    (parsed.device !== undefined && !isDeviceWrappedKey(parsed.device)) ||
    typeof parsed.graceMinutes !== "number"
  ) {
    throw new Error("本地数据保险箱文件不完整。");
  }
  return new DataVault(databasePath, vaultPath, parsed as DataVaultFile);
}

function isDeviceWrappedKey(value: unknown): value is DeviceWrappedKey {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as Partial<DeviceWrappedKey>).encryptedKey === "string"
  );
}

export function openEncryptedDatabase(path: string, dataKey: Buffer) {
  const db = new Database(path);
  try {
    db.pragma(`key = "x'${dataKey.toString("hex")}'"`);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrateLingDatabase(db as unknown as LingDatabase);
    chmodSync(path, 0o600);
    return db as unknown as LingDatabase;
  } catch (error) {
    db.close();
    throw error;
  }
}

export async function openOrMigrateEncryptedDatabase(path: string, dataKey: Buffer) {
  try {
    return openEncryptedDatabase(path, dataKey);
  } catch (encryptedOpenError) {
    if (!await isExistingFile(path)) throw encryptedOpenError;
    await migratePlaintextDatabase(path, dataKey).catch((migrationError: unknown) => {
      throw new Error(
        "现有本地资料既不能用当前密钥打开，也不能作为旧版资料安全升级。请使用原恢复码恢复备份，或保留数据目录后联系支持。",
        { cause: migrationError }
      );
    });
    return openEncryptedDatabase(path, dataKey);
  }
}

export const MIN_PIN_LENGTH = 8;
export const MAX_PIN_LENGTH = 64;

/**
 * Applies only to a password being *set* (setup, recover, change). The unlock
 * path deliberately never calls this: a vault created before the 8-digit floor
 * still holds a shorter password, and rejecting it here would lock those users
 * out of their own data. See `isLegacyPin` for how they are surfaced instead.
 */
export function validatePin(value: unknown) {
  if (typeof value !== "string" || !/^\d+$/u.test(value)) return `请输入 ${MIN_PIN_LENGTH} 位以上的数字密码。`;
  if (value.length < MIN_PIN_LENGTH) return `密码至少需要 ${MIN_PIN_LENGTH} 位数字。`;
  if (value.length > MAX_PIN_LENGTH) return `密码不能超过 ${MAX_PIN_LENGTH} 位。`;
  return null;
}

/**
 * A password that satisfied an older floor but predates the current one. The
 * vault stores no length metadata, so this is inferred from a successful
 * unlock — the only moment a known-correct password is in hand.
 */
export function isLegacyPin(value: string) {
  return value.length < MIN_PIN_LENGTH;
}

export function normalizeRecoveryPhrase(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[“”"‘’]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export function unwrapRecoveryKey(record: RecoveryKeyRecord, recoveryPhrase: string) {
  return unwrapRecoverySecret(record, recoveryPhrase);
}

function unwrapRecoverySecret(record: RecoveryKeyRecord, recoveryPhrase: string) {
  const normalized = normalizeRecoveryPhrase(recoveryPhrase);
  const compact = normalized.replace(/[-‐‑‒–—―]/gu, "");
  const regrouped = /^[a-zA-Z0-9]+$/u.test(compact) && compact.length % 4 === 0
    ? compact.match(/.{4}/gu)?.join("-")
    : undefined;
  const candidates = [...new Set([
    normalized,
    normalized.toUpperCase(),
    regrouped,
    regrouped?.toUpperCase()
  ].filter((value): value is string => Boolean(value)))];
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return unwrapKeyWithSecret(record, candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function wrapKeyWithSecret(dataKey: Buffer, secret: string): WrappedKey {
  const salt = randomBytes(SALT_BYTES);
  return wrapKey(dataKey, deriveKey(secret, salt), salt);
}

function unwrapKeyWithSecret(wrapped: WrappedKey, secret: string) {
  return unwrapKey(wrapped, deriveKey(secret, Buffer.from(wrapped.salt, "base64")));
}

function deriveKey(secret: string, salt: Buffer) {
  return scryptSync(secret, salt, KEY_BYTES, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 128 * 1024 * 1024
  });
}

function wrapKey(dataKey: Buffer, wrappingKey: Buffer, salt: Buffer): WrappedKey {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", wrappingKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  return {
    salt: salt.toString("base64"),
    nonce: nonce.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: cipher.getAuthTag().toString("base64")
  };
}

function unwrapKey(wrapped: WrappedKey, wrappingKey: Buffer) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    wrappingKey,
    Buffer.from(wrapped.nonce, "base64")
  );
  decipher.setAuthTag(Buffer.from(wrapped.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(wrapped.ciphertext, "base64")),
    decipher.final()
  ]);
}

function isWrappedKey(value: unknown): value is WrappedKey {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<WrappedKey>;
  return ["salt", "nonce", "ciphertext", "tag"].every(
    (key) => typeof record[key as keyof WrappedKey] === "string"
  );
}

async function writeAtomicJson(filePath: string, value: DataVaultFile) {
  await mkdir(dirname(filePath), { mode: 0o700, recursive: true });
  const temporaryPath = join(dirname(filePath), `.vault-${Date.now()}-${randomBytes(4).toString("hex")}.tmp`);
  try {
    await writeFile(temporaryPath, JSON.stringify(value, null, 2), { mode: 0o600 });
    await rename(temporaryPath, filePath);
    chmodSync(filePath, 0o600);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function migratePlaintextDatabase(databasePath: string, dataKey: Buffer) {
  const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const encryptedPath = `${databasePath}.encrypted-${suffix}`;
  const plaintextBackupPath = `${databasePath}.plaintext-${suffix}`;
  try {
    await copyFile(databasePath, encryptedPath);
    const plaintextDb = new Database(encryptedPath);
    try {
      plaintextDb.pragma("wal_checkpoint(TRUNCATE)");
      plaintextDb.pragma("journal_mode = DELETE");
      plaintextDb.prepare("SELECT count(*) AS count FROM sqlite_master").get();
      plaintextDb.pragma(`rekey = \"x'${dataKey.toString("hex")}'\"`);
    } finally {
      plaintextDb.close();
    }

    const verificationDb = openEncryptedDatabase(encryptedPath, dataKey);
    verificationDb.prepare("SELECT count(*) AS count FROM sqlite_master").get();
    verificationDb.close();

    await rename(databasePath, plaintextBackupPath);
    try {
      await rename(encryptedPath, databasePath);
    } catch (error) {
      await rename(plaintextBackupPath, databasePath);
      throw error;
    }
    await rm(plaintextBackupPath, { force: true });
    await rm(`${databasePath}-wal`, { force: true });
    await rm(`${databasePath}-shm`, { force: true });
  } finally {
    await rm(encryptedPath, { force: true });
  }
}

async function isExistingFile(path: string) {
  return stat(path).then((entry) => entry.isFile() && entry.size > 0).catch(() => false);
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
