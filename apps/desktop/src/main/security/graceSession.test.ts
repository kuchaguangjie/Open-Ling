// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readGraceSession, writeGraceSession } from "./graceSession.js";

const encryption = {
  encryptString(value: string) {
    return Buffer.from(`protected:${value}`, "utf8");
  },
  decryptString(value: Buffer) {
    return value.toString("utf8").replace(/^protected:/u, "");
  },
  isEncryptionAvailable() {
    return true;
  }
};

describe("grace session", () => {
  it("writes and reads the protected data key", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-grace-session-"));
    const filePath = join(directory, "security", "grace-session.json");
    try {
      await writeGraceSession(filePath, Buffer.from("secret-key"), encryption, 60_000);
      await expect(readGraceSession(filePath, encryption)).resolves.toEqual(Buffer.from("secret-key"));
      expect(await readFile(filePath, "utf8")).not.toContain("secret-key");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("removes malformed session state instead of failing every startup", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-grace-session-"));
    const filePath = join(directory, "grace-session.json");
    try {
      await writeFile(filePath, "{broken", { mode: 0o600 });
      await expect(readGraceSession(filePath, encryption)).resolves.toBeNull();
      await expect(readFile(filePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
