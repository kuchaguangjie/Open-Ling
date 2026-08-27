// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { CounselorPackageRegistry } from "@shared/index";
import {
  installCounselorPackageFromDirectory,
  removeInstalledCounselorPackage,
  updateCounselorPackageFromDirectory
} from "./counselorPackageInstaller";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("counselor package installer", () => {
  it("copies only declared package files and can remove the managed installation", () => {
    const root = createTemporaryDirectory();
    const source = resolve(root, "source");
    const installed = resolve(root, "installed");
    scaffoldPackage(source, "installed-listener");
    setCounselorVoiceResources(source, "# 语言风格 v1\n");
    const registry = new CounselorPackageRegistry();

    const registration = installCounselorPackageFromDirectory(source, installed, registry);

    expect(registration.source).toMatchObject({
      kind: "directory",
      rootDirectory: resolve(realpathSync(installed), "installed-listener")
    });
    expect(existsSync(resolve(installed, "installed-listener/manifest.json"))).toBe(true);
    expect(existsSync(resolve(installed, "installed-listener/prompts/core-zh.md"))).toBe(true);
    expect(readFileSync(resolve(installed, "installed-listener/prompts/voice-zh.md"), "utf8")).toContain("语言风格 v1");
    expect(() => installCounselorPackageFromDirectory(source, installed, registry)).toThrow("already installed");

    removeInstalledCounselorPackage("installed-listener", installed, registry);
    expect(registry.get("installed-listener")).toBeUndefined();
    expect(existsSync(resolve(installed, "installed-listener"))).toBe(false);
  });

  it("does not copy undeclared files from the source directory", () => {
    const root = createTemporaryDirectory();
    const source = resolve(root, "source");
    const installed = resolve(root, "installed");
    scaffoldPackage(source, "clean-listener");
    writeFileSync(resolve(source, "prompt-candidates.md"), "private candidate", "utf8");

    installCounselorPackageFromDirectory(source, installed, new CounselorPackageRegistry());

    expect(existsSync(resolve(installed, "clean-listener/prompt-candidates.md"))).toBe(false);
  });

  it("atomically replaces an installed package only with a newer version", () => {
    const root = createTemporaryDirectory();
    const original = resolve(root, "original");
    const update = resolve(root, "update");
    const installed = resolve(root, "installed");
    scaffoldPackage(original, "versioned-listener");
    scaffoldPackage(update, "versioned-listener");
    setCounselorVoiceResources(original, "# 语言风格 v1\n");
    setCounselorVoiceResources(update, "# 语言风格 v2\n");
    setPackageVersion(update, "0.2.0");
    writeFileSync(resolve(update, "prompts/core-zh.md"), "# 新版专业提示词\n", "utf8");
    writeFileSync(resolve(update, "prompt-candidates.md"), "private candidate", "utf8");
    const registry = new CounselorPackageRegistry();
    installCounselorPackageFromDirectory(original, installed, registry);

    const result = updateCounselorPackageFromDirectory(update, installed, registry);

    expect(result.previousVersion).toBe("0.1.0");
    expect(result.registration.manifest.version).toBe("0.2.0");
    expect(registry.require("versioned-listener").manifest.version).toBe("0.2.0");
    expect(readFileSync(resolve(installed, "versioned-listener/prompts/core-zh.md"), "utf8")).toContain("新版专业提示词");
    expect(readFileSync(resolve(installed, "versioned-listener/prompts/voice-zh.md"), "utf8")).toContain("语言风格 v2");
    expect(existsSync(resolve(installed, "versioned-listener/prompt-candidates.md"))).toBe(false);
    expect(() => updateCounselorPackageFromDirectory(original, installed, registry)).toThrow("must be newer");
  });
});

function createTemporaryDirectory() {
  const directory = mkdtempSync(resolve(tmpdir(), "ling-package-installer-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

function scaffoldPackage(target: string, id: string) {
  const scaffold = spawnSync(process.execPath, [
    resolve(process.cwd(), "scripts/create-counselor-package.mjs"),
    target,
    id
  ], { encoding: "utf8" });
  expect(scaffold.status, scaffold.stderr).toBe(0);
}

function setPackageVersion(directory: string, version: string) {
  const manifestPath = resolve(directory, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { version: string };
  manifest.version = version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function setCounselorVoiceResources(directory: string, content: string) {
  const manifestPath = resolve(directory, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    prompts: { counselorVoice?: Record<string, string> };
  };
  manifest.prompts.counselorVoice = {
    "zh-CN": "package://prompts/voice-zh.md"
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeFileSync(resolve(directory, "prompts/voice-zh.md"), content, "utf8");
}
