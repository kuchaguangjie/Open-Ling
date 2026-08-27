import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const imagePreloadMocks = vi.hoisted(() => ({
  preloadImagesSequentially: vi.fn(async (_urls: readonly string[]) => undefined),
  preloadImagesWhenIdle: vi.fn(async (_urls: readonly string[]) => undefined)
}));

vi.mock("../../media/imagePreload", () => imagePreloadMocks);

import { preloadLobbyFeatureAssets, preloadLobbyFeatureShellAssets } from "./lobbyFeatureAssets";

describe("waiting-room feature preloading", () => {
  const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
  const loadFont = vi.fn(async (_font: string, _text?: string) => []);

  beforeAll(() => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load: loadFont }
    });
    vi.stubGlobal("requestIdleCallback", (callback: IdleRequestCallback) => {
      callback({ didTimeout: false, timeRemaining: () => 10 });
      return 1;
    });
  });

  beforeEach(() => {
    imagePreloadMocks.preloadImagesSequentially.mockClear();
    imagePreloadMocks.preloadImagesWhenIdle.mockClear();
    loadFont.mockClear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    if (originalFonts) Object.defineProperty(document, "fonts", originalFonts);
    else Reflect.deleteProperty(document, "fonts");
  });

  it("warms the shared paper frame and the three text faces while idle", async () => {
    await preloadLobbyFeatureShellAssets();

    expect(imagePreloadMocks.preloadImagesWhenIdle).toHaveBeenCalledTimes(1);
    const urls = imagePreloadMocks.preloadImagesWhenIdle.mock.calls[0]![0];
    expect(urls).toHaveLength(9);
    expect(urls[0]).toContain("resource-table-paper-blank-v20");
    expect(loadFont).toHaveBeenCalledTimes(3);
    expect(loadFont.mock.calls.map(([font]) => font)).toEqual([
      '400 16px "LXGW ZhenKai"',
      '600 16px "Noto Serif SC"',
      '700 16px "Noto Serif SC"'
    ]);
  });

  it("prioritizes the selected counselor portrait before small profile art", async () => {
    await preloadLobbyFeatureAssets("booking", "zhouzhou");

    const urls = imagePreloadMocks.preloadImagesSequentially.mock.calls[0]![0];
    expect(urls[0]).toContain("zhouzhou-introduction-room-corner");
    expect(urls[1]).toContain("zhouzhou/user-selected");
    expect(urls).toContainEqual(expect.stringContaining("zhouzhou-sunflower"));
  });

  it("starts the bookcase batch with the visible counselor avatar", async () => {
    await preloadLobbyFeatureAssets("bookcase");

    const urls = imagePreloadMocks.preloadImagesSequentially.mock.calls[0]![0];
    expect(urls[0]).toContain("chengling-dialogue-avatar");
    expect(urls).toContainEqual(expect.stringContaining("bookcase-ginkgo"));
    expect(urls).toContainEqual(expect.stringContaining("half-jar-soup"));
  });
});
