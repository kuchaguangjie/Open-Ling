import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SafeStorage } from "electron";

interface GraceSessionFile {
  version: 1;
  dataKey: string;
  expiresAt: number;
}

export async function writeGraceSession(
  filePath: string,
  dataKey: Buffer,
  encryption: Pick<SafeStorage, "encryptString">,
  ttlMs: number
) {
  await mkdir(dirname(filePath), { mode: 0o700, recursive: true });
  const value: GraceSessionFile = {
    version: 1,
    dataKey: encryption.encryptString(dataKey.toString("base64")).toString("base64"),
    expiresAt: Date.now() + ttlMs
  };
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temporaryPath, JSON.stringify(value, null, 2), { mode: 0o600 });
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function readGraceSession(
  filePath: string,
  encryption: Pick<SafeStorage, "decryptString" | "isEncryptionAvailable">
): Promise<Buffer | null> {
  if (!encryption.isEncryptionAvailable()) return null;
  const raw = await readFile(filePath, "utf8").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  });
  if (!raw) return null;
  let parsed: Partial<GraceSessionFile>;
  try {
    parsed = JSON.parse(raw) as Partial<GraceSessionFile>;
  } catch {
    await clearGraceSession(filePath);
    return null;
  }
  if (parsed.version !== 1 || typeof parsed.dataKey !== "string" || typeof parsed.expiresAt !== "number") {
    await clearGraceSession(filePath);
    return null;
  }
  if (parsed.expiresAt <= Date.now()) {
    await clearGraceSession(filePath);
    return null;
  }
  try {
    return Buffer.from(encryption.decryptString(Buffer.from(parsed.dataKey, "base64")), "base64");
  } catch {
    await clearGraceSession(filePath);
    return null;
  }
}

export async function clearGraceSession(filePath: string) {
  await rm(filePath, { force: true });
}
