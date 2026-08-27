import { beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../../../packages/shared/src/index.js";

const { MockWorker, workerInstances } = vi.hoisted(() => {
  class HoistedMockWorker {
    postedMessages: unknown[] = [];
    terminateCalls = 0;
    private listeners = new Map<string, Array<(value: unknown) => void>>();

    constructor() {
      workerInstances.push(this);
    }

    emit(event: string, value: unknown) {
      for (const listener of this.listeners.get(event) ?? []) listener(value);
    }

    on(event: string, listener: (value: unknown) => void) {
      this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
      return this;
    }

    postMessage(message: unknown) {
      this.postedMessages.push(message);
    }

    async terminate() {
      this.terminateCalls += 1;
      return 0;
    }
  }

  const workerInstances: HoistedMockWorker[] = [];
  return { MockWorker: HoistedMockWorker, workerInstances };
});

vi.mock("node:worker_threads", () => ({
  default: { Worker: MockWorker },
  Worker: MockWorker
}));

vi.mock("electron", () => ({
  app: {
    getAppPath: () => "/tmp/ling",
    getPath: () => "/tmp/ling-user-data",
    isPackaged: false
  },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: vi.fn(), on: vi.fn() }
}));

import { LocalVoiceSession, registerVoiceIpcHandlers } from "./voiceIpc";

describe("LocalVoiceSession stop fallback", () => {
  beforeEach(() => {
    workerInstances.length = 0;
    vi.useFakeTimers();
  });

  it("commits the latest partial and always emits stopped when final decoding times out", async () => {
    const send = vi.fn();
    const session = new LocalVoiceSession({
      inputSampleRate: 48_000,
      modelFiles: {
        decoder: "/model/decoder.onnx",
        encoder: "/model/encoder.onnx",
        joiner: "/model/joiner.onnx",
        tokens: "/model/tokens.txt"
      },
      sessionId: "voice-session-123",
      webContents: {
        id: 7,
        isDestroyed: () => false,
        send
      } as never
    });
    const worker = workerInstances[0]!;

    const startPromise = session.start();
    worker.emit("message", { type: "ready" });
    await startPromise;
    worker.emit("message", { type: "partial", text: "最后一句" });

    const stopPromise = session.stop();
    await vi.advanceTimersByTimeAsync(240);
    await stopPromise;

    expect(worker.postedMessages.at(-1)).toEqual({ type: "stop" });
    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.VOICE_RECOGNITION_EVENT, {
      sessionId: "voice-session-123",
      type: "final",
      text: "最后一句"
    });
    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.VOICE_RECOGNITION_EVENT, {
      sessionId: "voice-session-123",
      type: "stopped"
    });
    expect(worker.terminateCalls).toBe(1);
  });

  it("does not throw while encrypted repositories are still locked", async () => {
    const repositories = {} as Record<string, unknown>;
    Object.defineProperty(repositories, "settings", {
      get() {
        throw new Error("请先解锁本地资料。");
      }
    });

    registerVoiceIpcHandlers(repositories as never);
    await vi.advanceTimersByTimeAsync(800);
    expect(vi.getTimerCount()).toBe(0);
  });
});
