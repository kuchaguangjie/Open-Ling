import { describe, expect, it } from "vitest";
import {
  builtinCounselorPackages,
  getCounselorPackageLocaleContent,
  requireBuiltinCounselorPackage,
  validateCounselorPackageManifest
} from "./builtinCounselorPackages.js";

describe("builtin counselor packages", () => {
  it("exposes three valid versioned packages", () => {
    expect(builtinCounselorPackages.map((manifest) => manifest.id)).toEqual([
      "chengling",
      "zhouzhou",
      "linleshui"
    ]);
    for (const manifest of builtinCounselorPackages) {
      expect(validateCounselorPackageManifest(manifest)).toEqual({ valid: true, errors: [] });
      expect(manifest.version).toBe("1.0.0");
      expect(manifest.prompts.counselorVoice?.["zh-CN"]).toContain("builtin://prompts/counselor-voices/");
    }
  });

  it("rejects an unknown built-in package without silently becoming Cheng Ling", () => {
    expect(() => requireBuiltinCounselorPackage("unknown")).toThrow("Unknown counselor package");
  });

  it("keeps localized session copy in the package", () => {
    expect(getCounselorPackageLocaleContent("zhouzhou", "zh-CN")?.name).toBe("周舟");
    expect(getCounselorPackageLocaleContent("linleshui", "en-US")?.opening.first[0]).toContain("Lin Leshui");
  });

  it("rejects traversal in a community package resource URI", () => {
    const manifest = structuredClone(builtinCounselorPackages[0]);
    manifest.prompts.counselorCore["zh-CN"] = "package://../private.md";
    const result = validateCounselorPackageManifest(manifest);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("prompts.counselorCore.zh-CN contains an unsafe resource path");
  });
});
