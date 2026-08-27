import type { ModelImageInput, SessionMessage } from "@shared/index";

export type LlmStreamStatus = "connecting" | "thinking" | "streaming" | "done" | "error";

export type LlmStreamEvent =
  | { type: "status"; status: LlmStreamStatus }
  | { type: "chunk"; content: string }
  | { type: "usage"; inputTokens: number; outputTokens: number };

export interface LlmProviderUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmProviderRequest {
  modelName?: string;
  messages: SessionMessage[];
  maxTokens?: number;
  imageInputs?: ModelImageInput[];
  signal?: AbortSignal;
}

export interface LlmProviderResponse {
  content: string;
  raw?: unknown;
  usage?: LlmProviderUsage;
}

export interface LlmProvider {
  complete: (request: LlmProviderRequest) => Promise<LlmProviderResponse>;
  stream: (request: LlmProviderRequest) => AsyncGenerator<LlmStreamEvent>;
}
