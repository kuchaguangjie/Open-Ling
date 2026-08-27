export type MessageRole = "system" | "user" | "assistant";
export type MessageStatus = "draft" | "sending" | "sent" | "failed";

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  status?: MessageStatus;
  metadata?: Record<string, unknown>;
}
