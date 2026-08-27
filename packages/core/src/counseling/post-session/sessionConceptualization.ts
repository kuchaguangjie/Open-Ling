import type { SessionConceptualization, SessionMessage, SupportedLocale } from "@shared/index";
import type { LlmProvider } from "../../providers/llmProvider.js";
import {
  getCounselorCorePrompt,
  getCounselorVoicePrompt,
  getTaskPrompt
} from "../../prompts/counselorPromptRegistry.js";
import { parseModelJson } from "../shared/modelJson.js";

export interface SessionConceptualizationOutput {
  fullMd: string;
  safetyNoteCandidates?: string[];
}

export interface BuildSessionConceptualizationMessagesInput {
  counselorId: string;
  counselorName: string;
  counselorCorePrompt?: string;
  counselorVoicePrompt?: string;
  locale?: SupportedLocale;
  sessionMessages: SessionMessage[];
}

export interface CreateSessionConceptualizationDraftInput extends BuildSessionConceptualizationMessagesInput {
  provider: LlmProvider;
  sessionId: string;
  modelName: string;
  now?: string;
}

export function buildSessionConceptualizationMessages(input: BuildSessionConceptualizationMessagesInput): SessionMessage[] {
  const createdAt = new Date(0).toISOString();
  const locale = input.locale ?? "zh-CN";
  const counselorCorePrompt = input.counselorCorePrompt?.trim() || getCounselorCorePrompt(input.counselorId, locale);
  const counselorVoicePrompt = input.counselorVoicePrompt?.trim()
    || (!input.counselorCorePrompt?.trim() ? getCounselorVoicePrompt(input.counselorId, locale) : "");
  return [
    {
      id: "system-session-conceptualization-task",
      sessionId: "session-conceptualization",
      role: "system",
      content: [
        counselorCorePrompt,
        getTaskPrompt("session-conceptualization", locale),
        counselorVoicePrompt
      ].filter(Boolean).join("\n\n"),
      createdAt,
      status: "sent"
    },
    {
      id: "user-session-conceptualization-material",
      sessionId: "session-conceptualization",
      role: "user",
      content: locale === "en-US" ? [
        `Current counselor: ${input.counselorName} (${input.counselorId})`,
        "",
        "## Session material",
        formatSessionMessages(input.sessionMessages)
      ].join("\n") : [
        `当前咨询师：${input.counselorName}（${input.counselorId}）`,
        "",
        "## 本次会谈材料",
        formatSessionMessages(input.sessionMessages)
      ].join("\n"),
      createdAt,
      status: "sent"
    }
  ];
}

export async function createSessionConceptualizationDraft(
  input: CreateSessionConceptualizationDraftInput
): Promise<SessionConceptualization> {
  const response = await input.provider.complete({
    messages: buildSessionConceptualizationMessages(input),
    maxTokens: 8192
  });
  const parsed = parseSessionConceptualizationOutput(response.content);
  const now = input.now ?? new Date().toISOString();
  return {
    id: `conceptualization-${input.sessionId}`,
    sessionId: input.sessionId,
    counselorId: input.counselorId,
    modelName: input.modelName,
    fullMd: parsed.fullMd,
    status: "ready",
    createdAt: now,
    updatedAt: now
  };
}

export function parseSessionConceptualizationOutput(raw: string): SessionConceptualizationOutput {
  const parsed = parseModelJson(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("session conceptualization output must be an object");
  }
  const fullMd = typeof parsed.fullMd === "string" ? parsed.fullMd.trim() : "";
  if (!fullMd) throw new Error("session conceptualization missing fullMd");
  const safetyNoteCandidates = Array.isArray(parsed.safetyNoteCandidates)
    ? parsed.safetyNoteCandidates.filter((item: unknown): item is string => typeof item === "string")
    : undefined;
  return safetyNoteCandidates ? { fullMd, safetyNoteCandidates } : { fullMd };
}

function formatSessionMessages(messages: SessionMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .filter((message) => message.status !== "failed")
    .map((message) => `${message.role}: ${message.content.trim()}`)
    .filter((line) => line.trim().length > 0)
    .join("\n\n");
}
