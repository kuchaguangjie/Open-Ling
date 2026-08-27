import type { ApiSettings, ModelReasoningEffort } from "../../../shared/src/index.js";
import type { LlmProvider, LlmProviderRequest, LlmProviderUsage } from "./llmProvider.js";
import {
  resolveModelRuntimeContract,
  type SamplingProfile
} from "./modelCapabilityTable.js";

export interface OpenAICompatibleProviderConfig {
  apiBaseUrl: string;
  apiKey?: string;
  modelName: string;
  timeoutMs?: number;
  deepSeekThinking?: "enabled" | "disabled";
  reasoningEffort?: ModelReasoningEffort;
  remoteProvider?: ApiSettings["remoteProvider"];
  samplingProfile?: SamplingProfile;
  fetch?: typeof fetch;
  onUsage?: (usage: LlmProviderUsage) => void;
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 180_000;

interface ChatCompletionChoice {
  message?: {
    content?: string;
  };
  delta?: {
    content?: string;
  };
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}

export class LlmProviderError extends Error {
  readonly status?: number;
  readonly detail?: string;

  constructor(options: { status?: number; snippet?: string } = {}) {
    const statusBit = options.status != null ? `（HTTP ${options.status}）` : "";
    const snippetBit = options.snippet ? ` ${options.snippet}` : "";
    super(`模型服务没有完成请求${statusBit}。请检查服务地址、模型名、API Key 和账户状态后重试。${snippetBit}`);
    this.name = "LlmProviderError";
    this.status = options.status;
    this.detail = options.snippet;
  }
}

export function sanitizeProviderSnippet(raw: string, secrets: string[] = []) {
  let text = raw.replace(/\s+/g, " ").trim();
  for (const secret of secrets) {
    if (secret.length >= 2) {
      text = text.split(secret).join("[redacted]");
    }
  }
  text = text.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]");
  text = text.replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  return text.slice(0, 200);
}

function secretsFrom(config: OpenAICompatibleProviderConfig, request: LlmProviderRequest) {
  const secrets: string[] = [];
  const key = config.apiKey?.trim();
  if (key) secrets.push(key);
  for (const message of request.messages) {
    if (typeof message.content === "string" && message.content.length >= 2) {
      secrets.push(message.content);
    }
  }
  return secrets;
}

export function createOpenAICompatibleProvider(config: OpenAICompatibleProviderConfig): LlmProvider {
  const fetchImpl = config.fetch ?? globalThis.fetch;
  const endpoint = `${config.apiBaseUrl.replace(/\/+$/, "")}/chat/completions`;

  return {
    async complete(request: LlmProviderRequest) {
      const response = await requestChatCompletion(fetchImpl, endpoint, config, request, false);
      const json = (await response.json()) as ChatCompletionResponse;
      const usage = normalizeUsage(json.usage);
      if (usage) config.onUsage?.(usage);
      return {
        content: json.choices?.[0]?.message?.content ?? "",
        usage
      };
    },
    async *stream(request: LlmProviderRequest) {
      yield { type: "status", status: "connecting" };
      const response = await requestChatCompletion(fetchImpl, endpoint, config, request, true);
      yield { type: "status", status: "thinking" };
      yield { type: "status", status: "streaming" };

      let usage: LlmProviderUsage | undefined;
      for await (const event of readSseContent(response)) {
        if (event.usage) usage = event.usage;
        if (event.content) {
          yield { type: "chunk", content: event.content };
        }
      }

      if (usage) {
        config.onUsage?.(usage);
        yield { type: "usage", ...usage };
      }
      yield { type: "status", status: "done" };
    }
  };
}

async function requestChatCompletion(
  fetchImpl: typeof fetch,
  endpoint: string,
  config: OpenAICompatibleProviderConfig,
  request: LlmProviderRequest,
  stream: boolean
) {
  try {
    const modelName = request.modelName ?? config.modelName;
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (config.apiKey?.trim()) {
      headers.Authorization = `Bearer ${config.apiKey.trim()}`;
    }
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelName,
        messages: buildRequestMessages(request),
        stream,
        ...(stream && !isLoopbackUrl(config.apiBaseUrl)
          ? { stream_options: { include_usage: true } }
          : {}),
        ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
        ...buildModelControlParams(config, modelName)
      }),
      signal: createRequestSignal(request.signal, config.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      throw new LlmProviderError({
        status: response.status,
        snippet: sanitizeProviderSnippet(raw, secretsFrom(config, request))
      });
    }

    return response;
  } catch (error) {
    if (error instanceof LlmProviderError) throw error;
    if (isAbortError(error)) throw error;
    throw new LlmProviderError();
  }
}

function buildModelControlParams(config: OpenAICompatibleProviderConfig, modelName: string) {
  const lookup = {
    apiBaseUrl: config.apiBaseUrl,
    modelName,
    remoteProvider: config.remoteProvider
  };
  const effort = config.deepSeekThinking === "disabled" ? "none" as const : config.reasoningEffort;
  const contract = resolveModelRuntimeContract(
    { ...lookup, reasoningEffort: effort },
    config.samplingProfile ?? "dialogue"
  );
  return {
    ...(contract.sampling ?? {}),
    ...(contract.wireParams ?? {})
  };
}

function createRequestSignal(callerSignal: AbortSignal | undefined, timeoutMs: number) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal;
}

function buildRequestMessages(request: LlmProviderRequest) {
  let lastUserIndex = -1;
  if (request.imageInputs?.length) {
    for (let index = request.messages.length - 1; index >= 0; index -= 1) {
      if (request.messages[index].role === "user") {
        lastUserIndex = index;
        break;
      }
    }
  }
  return request.messages.map((message, index) => ({
    role: message.role,
    content: index === lastUserIndex
      ? [
          { type: "text", text: message.content },
          ...(request.imageInputs ?? []).map((image) => ({
            type: "image_url",
            image_url: { url: image.dataUrl }
          }))
        ]
      : message.content
  }));
}

async function* readSseContent(
  response: Response
): AsyncGenerator<{ content: string; usage?: LlmProviderUsage }> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const event = parseSseLine(line);
      if (event.content || event.usage) {
        yield event;
      }
    }
  }

  const finalEvent = parseSseLine(buffer);
  if (finalEvent.content || finalEvent.usage) {
    yield finalEvent;
  }
}

function parseSseLine(line: string): { content: string; usage?: LlmProviderUsage } {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return { content: "" };

  const data = trimmed.slice("data:".length).trim();
  if (!data || data === "[DONE]") return { content: "" };

  try {
    const parsed = JSON.parse(data) as ChatCompletionResponse;
    return {
      content: parsed.choices?.[0]?.delta?.content ?? "",
      usage: normalizeUsage(parsed.usage)
    };
  } catch {
    return { content: "" };
  }
}

function normalizeUsage(
  usage: ChatCompletionResponse["usage"] | undefined
): LlmProviderUsage | undefined {
  if (!usage) return undefined;
  const inputTokens = toNonNegativeInteger(usage.prompt_tokens ?? usage.input_tokens);
  const outputTokens = toNonNegativeInteger(usage.completion_tokens ?? usage.output_tokens);
  if (inputTokens === undefined && outputTokens === undefined) return undefined;
  return {
    inputTokens: inputTokens ?? 0,
    outputTokens: outputTokens ?? 0
  };
}

function toNonNegativeInteger(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return Math.floor(value);
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function isLoopbackUrl(apiBaseUrl: string) {
  try {
    const hostname = new URL(apiBaseUrl).hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}
