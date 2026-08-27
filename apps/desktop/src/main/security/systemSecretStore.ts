import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import type { SafeStorage } from "electron";
import type { SecretRepository } from "../../../../../packages/database/src/index.js";

export interface SystemSecretRepository extends SecretRepository {
  migrateLegacyApiKey: () => Promise<"already-secure" | "migrated" | "no-key">;
}

type EncryptionProvider = Pick<
  SafeStorage,
  "decryptString" | "encryptString" | "getSelectedStorageBackend" | "isEncryptionAvailable"
>;

export function createSystemSecretRepository({
  credentialPath,
  encryption,
  legacy,
  platform = process.platform
}: {
  credentialPath: string;
  encryption: EncryptionProvider;
  legacy: SecretRepository;
  platform?: NodeJS.Platform;
}): SystemSecretRepository {
  const credentialDirectory = dirname(credentialPath);
  const apiKey = createSecureSecret({
    credentialPath,
    displayName: "API Key",
    encryption,
    platform,
    legacy: {
      read: legacy.readApiKey,
      delete: legacy.deleteApiKey
    }
  });
  const doubaoAccessToken = createSecureSecret({
    credentialPath: join(credentialDirectory, "doubao-access-token.safe"),
    displayName: "火山引擎访问令牌",
    encryption,
    platform,
    legacy: {
      read: legacy.readDoubaoAccessToken,
      delete: legacy.deleteDoubaoAccessToken
    }
  });
  const tencentSecretId = createSecureSecret({
    credentialPath: join(credentialDirectory, "tencent-secret-id.safe"),
    displayName: "腾讯云 SecretId",
    encryption,
    platform,
    legacy: {
      read: legacy.readTencentSecretId,
      delete: legacy.deleteTencentSecretId
    }
  });
  const tencentSecretKey = createSecureSecret({
    credentialPath: join(credentialDirectory, "tencent-secret-key.safe"),
    displayName: "腾讯云 SecretKey",
    encryption,
    platform,
    legacy: {
      read: legacy.readTencentSecretKey,
      delete: legacy.deleteTencentSecretKey
    }
  });
  const aliyunApiKey = createSecureSecret({
    credentialPath: join(credentialDirectory, "aliyun-api-key.safe"),
    displayName: "阿里云 API Key",
    encryption,
    platform,
    legacy: {
      read: legacy.readAliyunApiKey,
      delete: legacy.deleteAliyunApiKey
    }
  });

  const repository: SystemSecretRepository = {
    saveApiKey: apiKey.save,
    readApiKey: apiKey.read,
    deleteApiKey: apiKey.delete,
    hasApiKey: apiKey.has,
    saveDoubaoAccessToken: doubaoAccessToken.save,
    readDoubaoAccessToken: doubaoAccessToken.read,
    deleteDoubaoAccessToken: doubaoAccessToken.delete,
    hasDoubaoAccessToken: doubaoAccessToken.has,
    saveTencentSecretId: tencentSecretId.save,
    readTencentSecretId: tencentSecretId.read,
    deleteTencentSecretId: tencentSecretId.delete,
    hasTencentSecretId: tencentSecretId.has,
    saveTencentSecretKey: tencentSecretKey.save,
    readTencentSecretKey: tencentSecretKey.read,
    deleteTencentSecretKey: tencentSecretKey.delete,
    hasTencentSecretKey: tencentSecretKey.has,
    saveAliyunApiKey: aliyunApiKey.save,
    readAliyunApiKey: aliyunApiKey.read,
    deleteAliyunApiKey: aliyunApiKey.delete,
    hasAliyunApiKey: aliyunApiKey.has,
    async migrateLegacyApiKey() {
      return apiKey.migrate();
    }
  };

  return repository;
}

function createSecureSecret({
  credentialPath,
  displayName,
  encryption,
  legacy,
  platform
}: {
  credentialPath: string;
  displayName: string;
  encryption: EncryptionProvider;
  legacy: {
    read: () => Promise<string | null>;
    delete: () => Promise<void>;
  };
  platform: NodeJS.Platform;
}) {
  async function readEncrypted() {
    const encrypted = await readFile(credentialPath).catch((error: unknown) => {
      if (isMissingFileError(error)) return null;
      throw error;
    });
    if (!encrypted) return null;
    assertSecureStorageAvailable(encryption, platform);
    try {
      return encryption.decryptString(encrypted);
    } catch {
      throw new Error(`系统安全存储中的${displayName}无法读取。请删除后重新保存。`);
    }
  }

  async function writeEncrypted(value: string) {
    assertSecureStorageAvailable(encryption, platform);
    const encrypted = encryption.encryptString(value);
    if (encryption.decryptString(encrypted) !== value) {
      throw new Error(`系统安全存储未能验证${displayName}，现有配置没有被替换。`);
    }

    const temporaryPath = `${credentialPath}.${randomUUID()}.tmp`;
    await mkdir(dirname(credentialPath), { mode: 0o700, recursive: true });
    try {
      await writeFile(temporaryPath, encrypted, { mode: 0o600 });
      await rename(temporaryPath, credentialPath);
      const persisted = await readFile(credentialPath);
      if (encryption.decryptString(persisted) !== value) {
        throw new Error(`系统安全存储写入${displayName}后验证失败，现有配置没有被替换。`);
      }
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  const secret = {
    async save(value: string) {
      const normalized = value.trim();
      if (!normalized) {
        await secret.delete();
        return;
      }
      await writeEncrypted(normalized);
      // Only remove the legacy plaintext after the encrypted value has been
      // persisted and independently decrypted successfully.
      await legacy.delete();
    },
    async read() {
      const secured = await readEncrypted();
      if (secured) return secured;
      const legacyValue = await legacy.read();
      if (!legacyValue) return null;
      await secret.save(legacyValue);
      return legacyValue;
    },
    async delete() {
      await rm(credentialPath, { force: true });
      await legacy.delete();
    },
    async has() {
      try {
        return Boolean(await secret.read());
      } catch {
        // Settings remain readable if the OS credential service is temporarily
        // unavailable. Actual model calls still fail closed in read().
        return false;
      }
    },
    async migrate(): Promise<"already-secure" | "migrated" | "no-key"> {
      const secured = await readEncrypted();
      if (secured) {
        await legacy.delete();
        return "already-secure";
      }
      const legacyValue = await legacy.read();
      if (!legacyValue) return "no-key";
      await secret.save(legacyValue);
      return "migrated";
    }
  };

  return secret;
}

function assertSecureStorageAvailable(encryption: EncryptionProvider, platform: NodeJS.Platform) {
  if (!encryption.isEncryptionAvailable()) {
    throw new Error("当前系统安全存储不可用，Ling 不会以明文保存 API Key。");
  }
  if (platform === "linux" && encryption.getSelectedStorageBackend() === "basic_text") {
    throw new Error("当前系统没有可用的安全凭据服务，Ling 不会以弱加密方式保存 API Key。");
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
