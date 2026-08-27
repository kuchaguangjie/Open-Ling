import { describe, expect, it } from "vitest";
import { builtinCounselorPackages } from "./builtinCounselorPackages.js";
import {
  CounselorPackageRegistry,
  createCounselorPackageRegistration
} from "./counselorPackageRegistry.js";

describe("CounselorPackageRegistry", () => {
  it("registers immutable manifests and rejects duplicate IDs", () => {
    const registry = new CounselorPackageRegistry();
    const manifest = structuredClone(builtinCounselorPackages[0]);
    manifest.id = "community-listener";
    const registration = createCounselorPackageRegistration(manifest, {
      kind: "directory",
      rootDirectory: "/packages/community-listener"
    });

    registry.register(registration);

    expect(registry.require("community-listener").manifest.version).toBe("1.0.0");
    expect(Object.isFrozen(registry.require("community-listener").manifest)).toBe(true);
    expect(() => registry.register(registration)).toThrow("already registered");
  });

  it("does not allow built-in packages to be unregistered", () => {
    const registry = new CounselorPackageRegistry([
      createCounselorPackageRegistration(builtinCounselorPackages[0], { kind: "builtin" })
    ]);

    expect(() => registry.unregister("chengling")).toThrow("cannot be unregistered");
  });

  it("rejects malformed safety/localization declarations and package-controlled system capabilities", () => {
    const manifest = structuredClone(builtinCounselorPackages[0]);
    manifest.id = "invalid-package";
    manifest.safety.additionalPolicies = ["package://../unsafe.md"];
    manifest.localizations["en-US"].opening.returning = [];
    const manifestWithSystemFields = manifest as typeof manifest & Record<string, unknown>;
    manifestWithSystemFields.memory = { consultationMemoAccess: "none" };
    manifestWithSystemFields.capabilities = ["conversation"];
    const registry = new CounselorPackageRegistry();

    let message = "";
    try {
      registry.register(createCounselorPackageRegistration(manifest, {
        kind: "directory",
        rootDirectory: "/tmp/invalid-package"
      }));
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("opening.returning");
    expect(message).toContain("additionalPolicies");
    expect(message).toContain("memory is managed by Ling");
    expect(message).toContain("capabilities are fixed by Ling");
  });

  it("rejects packages that target an incompatible Ling counselor engine", () => {
    const manifest = structuredClone(builtinCounselorPackages[0]);
    manifest.id = "future-engine-package";
    manifest.engineCompatibility = ">=2.0.0 <3.0.0";
    const registry = new CounselorPackageRegistry();

    expect(() => registry.register(createCounselorPackageRegistration(manifest, {
      kind: "directory",
      rootDirectory: "/tmp/future-engine-package"
    }))).toThrow("does not include Ling counselor engine 1.0.0");
  });
});
