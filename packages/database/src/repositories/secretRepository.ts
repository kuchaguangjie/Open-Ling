import type { LingDatabase } from "../db.js";

export interface SecretRepository {
  saveApiKey: (apiKey: string) => Promise<void>;
  readApiKey: () => Promise<string | null>;
  deleteApiKey: () => Promise<void>;
  hasApiKey: () => Promise<boolean>;
  saveDoubaoAccessToken: (accessToken: string) => Promise<void>;
  readDoubaoAccessToken: () => Promise<string | null>;
  deleteDoubaoAccessToken: () => Promise<void>;
  hasDoubaoAccessToken: () => Promise<boolean>;
  saveTencentSecretId: (value: string) => Promise<void>;
  readTencentSecretId: () => Promise<string | null>;
  deleteTencentSecretId: () => Promise<void>;
  hasTencentSecretId: () => Promise<boolean>;
  saveTencentSecretKey: (value: string) => Promise<void>;
  readTencentSecretKey: () => Promise<string | null>;
  deleteTencentSecretKey: () => Promise<void>;
  hasTencentSecretKey: () => Promise<boolean>;
  saveAliyunApiKey: (value: string) => Promise<void>;
  readAliyunApiKey: () => Promise<string | null>;
  deleteAliyunApiKey: () => Promise<void>;
  hasAliyunApiKey: () => Promise<boolean>;
}

interface SecretRow {
  value: string;
}

const apiKeySecretName = "apiKey";
const doubaoAccessTokenSecretName = "doubaoVoiceAccessToken";
const tencentSecretIdSecretName = "tencentVoiceSecretId";
const tencentSecretKeySecretName = "tencentVoiceSecretKey";
const aliyunApiKeySecretName = "aliyunVoiceApiKey";

export function createSecretRepository(db: LingDatabase): SecretRepository {
  return {
    async saveApiKey(apiKey) {
      db.prepare<[string, string, string]>(
        `INSERT INTO secrets (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`
      ).run(apiKeySecretName, apiKey, new Date().toISOString());
    },
    async readApiKey() {
      const row = db
        .prepare<[string], SecretRow>("SELECT value FROM secrets WHERE key = ?")
        .get(apiKeySecretName);
      return row?.value ?? null;
    },
    async deleteApiKey() {
      db.prepare<[string]>("DELETE FROM secrets WHERE key = ?").run(apiKeySecretName);
    },
    async hasApiKey() {
      const row = db
        .prepare<[string], SecretRow>("SELECT value FROM secrets WHERE key = ?")
        .get(apiKeySecretName);
      return Boolean(row?.value);
    },
    async saveDoubaoAccessToken(accessToken) {
      saveSecret(db, doubaoAccessTokenSecretName, accessToken);
    },
    async readDoubaoAccessToken() {
      return readSecret(db, doubaoAccessTokenSecretName);
    },
    async deleteDoubaoAccessToken() {
      deleteSecret(db, doubaoAccessTokenSecretName);
    },
    async hasDoubaoAccessToken() {
      return Boolean(readSecret(db, doubaoAccessTokenSecretName));
    },
    async saveTencentSecretId(value) {
      saveSecret(db, tencentSecretIdSecretName, value);
    },
    async readTencentSecretId() {
      return readSecret(db, tencentSecretIdSecretName);
    },
    async deleteTencentSecretId() {
      deleteSecret(db, tencentSecretIdSecretName);
    },
    async hasTencentSecretId() {
      return Boolean(readSecret(db, tencentSecretIdSecretName));
    },
    async saveTencentSecretKey(value) {
      saveSecret(db, tencentSecretKeySecretName, value);
    },
    async readTencentSecretKey() {
      return readSecret(db, tencentSecretKeySecretName);
    },
    async deleteTencentSecretKey() {
      deleteSecret(db, tencentSecretKeySecretName);
    },
    async hasTencentSecretKey() {
      return Boolean(readSecret(db, tencentSecretKeySecretName));
    },
    async saveAliyunApiKey(value) {
      saveSecret(db, aliyunApiKeySecretName, value);
    },
    async readAliyunApiKey() {
      return readSecret(db, aliyunApiKeySecretName);
    },
    async deleteAliyunApiKey() {
      deleteSecret(db, aliyunApiKeySecretName);
    },
    async hasAliyunApiKey() {
      return Boolean(readSecret(db, aliyunApiKeySecretName));
    }
  };
}

function saveSecret(db: LingDatabase, key: string, value: string) {
  db.prepare<[string, string, string]>(
    `INSERT INTO secrets (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value, new Date().toISOString());
}

function readSecret(db: LingDatabase, key: string) {
  const row = db.prepare<[string], SecretRow>("SELECT value FROM secrets WHERE key = ?").get(key);
  return row?.value ?? null;
}

function deleteSecret(db: LingDatabase, key: string) {
  db.prepare<[string]>("DELETE FROM secrets WHERE key = ?").run(key);
}
