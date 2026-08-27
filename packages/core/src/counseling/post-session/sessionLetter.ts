import type {
  SessionConceptualization,
  SessionLetter,
  SessionMessage,
  SupportedLocale
} from "@shared/index";
import { formatSessionLetterMarkdown, normalizeSessionLetterMarkdown } from "../../../../shared/src/sessionLetterText.js";
import type { LlmProvider } from "../../providers/llmProvider.js";
import {
  getCounselorCorePrompt,
  getCounselorVoicePrompt,
  getTaskPrompt
} from "../../prompts/counselorPromptRegistry.js";

export interface SessionLetterOutput {
  letterMd: string;
}

export interface BuildSessionLetterMessagesInput {
  counselorId: string;
  counselorName: string;
  counselorCorePrompt?: string;
  counselorVoicePrompt?: string;
  locale?: SupportedLocale;
  clientDisplayName?: string;
  sessionMessages: SessionMessage[];
  sessionConceptualization?: SessionConceptualization | null;
}

export interface CreateSessionLetterDraftInput extends BuildSessionLetterMessagesInput {
  provider: LlmProvider;
  sessionId: string;
  modelName: string;
  now?: string;
}

export function buildSessionLetterMessages(input: BuildSessionLetterMessagesInput): SessionMessage[] {
  const createdAt = new Date(0).toISOString();
  const locale = input.locale ?? "zh-CN";
  const counselorCorePrompt = input.counselorCorePrompt?.trim() || getCounselorCorePrompt(input.counselorId, locale);
  const counselorVoicePrompt = input.counselorVoicePrompt?.trim()
    || (!input.counselorCorePrompt?.trim() ? getCounselorVoicePrompt(input.counselorId, locale) : "");
  return [
    {
      id: "system-session-letter-task",
      sessionId: "session-letter",
      role: "system",
      content: [counselorCorePrompt, getTaskPrompt("session-letter", locale), counselorVoicePrompt]
        .filter(Boolean)
        .join("\n\n"),
      createdAt,
      status: "sent"
    },
    {
      id: "user-session-letter-material",
      sessionId: "session-letter",
      role: "user",
      content: locale === "en-US" ? [
        `Current counselor: ${input.counselorName} (${input.counselorId})`,
        `Client's preferred form of address: ${formatClientDisplayName(input.clientDisplayName, locale)}`,
        "",
        "## Private background for this session",
        formatConceptualization(input.sessionConceptualization, locale),
        "",
        "## Verbatim session",
        formatSessionMessages(input.sessionMessages, locale)
      ].join("\n") : [
        `当前咨询师：${input.counselorName}（${input.counselorId}）`,
        `来访者称呼：${formatClientDisplayName(input.clientDisplayName, locale)}`,
        "",
        "## 本次会谈后台参考",
        formatConceptualization(input.sessionConceptualization, locale),
        "",
        "## 本次会谈原文",
        formatSessionMessages(input.sessionMessages, locale)
      ].join("\n"),
      createdAt,
      status: "sent"
    }
  ];
}

export async function createSessionLetterDraft(input: CreateSessionLetterDraftInput): Promise<SessionLetter> {
  const response = await input.provider.complete({
    messages: buildSessionLetterMessages(input),
    maxTokens: 6144
  });
  const parsed = parseSessionLetterOutput(response.content);
  const now = input.now ?? new Date().toISOString();
  return {
    id: `session-letter-${input.sessionId}`,
    sessionId: input.sessionId,
    counselorId: input.counselorId,
    modelName: input.modelName,
    letterMd: formatSessionLetterMarkdown(parsed.letterMd, input.clientDisplayName, input.locale ?? "zh-CN"),
    status: "ready",
    createdAt: now,
    updatedAt: now
  };
}

export function parseSessionLetterOutput(raw: string): SessionLetterOutput {
  const text = stripMarkdownFence(raw);
  if (!text.startsWith("{")) {
    return validateSessionLetter(normalizeSessionLetterMarkdown(text).trim());
  }

  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("session letter output must be an object");
  }
  const letterMd = typeof parsed.letterMd === "string"
    ? normalizeSessionLetterMarkdown(parsed.letterMd).trim()
    : "";
  return validateSessionLetter(letterMd);
}

function validateSessionLetter(letterMd: string): SessionLetterOutput {
  if (!letterMd) throw new Error("session letter missing letterMd");
  if (letterMd.length > 12_000) {
    throw new Error("session letter is too long");
  }
  return { letterMd };
}

function formatConceptualization(conceptualization: SessionConceptualization | null | undefined, locale: SupportedLocale) {
  if (!conceptualization || conceptualization.status !== "ready" || !conceptualization.fullMd.trim()) {
    return locale === "en-US"
      ? "No private case formulation is available. Write only from the verbatim session."
      : "本次没有可用的后台个案概念化。请只根据会谈原文写信。";
  }
  return [
    locale === "en-US"
      ? "The following is a private case formulation for understanding only. Do not expose its clinical terminology, diagnostic language, or provisional hypotheses in the letter."
      : "以下是后台个案概念化，只能作为理解材料。来信不能暴露其中的专业术语、诊断化语言或阶段性假设。",
    "",
    conceptualization.fullMd.trim()
  ].join("\n");
}

function formatSessionMessages(messages: SessionMessage[], locale: SupportedLocale) {
  const formatted = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .filter((message) => message.status !== "failed")
    .map((message) => `${message.role}: ${message.content.trim()}`)
    .filter((line) => line.trim().length > 0)
    .join("\n\n");
  return formatted || (locale === "en-US" ? "No usable session transcript is available." : "本次会谈没有可用原文。");
}

function formatClientDisplayName(displayName: string | undefined, locale: SupportedLocale) {
  const normalized = displayName?.trim();
  return normalized || (locale === "en-US" ? "Not set. Do not add a salutation line." : "未设置，不得添加称呼行。");
}

function stripMarkdownFence(raw: string) {
  const text = String(raw ?? "").trim();
  const fence = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n\s*```$/);
  return (fence ? fence[1] : text).trim();
}
