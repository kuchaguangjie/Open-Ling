import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertLingDevSourceBranch,
  parseGitWorktreePaths,
  pathExists,
  replaceInstalledApp
} from "./lingDevDeployment.mjs";

describe("Ling Dev deployment", () => {
  it("rejects updates from feature branches", () => {
    expect(() => assertLingDevSourceBranch("feat/example")).toThrow("只能从 main 更新");
    expect(() => assertLingDevSourceBranch("main")).not.toThrow();
  });

  it("reads worktree paths containing spaces from porcelain output", () => {
    expect(parseGitWorktreePaths("worktree /tmp/Ling main\nHEAD abc\n\nworktree /tmp/Ling feature\nHEAD def\n")).toEqual([
      "/tmp/Ling main",
      "/tmp/Ling feature"
    ]);
  });

  it("replaces a legacy worktree symlink with a standalone app bundle", () => {
    const root = mkdtempSync(join(tmpdir(), "ling-dev-deployment-"));
    const oldBundle = join(root, "old", "Ling Dev.app");
    const newBundle = join(root, "new", "Ling Dev.app");
    const installedBundle = join(root, "Applications", "Ling Dev.app");
    mkdirSync(oldBundle, { recursive: true });
    mkdirSync(newBundle, { recursive: true });
    mkdirSync(join(root, "Applications"), { recursive: true });
    writeFileSync(join(oldBundle, "version.txt"), "old", "utf8");
    writeFileSync(join(newBundle, "version.txt"), "new", "utf8");
    symlinkSync(oldBundle, installedBundle, "dir");

    replaceInstalledApp({
      sourceAppPath: newBundle,
      stagingSuffix: "test",
      targetAppPath: installedBundle
    });

    expect(readFileSync(join(installedBundle, "version.txt"), "utf8")).toBe("new");
    expect(pathExists(join(root, "Applications", ".Ling Dev.app.previous"))).toBe(false);
  });
});
