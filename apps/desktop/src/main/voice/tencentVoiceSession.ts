import { createHmac, randomUUID } from "node:crypto";
import type { WebContents } from "electron";
import WebSocket from "ws";
import type { TencentAsrModel, VoiceRecognitionEvent } from "../../../../../packages/shared/src/index.js";
import { IPC_CHANNELS } from "../../../../../packages/shared/src/index.js";
import { resampleToPcm16 } from "./doubaoVoiceSession.js";

export class TencentVoiceSession {
  readonly webContentsId: number;
  onFinished?: () => void;
  private readonly appId: string;
  private readonly inputSampleRate: number;
  private readonly model: TencentAsrModel;
  private readonly secretId: string;
  private readonly secretKey: string;
  private readonly sessionId: string;
  private readonly webContents: WebContents;
  private socket: WebSocket | null = null;
  private finished = false;
  private latestText = "";
  private readonly sentences = new Map<number, string>();

  constructor(input: {
    appId: string;
    inputSampleRate: number;
    model: TencentAsrModel;
    secretId: string;
    secretKey: string;
    sessionId: string;
    webContents: WebContents;
  }) {
    this.appId = input.appId;
    this.inputSampleRate = input.inputSampleRate;
    this.model = input.model;
    this.secretId = input.secretId;
    this.secretKey = input.secretKey;
    this.sessionId = input.sessionId;
    this.webContents = input.webContents;
    this.webContentsId = input.webContents.id;
  }

  start() {
    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(createSignedUrl({
        appId: this.appId,
        model: this.model,
        secretId: this.secretId,
        secretKey: this.secretKey,
        voiceId: this.sessionId
      }));
      this.socket = socket;
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error("连接腾讯云实时语音识别服务超时。"));
      }, 10_000);
      let ready = false;
      socket.on("message", (data) => {
        const response = parseResponse(data.toString());
        if (!response) return;
        if (response.code !== 0) {
          clearTimeout(timeout);
          const message = toFriendlyTencentError(response.code, response.message);
          if (!ready) reject(new Error(message));
          this.finishWithError(message);
          return;
        }
        if (!ready) {
          ready = true;
          clearTimeout(timeout);
          this.sendEvent({ sessionId: this.sessionId, type: "ready" });
          resolve();
        }
        this.handleResult(response);
      });
      socket.once("error", (error) => {
        clearTimeout(timeout);
        if (!ready) reject(error);
        this.finishWithError(toFriendlyTencentError(undefined, error.message));
      });
      socket.once("close", () => this.finish());
    });
  }

  acceptAudio(samples: Float32Array) {
    if (this.finished || this.socket?.readyState !== WebSocket.OPEN || samples.length === 0) return;
    this.socket.send(resampleToPcm16(samples, this.inputSampleRate));
  }

  async stop() {
    if (this.finished) return;
    const socket = this.socket;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "end" }));
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          socket.close();
          resolve();
        }, 900);
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

  private handleResult(response: TencentResponse) {
    const sentenceItems = collectSentenceItems(response.sentences);
    for (const item of sentenceItems) {
      this.sentences.set(item.id, item.text);
    }
    const legacyText = response.result?.voice_text_str?.trim();
    const combined = this.sentences.size > 0
      ? [...this.sentences.entries()]
          .sort(([left], [right]) => left - right)
          .map(([, text]) => text)
          .join("")
      : legacyText ?? "";
    if (!combined || combined === this.latestText) return;
    this.latestText = combined;
    this.sendEvent({ sessionId: this.sessionId, type: "partial", text: combined });
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

interface TencentResponse {
  code: number;
  message?: string;
  result?: {
    voice_text_str?: string;
  };
  sentences?: unknown;
}

interface TencentSentence {
  sentence_id?: number;
  text?: string;
  voice_text_str?: string;
}

function createSignedUrl(input: {
  appId: string;
  model: TencentAsrModel;
  secretId: string;
  secretKey: string;
  voiceId: string;
}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const parameters = new URLSearchParams({
    convert_num_mode: "1",
    engine_model_type: input.model,
    expired: String(timestamp + 3600),
    filter_punc: "1",
    needvad: "1",
    nonce: String(Math.floor(Math.random() * 1_000_000_000)),
    secretid: input.secretId,
    timestamp: String(timestamp),
    voice_format: "1",
    voice_id: input.voiceId || randomUUID()
  });
  parameters.sort();
  const path = `asr.cloud.tencent.com/asr/v2/${encodeURIComponent(input.appId)}?${parameters.toString()}`;
  const signature = createHmac("sha1", input.secretKey).update(path).digest("base64");
  return `wss://${path}&signature=${encodeURIComponent(signature)}`;
}

function parseResponse(raw: string): TencentResponse | null {
  try {
    const value = JSON.parse(raw) as {
      code?: unknown;
      message?: unknown;
      result?: TencentResponse["result"];
      sentences?: unknown;
    };
    if (typeof value.code !== "number") return null;
    return {
      code: value.code,
      message: typeof value.message === "string" ? value.message : undefined,
      result: value.result,
      sentences: value.sentences
    };
  } catch {
    return null;
  }
}

function collectSentenceItems(value: unknown): Array<{ id: number; text: string }> {
  const directSentence = value && typeof value === "object" && !Array.isArray(value)
    ? value as TencentSentence
    : null;
  const values = directSentence && (typeof directSentence.text === "string" || typeof directSentence.voice_text_str === "string")
    ? [directSentence]
    : Array.isArray(value)
      ? value
      : value && typeof value === "object"
        ? Object.values(value)
        : [];
  const items: Array<{ id: number; text: string }> = [];
  values.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const sentence = entry as TencentSentence;
    const text = (sentence.text ?? sentence.voice_text_str)?.trim();
    if (!text) return;
    items.push({
      id: typeof sentence.sentence_id === "number" ? sentence.sentence_id : index,
      text
    });
  });
  return items;
}

function toFriendlyTencentError(code?: number, message?: string) {
  if (code === 4002 || code === 4003 || /auth|secret|signature|鉴权|签名/i.test(message ?? "")) {
    return "腾讯云实时语音识别鉴权失败，请检查 AppID、SecretID 和 SecretKey。";
  }
  return message ? `腾讯云实时语音识别连接失败：${message}` : "腾讯云实时语音识别连接失败，请稍后重试。";
}
