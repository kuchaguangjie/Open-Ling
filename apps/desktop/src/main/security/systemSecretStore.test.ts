// @vitest-environment node
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SecretRepository } from "../../../../../packages/database/src/index.js";
import { createSystemSecretRepository } from "./systemSecretStore.js";

describe("systemSecretStore", () => {
  let directory: string;
  let credentialPath: string;
  let legacy: SecretRepository;
  let legacyValue: string | null;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "ling-system-secret-"));
    credentialPath = join(directory, "credentials", "api-key.safe");
    legacyValue = null;
    legacy = {
      deleteApiKey: vi.fn(async () => {
        legacyValue = null;
      }),
      hasApiKey: vi.fn(async () => Boolean(legacyValue)),
      readApiKey: vi.fn(async () => legacyValue),
      saveApiKey: vi.fn(async (apiKey) => {
        legacyValue = apiKey;
      }),
      saveDoubaoAccessToken: vi.fn(async () => undefined),
      readDoubaoAccessToken: vi.fn(async () => null),
      deleteDoubaoAccessToken: vi.fn(async () => undefined),
      hasDoubaoAccessToken: vi.fn(async () => false),
      saveTencentSecretId: vi.fn(async () => undefined),
      readTencentSecretId: vi.fn(async () => null),
      deleteTencentSecretId: vi.fn(async () => undefined),
      hasTencentSecretId: vi.fn(async () => false),
      saveTencentSecretKey: vi.fn(async () => undefined),
      readTencentSecretKey: vi.fn(async () => null),
      deleteTencentSecretKey: vi.fn(async () => undefined),
      hasTencentSecretKey: vi.fn(async () => false),
      saveAliyunApiKey: vi.fn(async () => undefined),
      readAliyunApiKey: vi.fn(async () => null),
      deleteAliyunApiKey: vi.fn(async () => undefined),
      hasAliyunApiKey: vi.fn(async () => false)
    };
  });

  afterEach(async () => {
    await rm(directory, { force: true, recursive: true });
  });

  it("stores only encrypted bytes and removes the legacy plaintext after verification", async () => {
    legacyValue = "legacy-key";
    const repository = createSystemSecretRepository({
      credentialPath,
      encryption: encryptionProvider(),
      legacy,
      platform: "darwin"
    });

    await repository.saveApiKey("sk-secure-value");

    expect(await repository.readApiKey()).toBe("sk-secure-value");
    expect((await readFile(credentialPath)).toString("utf8")).not.toContain("sk-secure-value");
    expect(legacyValue).toBeNull();
    if (process.platform !== "win32") {
      expect((await stat(credentialPath)).mode & 0o777).toBe(0o600);
    }
  });

  it("migrates a legacy database key before deleting its plaintext copy", async () => {
    legacyValue = "legacy-to-migrate";
    const repository = createSystemSecretRepository({
      credentialPath,
      encryption: encryptionProvider(),
      legacy,
      platform: "win32"
    });

    await expect(repository.migrateLegacyApiKey()).resolves.toBe("migrated");
    expect(await repository.readApiKey()).toBe("legacy-to-migrate");
    expect(legacyValue).toBeNull();
  });

  it("keeps the legacy key untouched when secure encryption is unavailable", async () => {
    legacyValue = "must-not-be-lost";
    const repository = createSystemSecretRepository({
      credentialPath,
      encryption: encryptionProvider({ available: false }),
      legacy,
      platform: "darwin"
    });

    await expect(repository.migrateLegacyApiKey()).rejects.toThrow(/系统安全存储不可用/);
    await expect(repository.hasApiKey()).resolves.toBe(false);
    expect(legacyValue).toBe("must-not-be-lost");
    await expect(readFile(credentialPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects Linux basic_text instead of silently using weak encryption", async () => {
    legacyValue = "must-remain";
    const repository = createSystemSecretRepository({
      credentialPath,
      encryption: encryptionProvider({ backend: "basic_text" }),
      legacy,
      platform: "linux"
    });

    await expect(repository.migrateLegacyApiKey()).rejects.toThrow(/弱加密/);
    expect(legacyValue).toBe("must-remain");
  });

  it("deletes both the encrypted credential and any legacy remnant", async () => {
    const repository = createSystemSecretRepository({
      credentialPath,
      encryption: encryptionProvider(),
      legacy,
      platform: "darwin"
    });
    await repository.saveApiKey("sk-delete-me");
    legacyValue = "stale-legacy-copy";

    await repository.deleteApiKey();

    expect(legacyValue).toBeNull();
    await expect(readFile(credentialPath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(repository.hasApiKey()).resolves.toBe(false);
  });

  it("stores cloud voice credentials in separate encrypted files", async () => {
    const repository = createSystemSecretRepository({
      credentialPath,
      encryption: encryptionProvider(),
      legacy,
      platform: "darwin"
    });

    await repository.saveDoubaoAccessToken("doubao-secret");
    await repository.saveTencentSecretId("tencent-id");
    await repository.saveTencentSecretKey("tencent-secret");
    await repository.saveAliyunApiKey("aliyun-secret");

    await expect(repository.readDoubaoAccessToken()).resolves.toBe("doubao-secret");
    await expect(repository.readTencentSecretId()).resolves.toBe("tencent-id");
    await expect(repository.readTencentSecretKey()).resolves.toBe("tencent-secret");
    await expect(repository.readAliyunApiKey()).resolves.toBe("aliyun-secret");
    for (const fileName of [
      "doubao-access-token.safe",
      "tencent-secret-id.safe",
      "tencent-secret-key.safe",
      "aliyun-api-key.safe"
    ]) {
      const encrypted = (await readFile(join(directory, "credentials", fileName))).toString("utf8");
      expect(encrypted).toMatch(/^encrypted:/);
      expect(encrypted).not.toContain("secret");
    }
  });
});

function encryptionProvider({
  available = true,
  backend = "unknown"
}: {
  available?: boolean;
  backend?: "basic_text" | "unknown";
} = {}) {
  return {
    decryptString(encrypted: Buffer) {
      const value = encrypted.toString("utf8");
      if (!value.startsWith("encrypted:")) throw new Error("corrupt");
      return Buffer.from(value.slice("encrypted:".length), "base64").toString("utf8");
    },
    encryptString(plainText: string) {
      return Buffer.from(`encrypted:${Buffer.from(plainText).toString("base64")}`);
    },
    getSelectedStorageBackend() {
      return backend;
    },
    isEncryptionAvailable() {
      return available;
    }
  };
}
