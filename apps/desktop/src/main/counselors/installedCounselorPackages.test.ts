// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { CounselorPackageRegistry, builtinCounselorPackages } from "@shared/index";
import { loadInstalledCounselorPackages } from "./installedCounselorPackages";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("installed counselor packages", () => {
  it("treats a missing installation directory as an empty package set", () => {
    const missingDirectory = resolve(createTemporaryDirectory(), "not-created");

    expect(loadInstalledCounselorPackages(missingDirectory, new CounselorPackageRegistry())).toEqual({
      loaded: [],
      diagnostics: []
    });
  });

  it("loads valid directories in stable order and isolates invalid packages", () => {
    const packagesDirectory = createTemporaryDirectory();
    createPackage(packagesDirectory, "z-valid-package");
    createPackage(packagesDirectory, "a-valid-package");
    mkdirSync(resolve(packagesDirectory, "m-invalid-package"));
    writeFileSync(resolve(packagesDirectory, "README.txt"), "ignored", "utf8");
    createPackage(packagesDirectory, ".hidden-package");
    const registry = new CounselorPackageRegistry();

    const result = loadInstalledCounselorPackages(packagesDirectory, registry);

    expect(result.loaded.map(({ manifest }) => manifest.id)).toEqual([
      "a-valid-package",
      "z-valid-package"
    ]);
    expect(registry.list().map(({ manifest }) => manifest.id)).toEqual([
      "a-valid-package",
      "z-valid-package"
    ]);
    expect(result.diagnostics).toEqual([{
      directoryName: "m-invalid-package",
      message: expect.stringContaining("manifest.json")
    }]);
  });
});

function createPackage(packagesDirectory: string, packageId: string) {
  const packageDirectory = resolve(packagesDirectory, packageId);
  const manifest = structuredClone(builtinCounselorPackages[0]);
  manifest.id = packageId;
  manifest.publisher = { name: "Community Test" };
  manifest.license = { prompts: "CC0-1.0", assets: "CC0-1.0" };
  manifest.prompts = {
    counselorCore: {
      "zh-CN": "package://prompts/core-zh.md",
      "en-US": "package://prompts/core-en.md"
    },
    counselingDialogue: {
      "zh-CN": "package://prompts/dialogue-zh.md",
      "en-US": "package://prompts/dialogue-en.md"
    }
  };
  manifest.visuals = {
    avatar: "package://assets/avatar.png",
    portrait: "package://assets/portrait.png",
    room: "package://assets/room.png"
  };
  writeJson(resolve(packageDirectory, "manifest.json"), manifest);
  writeText(resolve(packageDirectory, "prompts/core-zh.md"), "# 核心\n");
  writeText(resolve(packageDirectory, "prompts/core-en.md"), "# Core\n");
  writeText(resolve(packageDirectory, "prompts/dialogue-zh.md"), "# 会谈\n");
  writeText(resolve(packageDirectory, "prompts/dialogue-en.md"), "# Dialogue\n");
  for (const filename of ["avatar.png", "portrait.png", "room.png"]) {
    writeBinary(resolve(packageDirectory, "assets", filename), onePixelPng);
  }
}

function createTemporaryDirectory() {
  const directory = mkdtempSync(resolve(tmpdir(), "ling-installed-package-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

function writeJson(path: string, value: unknown) {
  writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function writeBinary(path: string, content: Buffer) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
