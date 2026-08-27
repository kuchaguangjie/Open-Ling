import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockImageShape {
  decoding: string;
  src: string;
}

describe("image preloading", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("deduplicates callers for the same URL and retains a decoded image", async () => {
    const instances: MockImage[] = [];
    let finishDecode: (() => void) | undefined;

    class MockImage implements MockImageShape {
      decoding = "auto";
      src = "";

      constructor() {
        instances.push(this);
      }

      decode() {
        return new Promise<void>((resolve) => {
          finishDecode = resolve;
        });
      }
    }

    vi.stubGlobal("Image", MockImage);
    const { preloadDecodedImage } = await import("./imagePreload");

    const first = preloadDecodedImage("/same.png");
    const second = preloadDecodedImage("/same.png");

    expect(instances).toHaveLength(1);
    expect(instances[0]).toMatchObject({ decoding: "async", src: "/same.png" });
    finishDecode?.();
    await Promise.all([first, second]);
    await preloadDecodedImage("/same.png");

    expect(instances).toHaveLength(1);
  });

  it("decodes an immediate batch with a maximum concurrency of one", async () => {
    const decodedUrls: string[] = [];
    let activeDecodes = 0;
    let maximumConcurrentDecodes = 0;

    class MockImage implements MockImageShape {
      decoding = "auto";
      src = "";

      async decode() {
        activeDecodes += 1;
        maximumConcurrentDecodes = Math.max(maximumConcurrentDecodes, activeDecodes);
        await Promise.resolve();
        decodedUrls.push(this.src);
        activeDecodes -= 1;
      }
    }

    vi.stubGlobal("Image", MockImage);
    const { preloadImagesSequentially } = await import("./imagePreload");

    await preloadImagesSequentially(["/one.png", "/two.png", "/three.png"]);

    expect(decodedUrls).toEqual(["/one.png", "/two.png", "/three.png"]);
    expect(maximumConcurrentDecodes).toBe(1);
  });

  it("caps decode concurrency across independent callers", async () => {
    const decodeResolvers: Array<() => void> = [];
    let activeDecodes = 0;
    let maximumConcurrentDecodes = 0;

    class MockImage implements MockImageShape {
      decoding = "auto";
      src = "";

      decode() {
        activeDecodes += 1;
        maximumConcurrentDecodes = Math.max(maximumConcurrentDecodes, activeDecodes);
        return new Promise<void>((resolve) => {
          decodeResolvers.push(() => {
            activeDecodes -= 1;
            resolve();
          });
        });
      }
    }

    vi.stubGlobal("Image", MockImage);
    const { preloadDecodedImage } = await import("./imagePreload");
    const preloads = ["/one.png", "/two.png", "/three.png", "/four.png"]
      .map((url) => preloadDecodedImage(url));

    expect(decodeResolvers).toHaveLength(2);
    decodeResolvers[0]();
    await vi.waitFor(() => expect(decodeResolvers).toHaveLength(3));
    decodeResolvers[1]();
    await vi.waitFor(() => expect(decodeResolvers).toHaveLength(4));
    decodeResolvers[2]();
    decodeResolvers[3]();
    await Promise.all(preloads);

    expect(maximumConcurrentDecodes).toBe(2);
  });

  it("allows a failed decode to be retried", async () => {
    let attempts = 0;

    class MockImage implements MockImageShape {
      decoding = "auto";
      src = "";

      decode() {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new Error("decode failed"))
          : Promise.resolve();
      }
    }

    vi.stubGlobal("Image", MockImage);
    const { preloadDecodedImage } = await import("./imagePreload");

    await expect(preloadDecodedImage("/retry.png")).rejects.toThrow("decode failed");
    await expect(preloadDecodedImage("/retry.png")).resolves.toBeUndefined();

    expect(attempts).toBe(2);
  });

  it("reports only images that decoded successfully in a sequential batch", async () => {
    class MockImage implements MockImageShape {
      decoding = "auto";
      src = "";

      decode() {
        return this.src.includes("broken")
          ? Promise.reject(new Error("decode failed"))
          : Promise.resolve();
      }
    }

    vi.stubGlobal("Image", MockImage);
    const { preloadImagesSequentiallyWithResults } = await import("./imagePreload");

    await expect(preloadImagesSequentiallyWithResults([
      "/ready-one.png",
      "/broken.png",
      "/ready-two.png"
    ])).resolves.toEqual(["/ready-one.png", "/ready-two.png"]);
  });

  it("schedules and finishes one image per idle callback", async () => {
    const idleCallbacks: IdleRequestCallback[] = [];
    const decodeResolvers: Array<() => void> = [];
    const startedUrls: string[] = [];

    class MockImage implements MockImageShape {
      decoding = "auto";
      src = "";

      decode() {
        startedUrls.push(this.src);
        return new Promise<void>((resolve) => {
          decodeResolvers.push(resolve);
        });
      }
    }

    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("requestIdleCallback", vi.fn((callback: IdleRequestCallback) => {
      idleCallbacks.push(callback);
      return idleCallbacks.length;
    }));
    const { preloadImagesWhenIdle } = await import("./imagePreload");

    const preload = preloadImagesWhenIdle(["/idle-one.png", "/idle-two.png"]);
    expect(idleCallbacks).toHaveLength(1);
    expect(startedUrls).toEqual([]);

    idleCallbacks[0]({ didTimeout: false, timeRemaining: () => 10 });
    expect(startedUrls).toEqual(["/idle-one.png"]);
    expect(idleCallbacks).toHaveLength(1);

    decodeResolvers[0]();
    await vi.waitFor(() => expect(idleCallbacks).toHaveLength(2));
    idleCallbacks[1]({ didTimeout: false, timeRemaining: () => 10 });
    expect(startedUrls).toEqual(["/idle-one.png", "/idle-two.png"]);

    decodeResolvers[1]();
    await preload;
    expect(idleCallbacks).toHaveLength(2);
  });

  it("falls back to the load event when decode is unavailable", async () => {
    const instances: MockImage[] = [];

    class MockImage implements MockImageShape {
      decoding = "auto";
      onerror: ((event: Event) => unknown) | null = null;
      onload: ((event: Event) => unknown) | null = null;
      private source = "";

      constructor() {
        instances.push(this);
      }

      get src() {
        return this.source;
      }

      set src(value: string) {
        this.source = value;
        queueMicrotask(() => this.onload?.(new Event("load")));
      }
    }

    vi.stubGlobal("Image", MockImage);
    const { preloadDecodedImage } = await import("./imagePreload");

    await expect(preloadDecodedImage("/load-only.png")).resolves.toBeUndefined();
    expect(instances[0]).toMatchObject({ decoding: "async", src: "/load-only.png" });
  });

  it("keeps successful image references within a decoded-byte LRU budget", async () => {
    let constructedImages = 0;

    class MockImage implements MockImageShape {
      decoding = "auto";
      naturalHeight = 3_072;
      naturalWidth = 2_048;
      src = "";

      constructor() {
        constructedImages += 1;
      }

      decode() {
        return Promise.resolve();
      }
    }

    vi.stubGlobal("Image", MockImage);
    const { preloadDecodedImage, preloadImagesSequentially } = await import("./imagePreload");
    const urls = Array.from({ length: 5 }, (_, index) => `/lru-${index}.png`);

    await preloadImagesSequentially(urls);
    await preloadDecodedImage(urls[0]);

    expect(constructedImages).toBe(6);
  });

  it("starts queued critical work before queued idle work", async () => {
    const startedUrls: string[] = [];
    const decodeResolvers = new Map<string, () => void>();

    class MockImage implements MockImageShape {
      decoding = "auto";
      src = "";

      decode() {
        startedUrls.push(this.src);
        return new Promise<void>((resolve) => {
          decodeResolvers.set(this.src, resolve);
        });
      }
    }

    vi.stubGlobal("Image", MockImage);
    const { preloadDecodedImage } = await import("./imagePreload");
    const activeOne = preloadDecodedImage("/active-one.png");
    const activeTwo = preloadDecodedImage("/active-two.png");
    const idle = preloadDecodedImage("/idle.png", { priority: "idle" });
    const critical = preloadDecodedImage("/critical.png");

    expect(startedUrls).toEqual(["/active-one.png", "/active-two.png"]);
    decodeResolvers.get("/active-one.png")?.();
    await vi.waitFor(() => expect(startedUrls).toContain("/critical.png"));
    expect(startedUrls).not.toContain("/idle.png");

    decodeResolvers.get("/active-two.png")?.();
    await vi.waitFor(() => expect(startedUrls).toContain("/idle.png"));
    decodeResolvers.get("/critical.png")?.();
    decodeResolvers.get("/idle.png")?.();
    await Promise.all([activeOne, activeTwo, idle, critical]);
  });

  it("stops an idle batch before scheduling more work when aborted", async () => {
    const idleCallbacks: IdleRequestCallback[] = [];
    const decodeResolvers: Array<() => void> = [];
    const startedUrls: string[] = [];

    class MockImage implements MockImageShape {
      decoding = "auto";
      src = "";

      decode() {
        startedUrls.push(this.src);
        return new Promise<void>((resolve) => decodeResolvers.push(resolve));
      }
    }

    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("requestIdleCallback", vi.fn((callback: IdleRequestCallback) => {
      idleCallbacks.push(callback);
      return idleCallbacks.length;
    }));
    const { preloadImagesWhenIdle } = await import("./imagePreload");
    const controller = new AbortController();
    const preload = preloadImagesWhenIdle(["/idle-one.png", "/idle-two.png"], { signal: controller.signal });

    idleCallbacks[0]({ didTimeout: false, timeRemaining: () => 10 });
    expect(startedUrls).toEqual(["/idle-one.png"]);
    controller.abort();
    decodeResolvers[0]();
    await preload;

    expect(startedUrls).toEqual(["/idle-one.png"]);
    expect(idleCallbacks).toHaveLength(1);
  });

  it("returns safely when Image is unavailable", async () => {
    vi.stubGlobal("Image", undefined);
    const { preloadDecodedImage, preloadImagesSequentially, preloadImagesWhenIdle } = await import("./imagePreload");

    await expect(preloadDecodedImage("/missing.png")).resolves.toBeUndefined();
    await expect(preloadImagesSequentially(["/missing.png"])).resolves.toBeUndefined();
    await expect(preloadImagesWhenIdle(["/missing.png"])).resolves.toBeUndefined();
  });
});
