// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLingDatabase, createUsageRepository, type LingDatabase } from "../index";

let tempDir: string;
let databasePath: string;
let db: LingDatabase;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "ling-usage-"));
  databasePath = join(tempDir, "ling.sqlite");
  db = createLingDatabase({ path: databasePath });
});

afterEach(() => {
  db.close();
  rmSync(tempDir, { recursive: true, force: true });
});

describe("usage repository", () => {
  it("records model calls and aggregates them by local day, provider, and model", async () => {
    const usage = createUsageRepository(db);
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await usage.record({
      id: "u1",
      providerName: "DeepSeek",
      modelName: "deepseek-v4-flash",
      connectionKind: "remote",
      scope: "counseling",
      inputTokens: 100,
      outputTokens: 50,
      createdAt: now.toISOString()
    });
    await usage.record({
      id: "u2",
      providerName: "DeepSeek",
      modelName: "deepseek-v4-pro",
      connectionKind: "remote",
      scope: "post-session",
      inputTokens: 20,
      outputTokens: 10,
      createdAt: now.toISOString()
    });
    await usage.record({
      id: "u3",
      providerName: "local",
      modelName: "qwen3:8b",
      connectionKind: "local",
      scope: "counseling",
      inputTokens: 5,
      outputTokens: 2,
      createdAt: yesterday.toISOString()
    });

    const days = await usage.listRecentDays(7);
    const today = days.find((day) => day.date === localDateKey(now));
    const previous = days.find((day) => day.date === localDateKey(yesterday));

    expect(today).toBeDefined();
    expect(today?.inputTokens).toBe(120);
    expect(today?.outputTokens).toBe(60);
    const deepseek = today?.providers.find((provider) => provider.providerName === "DeepSeek");
    expect(deepseek?.models).toEqual([
      { modelName: "deepseek-v4-flash", inputTokens: 100, outputTokens: 50 },
      { modelName: "deepseek-v4-pro", inputTokens: 20, outputTokens: 10 }
    ]);

    expect(previous).toBeDefined();
    expect(previous?.providers[0]).toMatchObject({
      providerName: "local",
      connectionKind: "local",
      inputTokens: 5,
      outputTokens: 2
    });
  });
});

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
