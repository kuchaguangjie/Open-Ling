import type { SessionMessage } from "@shared/index";

type StreamOutcome = "done" | "cancelled" | "error";

interface AssistantStreamResultInput {
  id?: string;
  sessionId: string;
  content: string;
  finishedAt: string;
  outcome: StreamOutcome;
}

interface AssistantStreamDraftInput {
  id?: string;
  sessionId: string;
  content?: string;
  createdAt: string;
}

interface AssistantStreamProgressInput extends AssistantStreamDraftInput {
  content: string;
}

export function buildAssistantStreamDraftMessage(input: AssistantStreamDraftInput): SessionMessage {
  return {
    id: input.id ?? `msg-assistant-${Date.parse(input.createdAt) || Date.now()}`,
    sessionId: input.sessionId,
    role: "assistant",
    content: input.content ?? "",
    createdAt: input.createdAt,
    status: "sending"
  };
}

export function buildAssistantStreamProgressMessage(input: AssistantStreamProgressInput): SessionMessage {
  return buildAssistantStreamDraftMessage(input);
}

export function buildAssistantStreamResultMessage(input: AssistantStreamResultInput): SessionMessage {
  const content = input.content.trim();
  // A cancelled response is not clinical content: even if a provider had already
  // yielded some buffered text, replace it with a retryable terminal state.
  const fallbackContent = input.outcome === "cancelled" ? "已停止，可重试。" : "没有连接到模型服务。请到“设置 → 模型接入”测试当前配置后重试。";
  const isSuccessful = input.outcome === "done";

  return {
    id: input.id ?? `msg-assistant-${Date.parse(input.finishedAt) || Date.now()}`,
    sessionId: input.sessionId,
    role: "assistant",
    content: input.outcome === "cancelled" ? fallbackContent : content || fallbackContent,
    createdAt: input.finishedAt,
    status: isSuccessful ? "sent" : "failed"
  };
}
