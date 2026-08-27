import type { UserSettings } from "../../../shared/src/index.js";
import type { LingDatabase } from "../db.js";

export interface SettingsRepository {
  read: () => Promise<UserSettings | null>;
  save: (settings: UserSettings) => Promise<void>;
}

interface SettingsRow {
  value: string;
}

const userSettingsKey = "userSettings";

export function createSettingsRepository(db: LingDatabase): SettingsRepository {
  return {
    async read() {
      const row = db
        .prepare<[string], SettingsRow>("SELECT value FROM settings WHERE key = ?")
        .get(userSettingsKey);
      return row ? sanitizeSettings(JSON.parse(row.value) as UserSettings) : null;
    },
    async save(settings) {
      const safeSettings = sanitizeSettings(settings);
      db.prepare<[string, string, string]>(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`
      ).run(userSettingsKey, JSON.stringify(safeSettings), new Date().toISOString());
    }
  };
}

function sanitizeSettings(settings: UserSettings): UserSettings {
  const apiKey = settings.api.apiKey?.trim() ?? "";
  const apiKeySaved = settings.api.apiKeySaved ?? apiKey.length > 0;
  const accessToken = settings.voiceInput?.doubao.accessToken?.trim() ?? "";
  const accessTokenSaved = settings.voiceInput?.doubao.accessTokenSaved ?? accessToken.length > 0;
  const tencentSecretId = settings.voiceInput?.tencent?.secretId?.trim() ?? "";
  const tencentSecretKey = settings.voiceInput?.tencent?.secretKey?.trim() ?? "";
  const aliyunApiKey = settings.voiceInput?.aliyun?.apiKey?.trim() ?? "";
  const legacyProvider = settings.voiceInput?.provider as string | undefined;
  return {
    ...settings,
    api: {
      ...settings.api,
      apiKey: "",
      apiKeySaved,
      apiKeyPreview: settings.api.apiKeyPreview ?? (apiKey ? previewSecret(apiKey) : undefined)
    },
    voiceInput: settings.voiceInput
      ? {
          ...settings.voiceInput,
          provider: legacyProvider === "doubao" ? "volcengine" : settings.voiceInput.provider,
          doubao: {
            ...settings.voiceInput.doubao,
            accessToken: "",
            accessTokenSaved,
            accessTokenPreview:
              settings.voiceInput.doubao.accessTokenPreview ??
              (accessToken ? previewSecret(accessToken) : undefined)
          },
          tencent: {
            ...settings.voiceInput.tencent,
            appId: settings.voiceInput.tencent?.appId ?? "",
            model: "16k_zh",
            secretId: "",
            secretIdSaved: settings.voiceInput.tencent?.secretIdSaved ?? Boolean(tencentSecretId),
            secretIdPreview:
              settings.voiceInput.tencent?.secretIdPreview ??
              (tencentSecretId ? previewSecret(tencentSecretId) : undefined),
            secretKey: "",
            secretKeySaved: settings.voiceInput.tencent?.secretKeySaved ?? Boolean(tencentSecretKey),
            secretKeyPreview:
              settings.voiceInput.tencent?.secretKeyPreview ??
              (tencentSecretKey ? previewSecret(tencentSecretKey) : undefined)
          },
          aliyun: {
            ...settings.voiceInput.aliyun,
            model: settings.voiceInput.aliyun?.model === "qwen3-asr-flash-realtime"
              ? "qwen3-asr-flash-realtime"
              : "fun-asr-realtime",
            region: settings.voiceInput.aliyun?.region === "singapore" ? "singapore" : "beijing",
            workspaceId: settings.voiceInput.aliyun?.workspaceId ?? "",
            apiKey: "",
            apiKeySaved: settings.voiceInput.aliyun?.apiKeySaved ?? Boolean(aliyunApiKey),
            apiKeyPreview:
              settings.voiceInput.aliyun?.apiKeyPreview ??
              (aliyunApiKey ? previewSecret(aliyunApiKey) : undefined)
          }
        }
      : undefined
  };
}

function previewSecret(secret: string) {
  if (secret.length <= 4) return "••••";
  return `${secret.slice(0, 2)}...${secret.slice(-2)}`;
}
