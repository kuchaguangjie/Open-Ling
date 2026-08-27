export type VoiceModelState = "not-installed" | "preparing" | "ready" | "error";

export interface VoiceModelStatus {
  state: VoiceModelState;
  downloadedBytes: number;
  totalBytes: number;
  message?: string;
}

export interface VoiceInputRuntimeStatus {
  provider: "local" | "volcengine" | "tencent" | "aliyun";
  cloudConfigured: boolean;
  localModel: VoiceModelStatus;
}

export interface VoiceRecognitionStartRequest {
  sessionId: string;
  sampleRate: number;
}

export interface VoiceRecognitionAudioChunk {
  sessionId: string;
  samples: Float32Array;
}

export type VoiceRecognitionEvent =
  | { sessionId: string; type: "ready" }
  | { sessionId: string; type: "partial"; text: string }
  | { sessionId: string; type: "final"; text: string }
  | { sessionId: string; type: "stopped" }
  | { sessionId: string; type: "error"; message: string };
