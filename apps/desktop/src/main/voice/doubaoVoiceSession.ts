import { randomUUID } from "node:crypto";
import type { WebContents } from "electron";
import WebSocket from "ws";
import type {
  DoubaoAsrModel,
  VoiceRecognitionEvent
} from "../../../../../packages/shared/src/index.js";
import { IPC_CHANNELS } from "../../../../../packages/shared/src/index.js";

const DOUBAO_STREAMING_URL = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async";

export const DOUBAO_RESOURCE_IDS: Record<DoubaoAsrModel, string> = {
  "seed-asr-2.0-hourly": "volc.seedasr.sauc.duration",
  "seed-asr-1.0-hourly": "volc.bigasr.sauc.duration",
  "seed-asr-1.0-concurrent": "volc.bigasr.sauc.concurrent"
};

export class DoubaoVoiceSession {
  readonly webContentsId: number;
  onFinished?: () => void;
  private readonly accessToken: string;
  private readonly appId: string;
  private readonly inputSampleRate: number;
  private readonly model: DoubaoAsrModel;
  private readonly sessionId: string;
  private readonly webContents: WebContents;
  private socket: WebSocket | null = null;
  private finished = false;
  private latestText = "";

  constructor(input: {
    accessToken: string;
    appId: string;
    inputSampleRate: number;
    model: DoubaoAsrModel;
    sessionId: string;
    webContents: WebContents;
  }) {
    this.accessToken = input.accessToken;
    this.appId = input.appId;
    this.inputSampleRate = input.inputSampleRate;
    this.model = input.model;
    this.sessionId = input.sessionId;
    this.webContents = input.webContents;
    this.webContentsId = input.webContents.id;
  }

  start() {
    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(DOUBAO_STREAMING_URL, {
        headers: {
          "X-Api-App-Key": this.appId,
          "X-Api-Access-Key": this.accessToken,
          "X-Api-Resource-Id": DOUBAO_RESOURCE_IDS[this.model],
          "X-Api-Request-Id": randomUUID()
        }
      });
      this.socket = socket;
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error("连接火山引擎语音识别服务超时。"));
      }, 10_000);
      socket.once("open", () => {
        clearTimeout(timeout);
        socket.send(encodePacket(0x10, createFullRequest(this.sessionId)));
        this.sendEvent({ sessionId: this.sessionId, type: "ready" });
        resolve();
      });
      socket.on("message", (data) => this.handleServerMessage(Buffer.from(data as ArrayBuffer)));
      socket.once("error", (error) => {
        clearTimeout(timeout);
        if (!this.finished) this.finishWithError(toFriendlyDoubaoError(error.message));
        reject(error);
      });
      socket.once("close", () => this.finish());
    });
  }

  acceptAudio(samples: Float32Array) {
    if (this.finished || this.socket?.readyState !== WebSocket.OPEN || samples.length === 0) return;
    const pcm = resampleToPcm16(samples, this.inputSampleRate);
    this.socket.send(encodePacket(0x20, pcm));
  }

  async stop() {
    if (this.finished) return;
    const socket = this.socket;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(encodePacket(0x22, Buffer.alloc(0)));
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          socket.close();
          resolve();
        }, 500);
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

  private handleServerMessage(packet: Buffer) {
    try {
      const response = decodePacket(packet);
      if (response.error) {
        this.finishWithError(toFriendlyDoubaoError(response.error));
        return;
      }
      const text = extractTranscript(response.payload);
      if (!text || text === this.latestText) return;
      this.latestText = text;
      this.sendEvent({ sessionId: this.sessionId, type: "partial", text });
    } catch {
      this.finishWithError("火山引擎语音识别服务返回了无法解析的数据，请稍后重试。");
    }
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

function createFullRequest(uid: string) {
  return Buffer.from(JSON.stringify({
    user: { uid },
    audio: { format: "pcm", rate: 16000, bits: 16, channel: 1 },
    request: {
      model_name: "bigmodel",
      enable_itn: true,
      enable_punc: true,
      show_utterances: true,
      result_type: "full"
    }
  }), "utf8");
}

function encodePacket(messageTypeAndFlags: number, payload: Buffer) {
  const header = Buffer.from([0x11, messageTypeAndFlags, 0x10, 0x00]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length);
  return Buffer.concat([header, size, payload]);
}

function decodePacket(packet: Buffer): { error?: string; payload?: unknown } {
  if (packet.length < 8) return {};
  const headerSize = (packet[0]! & 0x0f) * 4;
  const messageType = packet[1]! >> 4;
  if (messageType === 0x0f) {
    const messageSize = packet.readUInt32BE(headerSize + 4);
    return { error: packet.subarray(headerSize + 8, headerSize + 8 + messageSize).toString("utf8") };
  }
  const payloadSize = packet.readUInt32BE(headerSize + 4);
  const body = packet.subarray(headerSize + 8, headerSize + 8 + payloadSize).toString("utf8");
  return { payload: body ? JSON.parse(body) : undefined };
}

function extractTranscript(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const result = (payload as { result?: unknown }).result;
  if (!result || typeof result !== "object") return "";
  const text = (result as { text?: unknown }).text;
  return typeof text === "string" ? text.trim() : "";
}

export function resampleToPcm16(samples: Float32Array, inputRate: number) {
  const outputLength = Math.max(1, Math.floor(samples.length * 16_000 / inputRate));
  const output = Buffer.allocUnsafe(outputLength * 2);
  for (let index = 0; index < outputLength; index += 1) {
    const position = index * inputRate / 16_000;
    const left = Math.floor(position);
    const fraction = position - left;
    const sample = (samples[left] ?? 0) * (1 - fraction) + (samples[left + 1] ?? samples[left] ?? 0) * fraction;
    const clamped = Math.max(-1, Math.min(1, sample));
    output.writeInt16LE(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, index * 2);
  }
  return output;
}

function toFriendlyDoubaoError(message: string) {
  if (/401|403|auth|token|permission/i.test(message)) {
    return "火山引擎语音识别鉴权失败，请检查 App ID、Access Token 和资源开通状态。";
  }
  return message ? `火山引擎语音识别连接失败：${message}` : "火山引擎语音识别连接失败，请稍后重试。";
}
