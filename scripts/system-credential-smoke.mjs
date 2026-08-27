import { app, safeStorage } from "electron";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createLingDatabase, createSecretRepository } from "../dist-electron/packages/database/src/index.js";
import { createSystemSecretRepository } from "../dist-electron/apps/desktop/src/main/security/systemSecretStore.js";

console.log("Starting Ling native system credential smoke test.");
app.whenReady().then(run).catch((error) => {
  console.error("Ling native system credential smoke test failed.", error instanceof Error ? error.message : error);
  app.exit(1);
});

async function run() {
  let directory;
  let db;
  let exitCode = 0;

  try {
    console.log("Electron is ready; checking system encryption.");
    directory = await mkdtemp(join(tmpdir(), "ling-native-credential-smoke-"));
    db = createLingDatabase({ path: join(directory, "ling.sqlite") });
    const legacy = createSecretRepository(db);
    const credentialPath = join(directory, "credentials", "api-key.safe");
    const repository = createSystemSecretRepository({
      credentialPath,
      encryption: safeStorage,
      legacy
    });
    const smokeKey = `ling-native-smoke-${randomUUID()}`;

    await legacy.saveApiKey(smokeKey);
    if (!(await repository.migrateLegacyApiKey())) {
      throw new Error("Legacy credential migration did not run.");
    }
    if (await repository.readApiKey() !== smokeKey) {
      throw new Error("Native credential round-trip failed.");
    }
    if ((await readFile(credentialPath)).includes(Buffer.from(smokeKey))) {
      throw new Error("Native credential file contains plaintext.");
    }
    if (await legacy.hasApiKey()) {
      throw new Error("Legacy SQLite credential was not removed.");
    }

    await repository.deleteApiKey();
    if (await repository.hasApiKey()) {
      throw new Error("Native credential deletion failed.");
    }
    console.log("Ling native system credential smoke test passed.");
  } catch (error) {
    console.error("Ling native system credential smoke test failed.", error instanceof Error ? error.message : error);
    exitCode = 1;
  } finally {
    db?.close();
    if (directory) await rm(directory, { force: true, recursive: true });
  }

  app.exit(exitCode);
}
