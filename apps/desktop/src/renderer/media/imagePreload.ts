const maximumConcurrentDecodes = 2;
const fallbackDecodedImageBytes = 4 * 1024 * 1024;
const mebibyte = 1024 * 1024;

type DecodePriority = "critical" | "idle";
type PreloadOptions = { priority?: DecodePriority };
type PreloadBatchOptions = { signal?: AbortSignal };
type RetainedImage = { bytes: number; image: HTMLImageElement };
type PendingDecodeTask = { priority: DecodePriority; run: () => void; url: string };

const retainedImages = new Map<string, RetainedImage>();
const inFlightPreloads = new Map<string, Promise<void>>();
const criticalDecodeTasks: PendingDecodeTask[] = [];
const idleDecodeTasks: PendingDecodeTask[] = [];
const retainedImageBudgetBytes = getRetainedImageBudgetBytes();
let activeDecodeCount = 0;
let retainedImageBytes = 0;

function canPreloadImages() {
  return typeof window !== "undefined" && typeof Image !== "undefined";
}

function getRetainedImageBudgetBytes() {
  if (typeof navigator === "undefined") return 96 * mebibyte;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof deviceMemory !== "number") return 96 * mebibyte;
  if (deviceMemory <= 4) return 64 * mebibyte;
  if (deviceMemory <= 8) return 96 * mebibyte;
  return 160 * mebibyte;
}

function estimateDecodedImageBytes(image: HTMLImageElement) {
  const width = Number(image.naturalWidth);
  const height = Number(image.naturalHeight);
  return width > 0 && height > 0
    ? width * height * 4
    : fallbackDecodedImageBytes;
}

function releaseRetainedImage(entry: RetainedImage) {
  if (typeof entry.image.removeAttribute === "function") entry.image.removeAttribute("src");
  else entry.image.src = "";
}

function retainDecodedImage(url: string, image: HTMLImageElement) {
  const previous = retainedImages.get(url);
  if (previous) retainedImageBytes -= previous.bytes;
  retainedImages.delete(url);

  const bytes = estimateDecodedImageBytes(image);
  retainedImages.set(url, { bytes, image });
  retainedImageBytes += bytes;

  while (retainedImageBytes > retainedImageBudgetBytes && retainedImages.size > 1) {
    const leastRecentlyUsedUrl = retainedImages.keys().next().value as string | undefined;
    if (leastRecentlyUsedUrl === undefined) break;
    const evicted = retainedImages.get(leastRecentlyUsedUrl);
    retainedImages.delete(leastRecentlyUsedUrl);
    if (!evicted) continue;
    retainedImageBytes -= evicted.bytes;
    releaseRetainedImage(evicted);
  }
}

async function loadAndDecodeImage(image: HTMLImageElement, url: string) {
  const decode = image.decode;
  if (typeof decode === "function") {
    image.src = url;
    await decode.call(image);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
    };

    image.onload = () => {
      cleanup();
      resolve();
    };
    image.onerror = () => {
      cleanup();
      reject(new Error(`Unable to preload image: ${url}`));
    };
    image.src = url;
  });
}

function uniqueUrls(urls: readonly string[]) {
  return [...new Set(urls.filter(Boolean))];
}

function takeNextDecodeTask() {
  return criticalDecodeTasks.shift() ?? idleDecodeTasks.shift();
}

function runWithDecodeSlot(url: string, priority: DecodePriority, task: () => Promise<void>) {
  return new Promise<void>((resolve, reject) => {
    const run = () => {
      activeDecodeCount += 1;
      void task()
        .then(resolve, reject)
        .finally(() => {
          activeDecodeCount -= 1;
          takeNextDecodeTask()?.run();
        });
    };

    if (activeDecodeCount < maximumConcurrentDecodes) run();
    else {
      const pendingTask = { priority, run, url };
      if (priority === "critical") criticalDecodeTasks.push(pendingTask);
      else idleDecodeTasks.push(pendingTask);
    }
  });
}

function promotePendingDecode(url: string) {
  const index = idleDecodeTasks.findIndex((task) => task.url === url);
  if (index < 0) return;
  const [task] = idleDecodeTasks.splice(index, 1);
  task.priority = "critical";
  criticalDecodeTasks.push(task);
}

/** Loads and fully decodes one image, sharing work between callers for the same URL. */
export function preloadDecodedImage(url: string, { priority = "critical" }: PreloadOptions = {}): Promise<void> {
  if (!url || !canPreloadImages()) return Promise.resolve();

  const retained = retainedImages.get(url);
  if (retained) {
    retainDecodedImage(url, retained.image);
    return Promise.resolve();
  }

  const inFlightPreload = inFlightPreloads.get(url);
  if (inFlightPreload) {
    if (priority === "critical") promotePendingDecode(url);
    return inFlightPreload;
  }

  const preload = runWithDecodeSlot(url, priority, async () => {
    const image = new Image();
    image.decoding = "async";
    await loadAndDecodeImage(image, url);
    retainDecodedImage(url, image);
  })
    .finally(() => {
      inFlightPreloads.delete(url);
    });

  inFlightPreloads.set(url, preload);
  return preload;
}

/** Immediately preloads images one at a time to avoid concurrent decode spikes. */
export async function preloadImagesSequentially(urls: readonly string[]): Promise<void> {
  await preloadImagesSequentiallyWithResults(urls);
}

/** Sequentially decodes a batch and reports only the URLs that succeeded. */
export async function preloadImagesSequentiallyWithResults(urls: readonly string[]): Promise<string[]> {
  const decodedUrls: string[] = [];
  for (const url of uniqueUrls(urls)) {
    try {
      await preloadDecodedImage(url);
      decodedUrls.push(url);
    } catch {
      // Preloading is best-effort; a failed URL remains eligible for a later retry.
    }
  }
  return decodedUrls;
}

function scheduleIdleTask(task: () => void) {
  if (typeof globalThis.requestIdleCallback === "function") {
    globalThis.requestIdleCallback(task, { timeout: 1_000 });
    return;
  }

  globalThis.setTimeout(task, 0);
}

/** Preloads one image per idle task, scheduling the next only after decoding completes. */
export function preloadImagesWhenIdle(
  urls: readonly string[],
  { signal }: PreloadBatchOptions = {}
): Promise<void> {
  if (!canPreloadImages()) return Promise.resolve();

  const queuedUrls = uniqueUrls(urls);
  if (queuedUrls.length === 0) return Promise.resolve();

  return new Promise((resolve) => {
    let nextIndex = 0;

    const scheduleNext = () => {
      if (signal?.aborted || nextIndex >= queuedUrls.length) {
        resolve();
        return;
      }

      scheduleIdleTask(() => {
        if (signal?.aborted) {
          resolve();
          return;
        }
        const url = queuedUrls[nextIndex];
        nextIndex += 1;
        void preloadDecodedImage(url, { priority: "idle" })
          .catch(() => undefined)
          .then(scheduleNext);
      });
    };

    scheduleNext();
  });
}
