import { describe, expect, it } from "vitest";
import {
  COUNSELOR_PACKAGE_ENGINE_VERSION,
  compareCounselorPackageVersions,
  isCounselorEngineCompatible,
  isSupportedCounselorEngineRange
} from "./counselorPackageCompatibility.js";

describe("counselor package engine compatibility", () => {
  it("accepts the supported intersection range used by Ling packages", () => {
    expect(COUNSELOR_PACKAGE_ENGINE_VERSION).toBe("1.0.0");
    expect(isSupportedCounselorEngineRange(">=1.0.0 <2.0.0")).toBe(true);
    expect(isCounselorEngineCompatible(">=1.0.0 <2.0.0")).toBe(true);
  });

  it("rejects future, expired, and malformed ranges", () => {
    expect(isCounselorEngineCompatible(">=2.0.0 <3.0.0")).toBe(false);
    expect(isCounselorEngineCompatible("<1.0.0")).toBe(false);
    expect(isSupportedCounselorEngineRange("^1.0.0")).toBe(false);
    expect(isSupportedCounselorEngineRange("latest")).toBe(false);
  });

  it("supports exact and bounded comparisons without a third-party semver runtime", () => {
    expect(isCounselorEngineCompatible("1.0.0")).toBe(true);
    expect(isCounselorEngineCompatible(">=0.9.0 <=1.0.0")).toBe(true);
    expect(isCounselorEngineCompatible(">1.0.0")).toBe(false);
  });

  it("orders release and prerelease package versions", () => {
    expect(compareCounselorPackageVersions("1.1.0", "1.0.9")).toBeGreaterThan(0);
    expect(compareCounselorPackageVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareCounselorPackageVersions("1.0.0", "1.0.0-rc.2")).toBeGreaterThan(0);
    expect(compareCounselorPackageVersions("1.0.0-rc.2", "1.0.0-rc.10")).toBeLessThan(0);
  });
});
