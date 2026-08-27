import { randomUUID } from "node:crypto";
import type { WebContents } from "electron";
import WebSocket from "ws";
import type {
  AliyunAsrModel,
  AliyunModelStudioRegion,
  VoiceRecognitionEvent
} from "../../../../../packages/shared/src/index.js";
import { IPC_CHANNELS } from "../../../../../packages/shared/src/index.js";
import { resampleToPcm16 } from "./doubaoVoiceSession.js";

export class AliyunVoiceSession {
  readonly webContentsId: number;
  onFinished?: () => void;
  private readonly apiKey: string;
  private readonly inputSampleRate: number;
  private readonly model: AliyunAsrModel;
  private readonly region: AliyunModelStudioRegion;
  private readonly sessionId: string;
  private readonly webContents: WebContents;
  private readonly workspaceId: string;
  private socket: WebSocket | null = null;
  private finished = false;
  private ready = false;
  private latestText = "";
  private committedText = "";
  private readonly taskId = randomUUID().replaceAll("-", "");

  constructor(input: {
    apiKey: string;
    inputSampleRate: number;
    model: AliyunAsrModel;
    region: AliyunModelStudioRegion;
    sessionId: string;
    webContents: WebContents;
    workspaceId: string;
  }) {
    this.apiKey = input.apiKey;
    this.inputSampleRate = input.inputSampleRate;
    this.model = input.model;
    this.region = input.region;
    this.sessionId = input.sessionId;
    this.webContents = input.webContents;
    this.webContentsId = input.webContents.id;
    this.workspaceId = input.workspaceId;
  }

  start() {
    return new Promise<void>((resolve, reject) => {
      const isQwen = this.model === "qwen3-asr-flash-realtime";
      const path = isQwen ? "realtime" : "inference/";
      const query = isQwen ? `?model=${encodeURIComponent(this.model)}` : "";
      const socket = new WebSocket(
        `wss://${encodeURIComponent(this.workspaceId)}.${regionHost(this.region)}/api-ws/v1/${path}${query}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            ...(isQwen ? { "OpenAI-Beta": "realtime=v1" } : {})
          }
        }
      );
      this.socket = socket;
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error("连接阿里云百炼实时语音识别服务超时。"));
      }, 10_000);
      const markReady = () => {
        if (this.ready) return;
        this.ready = true;
        clearTimeout(timeout);
        this.sendEvent({ sessionId: this.sessionId, type: "ready" });
        resolve();
      };
      socket.once("open", () => {
        socket.send(JSON.stringify(isQwen ? createQwenSessionUpdate() : createFunAsrStart(this.taskId)));
      });
      socket.on("message", (data) => {
        try {
          const event = JSON.parse(data.toString()) as Record<string, unknown>;
          const error = extractAliyunError(event);
          if (error) {
            if (!this.ready) reject(new Error(error));
            this.finishWithError(error);
            return;
          }
          if (isQwen) {
            if (event.type === "session.updated" || event.type === "session.created") markReady();
            this.handleQwenEvent(event);
          } else {
            const header = event.header as { event?: string } | undefined;
            if (header?.event === "task-started") markReady();
            this.handleFunAsrEvent(event);
          }
        } catch {
          // Ignore unknown informational events; protocol errors arrive as structured failures.
        }
      });
      socket.once("error", (error) => {
        clearTimeout(timeout);
        if (!this.ready) reject(error);
        this.finishWithError(toFriendlyAliyunError(error.message));
      });
      socket.once("close", () => this.finish());
    });
  }

  acceptAudio(samples: Float32Array) {
    if (!this.ready || this.finished || this.socket?.readyState !== WebSocket.OPEN || samples.length === 0) return;
    const pcm = resampleToPcm16(samples, this.inputSampleRate);
    if (this.model === "qwen3-asr-flash-realtime") {
      this.socket.send(JSON.stringify({
        audio: pcm.toString("base64"),
        event_id: randomUUID(),
        type: "input_audio_buffer.append"
      }));
    } else {
      this.socket.send(pcm);
    }
  }

  async stop() {
    if (this.finished) return;
    const socket = this.socket;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(
        this.model === "qwen3-asr-flash-realtime"
          ? { event_id: randomUUID(), type: "session.finish" }
          : createFunAsrFinish(this.taskId)
      ));
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          socket.close();
          resolve();
        }, 1_000);
        socket.once("close", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    if (this.latestText.trim()) {
      this.sendEvent({ sessionId: this.sessionId, type: "final", text: this.latestText.trim() });
    }
    this.sendEvent({ sessionId: this.sessionId, type: "stopped" });
    this.finish();
  }

  private handleFunAsrEvent(event: Record<string, unknown>) {
    const header = event.header as { event?: string } | undefined;
    if (header?.event !== "result-generated") return;
    const payload = event.payload as { output?: { sentence?: { sentence_end?: boolean; text?: string } } } | undefined;
    const sentence = payload?.output?.sentence;
    const text = sentence?.text?.trim();
    if (!text) return;
    const combined = `${this.committedText}${text}`;
    this.publishPartial(combined);
    if (sentence?.sentence_end) this.committedText = combined;
  }

  private handleQwenEvent(event: Record<string, unknown>) {
    if (event.type !== "conversation.item.input_audio_transcription.completed") return;
    const text = typeof event.transcript === "string" ? event.transcript.trim() : "";
    if (!text) return;
    this.committedText = `${this.committedText}${text}`;
    this.publishPartial(this.committedText);
  }

  private publishPartial(text: string) {
    if (!text || text === this.latestText) return;
    this.latestText = text;
    this.sendEvent({ sessionId: this.sessionId, type: "partial", text });
  }

  private finishWithError(message: string) {
    if (this.finished) return;
    this.sendEvent({ sessionId: this.sessionId, type: "error", message });
    this.socket?.close();
    this.finish();
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    this.onFinished?.();
  }

  private sendEvent(event: VoiceRecognitionEvent) {
    if (!this.webContents.isDestroyed()) {
      this.webContents.send(IPC_CHANNELS.VOICE_RECOGNITION_EVENT, event);
    }
  }
}

function regionHost(region: AliyunModelStudioRegion) {
  return region === "singapore" ? "ap-southeast-1.maas.aliyuncs.com" : "cn-beijing.maas.aliyuncs.com";
}

function createFunAsrStart(taskId: string) {
  return {
    header: { action: "run-task", streaming: "duplex", task_id: taskId },
    payload: {
      function: "recognition",
      input: {},
      model: "fun-asr-realtime",
      parameters: { format: "pcm", sample_rate: 16000 },
      task: "asr",
      task_group: "audio"
    }
  };
}

function createFunAsrFinish(taskId: string) {
  return {
    header: { action: "finish-task", streaming: "duplex", task_id: taskId },
    payload: { input: {} }
  };
}

function createQwenSessionUpdate() {
  return {
    event_id: randomUUID(),
    session: {
      input_audio_format: "pcm",
      modalities: ["text"],
      sample_rate: 16000,
      turn_detection: { silence_duration_ms: 400, threshold: 0, type: "server_vad" }
    },
    type: "session.update"
  };
}

function extractAliyunError(event: Record<string, unknown>) {
  const header = event.header as { error_message?: string; event?: string } | undefined;
  if (header?.event === "task-failed") return toFriendlyAliyunError(header.error_message);
  if (event.type === "error") {
    const error = event.error as { message?: string } | undefined;
    return toFriendlyAliyunError(error?.message);
  }
  return "";
}

function toFriendlyAliyunError(message?: string) {
  if (/401|403|api.?key|auth|permission|鉴权|权限/i.test(message ?? "")) {
    return "阿里云百炼鉴权失败，请检查 API Key、地域和 Workspace ID。";
  }
  return message ? `阿里云百炼实时语音识别连接失败：${message}` : "阿里云百炼实时语音识别连接失败，请稍后重试。";
}
