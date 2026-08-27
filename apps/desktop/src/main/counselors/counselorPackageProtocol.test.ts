// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { counselorPackageRegistry } from "@shared/index";
import { loadDirectoryCounselorPackage } from "../../../../../packages/core/src/counselors/directoryCounselorPackageLoader";

vi.mock("electron", () => ({
  protocol: { handle: vi.fn() }
}));

import {
  COUNSELOR_PACKAGE_RESOURCE_SCHEME,
  resolveCounselorPackageVisualRequest
} from "./counselorPackageProtocol";

const temporaryDirectories: string[] = [];

afterEach(() => {
  if (counselorPackageRegistry.get("protocol-listener-test")) {
    counselorPackageRegistry.unregister("protocol-listener-test");
  }
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("counselor package visual protocol", () => {
  it("resolves only a declared visual without returning the package root", () => {
    const parentDirectory = mkdtempSync(resolve(tmpdir(), "ling-package-protocol-test-"));
    temporaryDirectories.push(parentDirectory);
    const packageDirectory = resolve(parentDirectory, "package");
    const scaffold = spawnSync(process.execPath, [
      resolve(process.cwd(), "scripts/create-counselor-package.mjs"),
      packageDirectory,
      "protocol-listener-test"
    ], { encoding: "utf8" });
    expect(scaffold.status, scaffold.stderr).toBe(0);
    loadDirectoryCounselorPackage(packageDirectory);

    const result = resolveCounselorPackageVisualRequest(
      `${COUNSELOR_PACKAGE_RESOURCE_SCHEME}://protocol-listener-test/portrait`
    );

    expect(result).toMatchObject({
      packageId: "protocol-listener-test",
      visualKey: "portrait",
      mimeType: "image/png"
    });
    expect(result.filePath).toBe(realpathSync(resolve(packageDirectory, "assets/portrait.png")));
    expect(result).not.toHaveProperty("rootDirectory");
  });

  it("rejects undeclared keys, query parameters, and builtin packages", () => {
    expect(() => resolveCounselorPackageVisualRequest(
      `${COUNSELOR_PACKAGE_RESOURCE_SCHEME}://chengling/portrait`
    )).toThrow("Only directory package visuals");
    expect(() => resolveCounselorPackageVisualRequest(
      `${COUNSELOR_PACKAGE_RESOURCE_SCHEME}://chengling/prompt`
    )).toThrow("Invalid counselor package visual request");
    expect(() => resolveCounselorPackageVisualRequest(
      `${COUNSELOR_PACKAGE_RESOURCE_SCHEME}://chengling/portrait?path=secret`
    )).toThrow("Invalid counselor package visual request");
  });
});
