import type { AgentDescriptor, SessionMessage } from "../../../shared/src/index.js";

export interface AgentRunContext {
  sessionId: string;
  messages: SessionMessage[];
}

export interface AgentRunResult {
  content: string;
  metadata?: Record<string, unknown>;
}

export type AgentRunner = (context: AgentRunContext) => Promise<AgentRunResult>;

export const backstageAgents: AgentDescriptor[] = [
  { id: "counselor", role: "counselor", name: "Counselor Agent", enabledInV01: true },
  { id: "li-yanyun-supervisor", role: "supervisor", name: "Li Yanyun Supervisor Agent", enabledInV01: true },
  { id: "consultation-memo", role: "memory-curator", name: "Consultation Memo Agent", enabledInV01: true },
  { id: "session-conceptualization", role: "session-summarizer", name: "Session Conceptualization Agent", enabledInV01: true }
];
