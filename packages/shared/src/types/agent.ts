export type AgentRole = "counselor" | "supervisor" | "memory-curator" | "session-summarizer";

export interface AgentDescriptor {
  id: string;
  role: AgentRole;
  name: string;
  enabledInV01: boolean;
}
