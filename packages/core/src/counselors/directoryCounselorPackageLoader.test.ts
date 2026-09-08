// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import {
  CounselorPackageRegistry,
  builtinCounselorPackages,
  counselorPackageRegistry
} from "@shared/index";
import {
  createCounselorPackageContentHash,
  loadDirectoryCounselorPackage,
  resolvePackageResourcePath
} from "./directoryCounselorPackageLoader";
import {
  getCounselingDialogueScenePrompt,
  getCounselorCorePrompt,
  getCounselorVoicePrompt
} from "../prompts/counselorPromptRegistry";
import { createCounselingPromptSnapshot } from "../counseling/conversation/promptSnapshot";
import { buildCounselingMessages } from "../counseling/conversation/contextBuilder";

const temporaryDirectories: string[] = [];
const registeredPackageIds: string[] = [];

afterEach(() => {
  for (const packageId of registeredPackageIds.splice(0)) {
    counselorPackageRegistry.unregister(packageId);
  }
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("directory counselor package loader", () => {
  it("loads an external package and preserves prompt, safety, and snapshot ordering", () => {
    const packageId = "community-listener-test";
    const packageDirectory = createPackageDirectory(packageId);
    loadDirectoryCounselorPackage(packageDirectory);
    registeredPackageIds.push(packageId);

    expect(getCounselorCorePrompt(packageId, "en-US")).toBe("# Community Listener Core\n\nListen carefully.");
    expect(getCounselingDialogueScenePrompt(packageId, "en-US")).toContain("Community Listener Dialogue");

    const snapshot = createCounselingPromptSnapshot({
      counselorId: packageId,
      modelName: "test-model",
      locale: "en-US",
      createdAt: "2026-08-07T00:00:00.000Z"
    });
    expect(snapshot).toMatchObject({
      version: 5,
      counselorId: packageId,
      counselorPackageVersion: "1.0.0",
      counselorCorePrompt: expect.stringContaining("Community Listener Core"),
      counselorVoicePrompt: "",
      counselingTaskPrompt: expect.stringContaining("Community Listener Dialogue"),
      promptContentHash: expect.stringMatching(/^fnv1a32:/)
    });

    const messages = buildCounselingMessages({
      counselorId: packageId,
      teamId: "one-way-mirror",
      promptSnapshot: snapshot,
      basicProfile: "Preferred name: River",
      consultationMemo: "# Consultation memo\n\nKeep the pace gentle.",
      messages: [{
        id: "m1",
        sessionId: "external-session",
        role: "user",
        content: "I would like to slow down.",
        createdAt: "2026-08-07T00:01:00.000Z",
        status: "sent"
      }]
    });
    expect(messages.map((message) => message.id)).toEqual([
      `system-${packageId}`,
      "system-basic-profile",
      "system-consultation-memo",
      "m1"
    ]);
    expect(messages[0].content.indexOf("Community Listener Core")).toBeLessThan(
      messages[0].content.indexOf("Realtime Counseling Safety Principles")
    );
    expect(messages[0].content.indexOf("Shared Counseling Values")).toBeLessThan(
      messages[0].content.indexOf("Counseling Ethics | Professional Relationship and AI Boundaries")
    );
    expect(messages[0].content.indexOf("Counseling Ethics | Professional Relationship and AI Boundaries")).toBeLessThan(
      messages[0].content.indexOf("Community Listener Dialogue")
    );
    expect(messages[0].content.indexOf("Community Listener Dialogue")).toBeLessThan(
      messages[0].content.lastIndexOf("# Realtime Counseling Safety Principles")
    );
    expect(messages.at(-1)?.content).toBe("I would like to slow down.");
  });

  it("can validate a package with an isolated registry without changing app state", () => {
    const packageDirectory = createPackageDirectory("isolated-listener-test");
    const registry = new CounselorPackageRegistry();
    const registration = loadDirectoryCounselorPackage(packageDirectory, { registry });

    expect(registry.list()).toHaveLength(1);
    expect(registration.source).toMatchObject({ kind: "directory" });
    expect(counselorPackageRegistry.get("isolated-listener-test")).toBeUndefined();
  });

  it("fingerprints the manifest and all declared resources", () => {
    const packageDirectory = createPackageDirectory("fingerprinted-listener-test");
    const registration = loadDirectoryCounselorPackage(packageDirectory, {
      registry: new CounselorPackageRegistry()
    });
    const initialHash = createCounselorPackageContentHash(packageDirectory, registration.manifest);

    writeText(resolve(packageDirectory, "prompts/core-en.md"), "# Changed core\n");

    expect(initialHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(createCounselorPackageContentHash(packageDirectory, registration.manifest)).not.toBe(initialHash);
  });

  it("validates and loads every declared counselor voice resource", () => {
    const packageId = "voiced-listener-test";
    const packageDirectory = createPackageDirectory(packageId);
    updateManifest(packageDirectory, (manifest) => {
      manifest.prompts.counselorVoice = {
        "zh-CN": "package://prompts/voice-zh.md",
        "en-US": "package://prompts/voice-en.md"
      };
    });

    expect(() => loadDirectoryCounselorPackage(packageDirectory, {
      registry: new CounselorPackageRegistry()
    })).toThrow(/voice-zh\.md/u);

    writeText(resolve(packageDirectory, "prompts/voice-zh.md"), "# 社区倾听者语言风格\n\n温和、简洁。\n");
    writeText(resolve(packageDirectory, "prompts/voice-en.md"), "# Community Listener Voice\n\nWarm and concise.\n");
    loadDirectoryCounselorPackage(packageDirectory);
    registeredPackageIds.push(packageId);

    expect(getCounselorVoicePrompt(packageId, "zh-CN")).toContain("温和、简洁");
    expect(getCounselorVoicePrompt(packageId, "en-US")).toContain("Warm and concise");
  });

  it("rejects symlink resources that escape the package directory", () => {
    const packageDirectory = createPackageDirectory("escape-listener-test");
    const outsideDirectory = createTemporaryDirectory();
    const outsidePrompt = resolve(outsideDirectory, "outside.md");
    writeFileSync(outsidePrompt, "private material", "utf8");
    const linkedPrompt = resolve(packageDirectory, "prompts", "core-en.md");
    rmSync(linkedPrompt);
    symlinkSync(outsidePrompt, linkedPrompt);

    expect(() => loadDirectoryCounselorPackage(packageDirectory, {
      registry: new CounselorPackageRegistry()
    })).toThrow("escapes package directory");
    expect(() => resolvePackageResourcePath(packageDirectory, "package://../outside.md")).toThrow("Unsafe");
  });

  it("appends package safety policies after Ling's mandatory realtime policy", () => {
    const packageId = "additional-safety-listener-test";
    const packageDirectory = createPackageDirectory(packageId);
    updateManifest(packageDirectory, (manifest) => {
      manifest.safety.additionalPolicies = ["package://policies/community-boundary.md"];
    });
    writeText(
      resolve(packageDirectory, "policies/community-boundary.md"),
      "# Community Boundary\n\nNever claim to be a licensed local professional.\n"
    );
    loadDirectoryCounselorPackage(packageDirectory);
    registeredPackageIds.push(packageId);

    const result = buildCounselingMessages({
      counselorId: packageId,
      teamId: "one-way-mirror",
      messages: []
    });
    const safetyPrompt = result[0]?.content ?? "";

    expect(safetyPrompt).toContain("实时咨询安全原则");
    expect(safetyPrompt).toContain("Community Boundary");
    expect(safetyPrompt.indexOf("实时咨询安全原则")).toBeLessThan(
      safetyPrompt.indexOf("Community Boundary")
    );
  });

  it("rejects packages whose required safety baseline is newer than the engine", () => {
    const packageId = "future-safety-listener-test";
    const packageDirectory = createPackageDirectory(packageId);
    updateManifest(packageDirectory, (manifest) => {
      manifest.safety.minimumPolicyVersion = "2";
    });
    expect(() => loadDirectoryCounselorPackage(packageDirectory)).toThrow(
      "requires safety policy 2, but Ling provides 1"
    );
    expect(counselorPackageRegistry.get(packageId)).toBeUndefined();
  });
});

function createPackageDirectory(packageId: string) {
  const directory = createTemporaryDirectory();
  const manifest = structuredClone(builtinCounselorPackages[0]);
  manifest.id = packageId;
  manifest.publisher = { name: "Community Example" };
  manifest.license = { prompts: "CC0-1.0", assets: "CC0-1.0" };
  manifest.localizations["zh-CN"] = {
    ...manifest.localizations["zh-CN"],
    name: "社区倾听者",
    title: "社区示例咨询师"
  };
  manifest.localizations["en-US"] = {
    ...manifest.localizations["en-US"],
    name: "Community Listener",
    title: "Community example counselor"
  };
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

  writeJson(resolve(directory, "manifest.json"), manifest);
  writeText(resolve(directory, "prompts/core-zh.md"), "# 社区倾听者核心\n\n认真倾听。\n");
  writeText(resolve(directory, "prompts/core-en.md"), "# Community Listener Core\n\nListen carefully.\n");
  writeText(resolve(directory, "prompts/dialogue-zh.md"), "# 当前场景｜社区倾听者实时咨询\n");
  writeText(resolve(directory, "prompts/dialogue-en.md"), "# Current Scene | Community Listener Dialogue\n");
  for (const filename of ["avatar.png", "portrait.png", "room.png"]) {
    writeBinary(resolve(directory, "assets", filename), onePixelPng);
  }
  return directory;
}

function createTemporaryDirectory() {
  const directory = mkdtempSync(resolve(tmpdir(), "ling-counselor-package-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

function writeJson(path: string, value: unknown) {
  writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function updateManifest(
  packageDirectory: string,
  update: (manifest: typeof builtinCounselorPackages[number]) => void
) {
  const manifestPath = resolve(packageDirectory, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as typeof builtinCounselorPackages[number];
  update(manifest);
  writeJson(manifestPath, manifest);
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
