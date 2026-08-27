// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
  CounselorPackageRegistry,
  builtinCounselorPackages,
  counselorPackageRegistry
} from "@shared/index";
import {
  getHostedCounselorVisualUrl,
  registerHostedCounselorPackages
} from "./hostedCounselorPackages";
import { getCounselorVisualAssets } from "../components/counselor/counselorPortraitAssets";
import { getCounselorFlowAssets } from "../flows/consultation/counselorFlowAssets";

afterEach(() => {
  if (counselorPackageRegistry.get("hosted-visual-listener")) {
    counselorPackageRegistry.unregister("hosted-visual-listener");
  }
});

describe("hosted counselor packages", () => {
  it("registers main-process manifests without exposing a directory path", () => {
    const manifest = structuredClone(builtinCounselorPackages[0]);
    manifest.id = "hosted-listener";
    const registry = new CounselorPackageRegistry();

    expect(registerHostedCounselorPackages([manifest], registry)).toHaveLength(1);
    expect(registry.require("hosted-listener").source).toEqual({ kind: "host" });
    expect(registerHostedCounselorPackages([manifest], registry)).toEqual([]);
  });

  it("creates a path-free visual resource URL", () => {
    expect(getHostedCounselorVisualUrl("hosted-listener", "portrait"))
      .toBe("ling-counselor-resource://hosted-listener/portrait");
  });

  it("uses hosted visuals instead of an official counselor fallback", () => {
    const manifest = structuredClone(builtinCounselorPackages[0]);
    manifest.id = "hosted-visual-listener";
    registerHostedCounselorPackages([manifest]);

    expect(getCounselorVisualAssets(manifest.id)).toMatchObject({
      dialogueAvatar: "ling-counselor-resource://hosted-visual-listener/avatar",
      portrait: "ling-counselor-resource://hosted-visual-listener/portrait",
      roomBackground: "ling-counselor-resource://hosted-visual-listener/room"
    });
    expect(getCounselorFlowAssets(manifest.id)).toMatchObject({
      openingRoomBackground: "ling-counselor-resource://hosted-visual-listener/room",
      openingPortraitFrames: {
        neutral: "ling-counselor-resource://hosted-visual-listener/portrait"
      }
    });
  });
});
