import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent, type WebContents } from "electron";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import type {
  VoiceInputRuntimeStatus,
  VoiceModelStatus,
  VoiceRecognitionAudioChunk,
  VoiceRecognitionEvent,
  VoiceRecognitionStartRequest
} from "../../../../../packages/shared/src/index.js";
import type {
  SecretRepository,
  SettingsRepository
} from "../../../../../packages/database/src/index.js";
import {
  ERROR_CODES,
  IPC_CHANNELS,
  failure,
  wrapIpcHandler as wrapIpcHandlerBase,
  type IpcHandlerResult
} from "../../../../../packages/shared/src/index.js";
import { isTrustedRendererUrl } from "../security/rendererUrlPolicy.js";
import { LocalVoiceModelManager, type LocalVoiceModelFiles } from "./localVoiceModel.js";
import { AliyunVoiceSession } from "./aliyunVoiceSession.js";
import { DoubaoVoiceSession } from "./doubaoVoiceSession.js";
import { TencentVoiceSession } from "./tencentVoiceSession.js";

interface WorkerOutput {
  type: "ready" | "partial" | "final" | "stopped" | "error";
  text?: string;
  message?: string;
}

interface VoiceSession {
  readonly webContentsId: number;
  onFinished?: () => void;
  acceptAudio(samples: Float32Array): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

const activeSessions = new Map<string, VoiceSession>();
let voiceModelManager: LocalVoiceModelManager | null = null;

function wrapIpcHandler<T, Args extends unknown[]>(
  handler: (event: IpcMainInvokeEvent, ...args: Args) => Promise<IpcHandlerResult<T>>
) {
  return wrapIpcHandlerBase(async (event: IpcMainInvokeEvent, ...args: Args) => {
    const senderUrl = event.senderFrame?.url ?? event.sender.getURL();
    if (!isTrustedRendererUrl(senderUrl)) {
      return failure(ERROR_CODES.VALIDATION_ERROR, "当前页面没有权限使用 Ling 本地语音能力。");
    }
    return handler(event, ...args);
  });
}

export function registerVoiceIpcHandlers(repositories: {
  secrets: SecretRepository;
  settings: SettingsRepository;
}) {
  const bundledModelDirectory = app.isPackaged
    ? join(process.resourcesPath, "voice-models", "x-asr-zh-en-punct-int8-480ms-2026-06-05")
    : join(app.getAppPath(), "assets", "models", "voice", "x-asr-zh-en-punct-int8-480ms-2026-06-05");
  voiceModelManager = new LocalVoiceModelManager({
    bundledModelDirectory,
    rootDirectory: join(app.getPath("userData"), "voice-models"),
    onProgress: (status) => {
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send(IPC_CHANNELS.VOICE_MODEL_PROGRESS, status);
      }
    }
  });
  const preloadTimer = setTimeout(() => {
    void (async () => {
      try {
        const settings = await repositories.settings.read();
        if ((settings?.voiceInput?.provider ?? "local") === "local") {
          await getVoiceModelManager().install();
        }
      } catch {
        // First-use UI keeps the retry path visible if background preparation fails.
      }
    })();
  }, 800);
  preloadTimer.unref();

  ipcMain.handle(IPC_CHANNELS.VOICE_MODEL_STATUS, wrapIpcHandler(async () => {
    return getVoiceModelManager().getStatus();
  }));

  ipcMain.handle(IPC_CHANNELS.VOICE_MODEL_INSTALL, wrapIpcHandler(async () => {
    await getVoiceModelManager().install();
    return getVoiceModelManager().getStatus();
  }));

  ipcMain.handle(IPC_CHANNELS.VOICE_RUNTIME_STATUS, wrapIpcHandler(async (): Promise<VoiceInputRuntimeStatus> => {
    const settings = await repositories.settings.read();
    const provider = settings?.voiceInput?.provider ?? "local";
    const cloudConfigured = provider === "volcengine"
      ? Boolean(settings?.voiceInput?.doubao.appId.trim() && await repositories.secrets.hasDoubaoAccessToken())
      : provider === "tencent"
        ? Boolean(
            settings?.voiceInput?.tencent.appId.trim() &&
            await repositories.secrets.hasTencentSecretId() &&
            await repositories.secrets.hasTencentSecretKey()
          )
        : provider === "aliyun"
          ? Boolean(
              settings?.voiceInput?.aliyun.workspaceId.trim() &&
              await repositories.secrets.hasAliyunApiKey()
            )
          : true;
    return {
      provider,
      cloudConfigured,
      localModel: await getVoiceModelManager().getStatus()
    };
  }));

  ipcMain.handle(IPC_CHANNELS.VOICE_RECOGNITION_START, wrapIpcHandler(async (event, input: unknown) => {
    if (!isRecognitionStartRequest(input)) {
      return failure(ERROR_CODES.VALIDATION_ERROR, "语音识别参数无效。");
    }
    if ([...activeSessions.values()].some((session) => session.webContentsId === event.sender.id)) {
      return failure(ERROR_CODES.BUSY, "当前已经在进行语音输入。");
    }

    const settings = await repositories.settings.read();
    const provider = settings?.voiceInput?.provider ?? "local";
    let session: VoiceSession;
    if (provider === "volcengine") {
      const appId = settings?.voiceInput?.doubao.appId.trim() ?? "";
      const accessToken = await repositories.secrets.readDoubaoAccessToken();
      if (!appId || !accessToken) {
        return failure(ERROR_CODES.NOT_FOUND, "请先到“设置 → 语音输入”完成火山引擎配置。");
      }
      session = new DoubaoVoiceSession({
        accessToken,
        appId,
        inputSampleRate: input.sampleRate,
        model: settings?.voiceInput?.doubao.model ?? "seed-asr-2.0-hourly",
        sessionId: input.sessionId,
        webContents: event.sender
      });
    } else if (provider === "tencent") {
      const appId = settings?.voiceInput?.tencent.appId.trim() ?? "";
      const [secretId, secretKey] = await Promise.all([
        repositories.secrets.readTencentSecretId(),
        repositories.secrets.readTencentSecretKey()
      ]);
      if (!appId || !secretId || !secretKey) {
        return failure(ERROR_CODES.NOT_FOUND, "请先到“设置 → 语音输入”完成腾讯云配置。");
      }
      session = new TencentVoiceSession({
        appId,
        inputSampleRate: input.sampleRate,
        model: settings?.voiceInput?.tencent.model ?? "16k_zh",
        secretId,
        secretKey,
        sessionId: input.sessionId,
        webContents: event.sender
      });
    } else if (provider === "aliyun") {
      const workspaceId = settings?.voiceInput?.aliyun.workspaceId.trim() ?? "";
      const apiKey = await repositories.secrets.readAliyunApiKey();
      if (!workspaceId || !apiKey) {
        return failure(ERROR_CODES.NOT_FOUND, "请先到“设置 → 语音输入”完成阿里云百炼配置。");
      }
      session = new AliyunVoiceSession({
        apiKey,
        inputSampleRate: input.sampleRate,
        model: settings?.voiceInput?.aliyun.model ?? "fun-asr-realtime",
        region: settings?.voiceInput?.aliyun.region ?? "beijing",
        sessionId: input.sessionId,
        webContents: event.sender,
        workspaceId
      });
    } else {
      let modelFiles: LocalVoiceModelFiles;
      try {
        modelFiles = await getVoiceModelManager().resolveModelFiles();
      } catch {
        return failure(ERROR_CODES.NOT_FOUND, "本地语音组件尚未准备好。");
      }
      session = new LocalVoiceSession({
        inputSampleRate: input.sampleRate,
        modelFiles,
        sessionId: input.sessionId,
        webContents: event.sender
      });
    }
    activeSessions.set(input.sessionId, session);
    session.onFinished = () => activeSessions.delete(input.sessionId);
    try {
      await session.start();
      return { sessionId: input.sessionId };
    } catch {
      activeSessions.delete(input.sessionId);
      return failure(
        ERROR_CODES.INTERNAL_ERROR,
        provider === "local"
          ? "本地语音识别启动失败，请重试。"
          : `${cloudProviderLabel(provider)}语音识别启动失败，请检查配置后重试。`
      );
    }
  }));

  ipcMain.on(IPC_CHANNELS.VOICE_RECOGNITION_AUDIO, (event, input: unknown) => {
    if (!isTrustedRendererUrl(event.senderFrame?.url ?? event.sender.getURL())) return;
    if (!isRecognitionAudioChunk(input)) return;
    const session = activeSessions.get(input.sessionId);
    if (!session || session.webContentsId !== event.sender.id) return;
    session.acceptAudio(input.samples);
  });

  ipcMain.handle(IPC_CHANNELS.VOICE_RECOGNITION_STOP, wrapIpcHandler(async (event, sessionId: unknown) => {
    if (typeof sessionId !== "string") {
      return failure(ERROR_CODES.VALIDATION_ERROR, "语音识别会话无效。");
    }
    const session = activeSessions.get(sessionId);
    if (!session || session.webContentsId !== event.sender.id) return;
    await session.stop();
  }));
}

function cloudProviderLabel(provider: VoiceInputRuntimeStatus["provider"]) {
  if (provider === "volcengine") return "火山引擎";
  if (provider === "tencent") return "腾讯云";
  if (provider === "aliyun") return "阿里云百炼";
  return "";
}

export async function stopAllVoiceRecognition() {
  await Promise.allSettled([...activeSessions.values()].map((session) => session.stop()));
}

export class LocalVoiceSession {
  readonly webContentsId: number;
  onFinished?: () => void;
  private readonly inputSampleRate: number;
  private readonly modelFiles: LocalVoiceModelFiles;
  private readonly sessionId: string;
  private readonly webContents: WebContents;
  private readonly worker: Worker;
  private hasFinished = false;
  private readyResolver: (() => void) | null = null;
  private readyRejecter: ((error: Error) => void) | null = null;
  private stopPromise: Promise<void> | null = null;
  private stopResolver: (() => void) | null = null;
  private latestPartial = "";

  constructor(input: {
    inputSampleRate: number;
    modelFiles: LocalVoiceModelFiles;
    sessionId: string;
    webContents: WebContents;
  }) {
    this.inputSampleRate = input.inputSampleRate;
    this.modelFiles = input.modelFiles;
    this.sessionId = input.sessionId;
    this.webContents = input.webContents;
    this.webContentsId = input.webContents.id;
    this.worker = new Worker(new URL("./localVoiceWorker.js", import.meta.url));
    this.worker.on("message", (message: WorkerOutput) => this.handleWorkerMessage(message));
    this.worker.on("error", () => this.finishWithError("本地语音识别进程意外停止。"));
    this.worker.on("exit", (code) => {
      if (!this.hasFinished && code !== 0) this.finishWithError("本地语音识别进程意外停止。");
    });
  }

  start() {
    const readyPromise = new Promise<void>((resolvePromise, rejectPromise) => {
      this.readyResolver = resolvePromise;
      this.readyRejecter = rejectPromise;
    });
    this.worker.postMessage({
      type: "init",
      files: this.modelFiles,
      inputSampleRate: this.inputSampleRate
    });
    const timeout = setTimeout(() => {
      this.readyRejecter?.(new Error("本地语音识别启动超时。"));
      this.readyRejecter = null;
      void this.worker.terminate();
    }, 15_000);
    return readyPromise.finally(() => clearTimeout(timeout));
  }

  acceptAudio(samples: Float32Array) {
    if (this.hasFinished || !(samples instanceof Float32Array) || samples.length === 0) return;
    const copy = new Float32Array(samples);
    this.worker.postMessage({ type: "audio", samples: copy }, [copy.buffer]);
  }

  stop() {
    if (this.stopPromise) return this.stopPromise;
    if (this.hasFinished) return Promise.resolve();
    this.stopPromise = new Promise<void>((resolvePromise) => {
      this.stopResolver = resolvePromise;
      this.worker.postMessage({ type: "stop" });
      setTimeout(() => this.finishStopped(true), 240);
    });
    return this.stopPromise;
  }

  private handleWorkerMessage(message: WorkerOutput) {
    if (this.hasFinished) return;
    if (message.type === "ready") {
      this.readyResolver?.();
      this.readyResolver = null;
      this.readyRejecter = null;
      this.sendEvent({ sessionId: this.sessionId, type: "ready" });
      return;
    }
    if (message.type === "partial") {
      this.latestPartial = message.text ?? "";
      this.sendEvent({ sessionId: this.sessionId, type: "partial", text: this.latestPartial });
      return;
    }
    if (message.type === "final") {
      const text = message.text?.trim();
      if (text) {
        this.sendEvent({ sessionId: this.sessionId, type: "final", text });
        this.latestPartial = "";
      }
      return;
    }
    if (message.type === "error") {
      this.finishWithError(message.message || "本地语音识别发生错误。");
      return;
    }
    this.finishStopped(false);
  }

  private finishStopped(commitLatestPartial: boolean) {
    if (this.hasFinished) return;
    const latestPartial = this.latestPartial.trim();
    if (commitLatestPartial && latestPartial) {
      this.sendEvent({ sessionId: this.sessionId, type: "final", text: latestPartial });
      this.latestPartial = "";
    }
    this.sendEvent({ sessionId: this.sessionId, type: "stopped" });
    this.finish();
  }

  private finishWithError(message: string) {
    this.readyRejecter?.(new Error(message));
    this.readyRejecter = null;
    this.sendEvent({ sessionId: this.sessionId, type: "error", message });
    this.finish();
  }

  private finish() {
    if (this.hasFinished) return;
    this.hasFinished = true;
    this.stopResolver?.();
    this.stopResolver = null;
    void this.worker.terminate();
    this.onFinished?.();
  }

  private sendEvent(event: VoiceRecognitionEvent) {
    if (!this.webContents.isDestroyed()) {
      this.webContents.send(IPC_CHANNELS.VOICE_RECOGNITION_EVENT, event);
    }
  }
}

function getVoiceModelManager() {
  if (!voiceModelManager) throw new Error("本地语音组件尚未初始化。");
  return voiceModelManager;
}

function isRecognitionStartRequest(input: unknown): input is VoiceRecognitionStartRequest {
  if (!input || typeof input !== "object") return false;
  const value = input as Partial<VoiceRecognitionStartRequest>;
  return (
    typeof value.sessionId === "string" &&
    /^[a-zA-Z0-9-]{8,80}$/.test(value.sessionId) &&
    typeof value.sampleRate === "number" &&
    Number.isFinite(value.sampleRate) &&
    value.sampleRate >= 8_000 &&
    value.sampleRate <= 192_000
  );
}

function isRecognitionAudioChunk(input: unknown): input is VoiceRecognitionAudioChunk {
  if (!input || typeof input !== "object") return false;
  const value = input as Partial<VoiceRecognitionAudioChunk>;
  return (
    typeof value.sessionId === "string" &&
    value.samples instanceof Float32Array &&
    value.samples.length > 0 &&
    value.samples.length <= 32_768
  );
}
