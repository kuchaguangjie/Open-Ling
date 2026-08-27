import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createLingDatabase } from "../../../../../packages/database/src/index.js";
import { createDataVault, openEncryptedDatabase } from "../security/dataVault.js";
import { assertValidLingBackup, createLocalBackup, createLocalBackupFileName, restoreLocalBackup } from "./localDataBackup.js";

describe("localDataBackup", () => {
  it("creates a dated backup without the API key fallback", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-backup-"));
    const databasePath = join(directory, "ling.sqlite");
    const backupPath = join(directory, "profile.ling-backup");
    const db = createLingDatabase({ path: databasePath });
    db.prepare("INSERT INTO secrets (key, value, updated_at) VALUES (?, ?, ?)").run("apiKey", "secret-key", "2026-07-13");

    try {
      expect(createLocalBackupFileName(new Date(2026, 6, 13))).toBe("Ling-本地备份-2026-07-13.ling-backup");
      await createLocalBackup(db, backupPath);
      await assertValidLingBackup(backupPath);
      expect((await readFile(backupPath)).toString()).not.toContain("secret-key");
    } finally {
      db.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("validates a backup before replacing the current database", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-restore-"));
    const databasePath = join(directory, "ling.sqlite");
    const backupPath = join(directory, "restore.ling-backup");
    const db = createLingDatabase({ path: databasePath });
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)").run("test", "before", "2026-07-13");
    await createLocalBackup(db, backupPath);
    db.prepare("UPDATE settings SET value = ? WHERE key = ?").run("after", "test");

    try {
      await restoreLocalBackup({ sourcePath: backupPath, databasePath, closeDatabase: () => db.close() });
      const restored = createLingDatabase({ path: databasePath });
      try {
        expect(restored.prepare<[string], { value: string }>("SELECT value FROM settings WHERE key = ?").get("test")?.value).toBe("before");
      } finally {
        restored.close();
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects a lookalike SQLite file that only contains a sessions table", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-backup-invalid-"));
    const backupPath = join(directory, "lookalike.ling-backup");
    const fake = new Database(backupPath);
    fake.exec("CREATE TABLE sessions (id TEXT)");
    fake.close();

    try {
      await expect(assertValidLingBackup(backupPath)).rejects.toThrow("所选数据库不是由 Ling 创建的本地资料备份");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("validates and restores an encrypted backup on the same device", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-encrypted-backup-"));
    const databasePath = join(directory, "ling.sqlite");
    const backupPath = join(directory, "profile.ling-backup");
    const vault = await createDataVault({
      databasePath,
      vaultPath: join(directory, "security", "vault.json"),
      password: "123456",
      recoveryPhrase: "ABCD-EFGH-JKLM-NPQR"
    });
    const dataKey = await vault.unlock("123456");
    const db = openEncryptedDatabase(databasePath, dataKey);
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)").run("test", "backup", "2026-08-20");

    try {
      await createLocalBackup(db, backupPath, dataKey, vault.getRecoveryRecord());
      await assertValidLingBackup(backupPath, dataKey);
      db.prepare("UPDATE settings SET value = ? WHERE key = ?").run("current", "test");
      await restoreLocalBackup({
        sourcePath: backupPath,
        databasePath,
        dataKey,
        closeDatabase: () => db.close()
      });
      const restored = openEncryptedDatabase(databasePath, dataKey);
      try {
        expect(restored.prepare<[string], { value: string }>("SELECT value FROM settings WHERE key = ?").get("test")?.value).toBe("backup");
      } finally {
        restored.close();
      }
    } finally {
      if (db.open) db.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("uses the original recovery code before replacing data on another device", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-cross-device-backup-"));
    const sourcePath = join(directory, "source.sqlite");
    const targetPath = join(directory, "target.sqlite");
    const backupPath = join(directory, "profile.ling-backup");
    const sourceVault = await createDataVault({
      databasePath: sourcePath,
      vaultPath: join(directory, "source-vault.json"),
      password: "123456",
      recoveryPhrase: "ABCD-EFGH-JKLM-NPQR"
    });
    const targetVault = await createDataVault({
      databasePath: targetPath,
      vaultPath: join(directory, "target-vault.json"),
      password: "654321",
      recoveryPhrase: "WXYZ-2345-6789-ABCD"
    });
    const sourceKey = await sourceVault.unlock("123456");
    const targetKey = await targetVault.unlock("654321");
    const sourceDb = openEncryptedDatabase(sourcePath, sourceKey);
    sourceDb.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)").run("origin", "source", "2026-08-20");
    await createLocalBackup(sourceDb, backupPath, sourceKey, sourceVault.getRecoveryRecord());
    sourceDb.close();
    const targetDb = openEncryptedDatabase(targetPath, targetKey);
    let closeCount = 0;

    try {
      await expect(restoreLocalBackup({
        sourcePath: backupPath,
        databasePath: targetPath,
        dataKey: targetKey,
        closeDatabase: () => { closeCount += 1; targetDb.close(); }
      })).rejects.toThrow("这份备份来自另一台设备");
      expect(closeCount).toBe(0);
      expect(targetDb.open).toBe(true);

      await restoreLocalBackup({
        sourcePath: backupPath,
        databasePath: targetPath,
        dataKey: targetKey,
        recoveryPhrase: "abcd efgh jklm npqr",
        closeDatabase: () => { closeCount += 1; targetDb.close(); }
      });
      expect(closeCount).toBe(1);
      const restored = openEncryptedDatabase(targetPath, targetKey);
      try {
        expect(restored.prepare<[string], { value: string }>("SELECT value FROM settings WHERE key = ?").get("origin")?.value).toBe("source");
      } finally {
        restored.close();
      }
    } finally {
      if (targetDb.open) targetDb.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
