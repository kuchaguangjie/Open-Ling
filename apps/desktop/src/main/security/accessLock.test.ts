import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createLingDatabase } from "../../../../../packages/database/src/index.js";
import { createAccessLockRepository, normalizeRecoveryPhrase, validatePassword } from "./accessLock.js";

describe("access lock", () => {
  it("stores verifiers rather than readable passwords or recovery phrases", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-access-lock-"));
    const db = createLingDatabase({ path: join(directory, "ling.sqlite") });
    const repository = createAccessLockRepository(db);
    const password = "an-actual-password";
    const phrase = "先不用急着改变，可以从理解现在的感受开始。";

    try {
      repository.setup(password, phrase);
      const raw = db.prepare<[string], { value: string }>("SELECT value FROM settings WHERE key = ?").get("accessLock")?.value ?? "";
      expect(raw).not.toContain(password);
      expect(raw).not.toContain(phrase);
      expect(repository.verifyPassword(password)).toBe(true);
      expect(repository.verifyPassword("wrong-password")).toBe(false);
    } finally {
      db.close();
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("uses the recovery phrase to replace a forgotten password", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ling-access-lock-"));
    const db = createLingDatabase({ path: join(directory, "ling.sqlite") });
    const repository = createAccessLockRepository(db);
    const phrase = "不用立刻解决全部，先找到下一步。";

    try {
      repository.setup("old-password", phrase);
      expect(repository.recover(` “${phrase}” `, "new-password")).toBe(true);
      expect(repository.verifyPassword("old-password")).toBe(false);
      expect(repository.verifyPassword("new-password")).toBe(true);
      expect(repository.disable("new-password")).toBe(true);
      expect(repository.read()).toBeNull();
    } finally {
      db.close();
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("normalizes copied recovery phrases and requires a usable password", () => {
    expect(normalizeRecoveryPhrase("  ‘先 不用急着’ \n ")).toBe("先不用急着");
    expect(validatePassword("short")).toBe("密码至少需要 8 位。");
    expect(validatePassword("long-enough")).toBeNull();
  });
});
