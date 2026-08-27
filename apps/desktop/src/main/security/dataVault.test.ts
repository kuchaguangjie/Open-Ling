// @vitest-environment node
import PlainDatabase from "better-sqlite3";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDataVault,
  createDeviceProtectedDataVault,
  loadDataVault,
  openEncryptedDatabase
} from "./dataVault.js";

describe("encrypted data vault", () => {
  it("initializes first-run storage with the operating system keychain", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-data-vault-"));
    const databasePath = join(directory, "ling.sqlite");
    const vaultPath = join(directory, "security", "vault.json");
    const deviceEncryption = {
      isEncryptionAvailable: () => true,
      encryptString: (value: string) => Buffer.from(`device:${value}`, "utf8"),
      decryptString: (value: Buffer) => value.toString("utf8").replace(/^device:/u, "")
    };

    try {
      const created = await createDeviceProtectedDataVault({ databasePath, vaultPath, encryption: deviceEncryption });
      expect(created.vault.isPasswordEnabled()).toBe(false);
      await expect(created.vault.unlockWithDevice(deviceEncryption)).resolves.toEqual(created.dataKey);
      const db = openEncryptedDatabase(databasePath, created.dataKey);
      expect(db.prepare("SELECT count(*) AS count FROM sqlite_master").get()).toEqual(expect.objectContaining({ count: expect.any(Number) }));
      db.close();
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("upgrades an existing plaintext database without losing local data", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-data-vault-"));
    const databasePath = join(directory, "ling.sqlite");
    const vaultPath = join(directory, "security", "vault.json");
    const plaintextDb = new PlainDatabase(databasePath);
    plaintextDb.exec("CREATE TABLE local_note (content TEXT NOT NULL); INSERT INTO local_note VALUES ('保留的会谈');");
    plaintextDb.close();

    try {
      const vault = await createDataVault({
        databasePath,
        vaultPath,
        password: "1234",
        recoveryPhrase: "ABCD-EFGH-JKLM-NPQR"
      });
      const dataKey = await vault.unlock("1234");
      const encryptedDb = openEncryptedDatabase(databasePath, dataKey);
      expect(encryptedDb.prepare("SELECT content FROM local_note").get()).toEqual({ content: "保留的会谈" });
      encryptedDb.close();

      const rawDatabase = await readFile(databasePath);
      expect(rawDatabase.subarray(0, 16).toString("utf8")).not.toBe("SQLite format 3\u0000");
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("keeps recovery-code password reset usable after a restart", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-data-vault-"));
    const databasePath = join(directory, "ling.sqlite");
    const vaultPath = join(directory, "security", "vault.json");

    try {
      await createDataVault({
        databasePath,
        vaultPath,
        password: "1234",
        recoveryPhrase: "ABCD-EFGH-JKLM-NPQR"
      });
      const reloaded = await loadDataVault(vaultPath, databasePath);
      expect(reloaded).not.toBeNull();
      await expect(reloaded!.unlock("9999")).rejects.toThrow();
      const dataKey = await reloaded!.recover("  abcd efgh-jklm-npqr  ", "5678");
      const encryptedDb = openEncryptedDatabase(databasePath, dataKey);
      expect(encryptedDb.prepare("SELECT count(*) AS count FROM sqlite_master").get()).toEqual(expect.objectContaining({ count: expect.any(Number) }));
      encryptedDb.close();
      await expect(reloaded!.unlock("5678")).resolves.toEqual(dataKey);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("can disable and re-enable startup password verification without decrypting the database", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-data-vault-"));
    const databasePath = join(directory, "ling.sqlite");
    const vaultPath = join(directory, "security", "vault.json");
    const deviceEncryption = {
      isEncryptionAvailable: () => true,
      encryptString: (value: string) => Buffer.from(`device:${value}`, "utf8"),
      decryptString: (value: Buffer) => value.toString("utf8").replace(/^device:/u, "")
    };

    try {
      const vault = await createDataVault({
        databasePath,
        vaultPath,
        password: "123456",
        recoveryPhrase: "ABCD-EFGH-JKLM-NPQR"
      });
      const originalKey = await vault.unlock("123456");

      await expect(vault.disablePassword("000000", deviceEncryption)).rejects.toThrow();
      await expect(vault.disablePassword("123456", deviceEncryption)).resolves.toEqual(originalKey);
      expect(vault.isPasswordEnabled()).toBe(false);

      const reloaded = await loadDataVault(vaultPath, databasePath);
      expect(reloaded?.isPasswordEnabled()).toBe(false);
      await expect(reloaded!.unlockWithDevice(deviceEncryption)).resolves.toEqual(originalKey);

      await reloaded!.enablePassword(originalKey, "654321", "WXYZ-9876-MNOP-5432");
      expect(reloaded?.isPasswordEnabled()).toBe(true);
      await expect(reloaded!.unlock("123456")).rejects.toThrow();
      await expect(reloaded!.unlock("654321")).resolves.toEqual(originalKey);

      const encryptedDb = openEncryptedDatabase(databasePath, originalKey);
      expect(encryptedDb.prepare("SELECT count(*) AS count FROM sqlite_master").get()).toEqual(expect.objectContaining({ count: expect.any(Number) }));
      encryptedDb.close();
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });
});
