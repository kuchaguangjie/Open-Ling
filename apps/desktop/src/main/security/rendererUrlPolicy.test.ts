// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: {
    getAppPath: () => "/ling"
  }
}));

import { isSafeExternalUrl, isTrustedRendererUrl } from "./rendererUrlPolicy";

describe("rendererUrlPolicy", () => {
  it("only trusts the packaged renderer entry file", () => {
    expect(isTrustedRendererUrl("file:///ling/dist/index.html")).toBe(true);
    expect(isTrustedRendererUrl("file:///ling/dist/other.html")).toBe(false);
    expect(isTrustedRendererUrl("file:///etc/passwd")).toBe(false);
  });

  it("does not trust arbitrary http origins when no dev server is configured", () => {
    expect(isTrustedRendererUrl("https://example.com/")).toBe(false);
    expect(isTrustedRendererUrl("http://localhost:45174/")).toBe(false);
  });

  it("opens only http and https URLs externally", () => {
    expect(isSafeExternalUrl("https://platform.deepseek.com/api_keys")).toBe(true);
    expect(isSafeExternalUrl("http://example.com/help")).toBe(true);
    expect(isSafeExternalUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
  });
});
