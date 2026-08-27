// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { CounselorPackageRegistry } from "@shared/index";
import { loadDirectoryCounselorPackage } from "./directoryCounselorPackageLoader";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("counselor package scaffold", () => {
  it("creates a complete package that the production loader accepts", () => {
    const parentDirectory = mkdtempSync(resolve(tmpdir(), "ling-package-scaffold-test-"));
    temporaryDirectories.push(parentDirectory);
    const packageDirectory = resolve(parentDirectory, "generated-package");
    const scriptPath = resolve(process.cwd(), "scripts/create-counselor-package.mjs");

    const scaffold = spawnSync(process.execPath, [scriptPath, packageDirectory, "generated-listener"], {
      encoding: "utf8"
    });

    expect(scaffold.status, scaffold.stderr).toBe(0);
    const registration = loadDirectoryCounselorPackage(packageDirectory, {
      registry: new CounselorPackageRegistry()
    });
    expect(registration.manifest).toMatchObject({
      id: "generated-listener",
      version: "0.1.0"
    });
    expect(registration.manifest).not.toHaveProperty("capabilities");
    expect(registration.manifest).not.toHaveProperty("memory");
  });

  it("refuses to overwrite an existing target directory", () => {
    const packageDirectory = mkdtempSync(resolve(tmpdir(), "ling-package-existing-test-"));
    temporaryDirectories.push(packageDirectory);
    const scriptPath = resolve(process.cwd(), "scripts/create-counselor-package.mjs");

    const scaffold = spawnSync(process.execPath, [scriptPath, packageDirectory, "generated-listener"], {
      encoding: "utf8"
    });

    expect(scaffold.status).toBe(1);
    expect(scaffold.stderr).toContain("no files were overwritten");
  });
});
