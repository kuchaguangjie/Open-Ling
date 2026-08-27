import type { ConsultationMemo, SessionMessage, SupportedLocale } from "@shared/index";
import type { LlmProvider } from "../../providers/llmProvider.js";
import {
  getCounselorCorePrompt,
  getCounselorVoicePrompt,
  getTaskPrompt
} from "../../prompts/counselorPromptRegistry.js";
import { parseModelJson } from "../shared/modelJson.js";

export interface ConsultationMemoOutput {
  memoMd: string;
}

export const MAX_CONSULTATION_MEMO_CHARS = 5_000;

export interface BuildConsultationMemoMessagesInput {
  counselorId: string;
  counselorName: string;
  counselorCorePrompt?: string;
  counselorVoicePrompt?: string;
  locale?: SupportedLocale;
  sessionMessages: SessionMessage[];
  sessionConceptualizationMd: string;
  longTermConceptualizationMd?: string;
  supervisionMd: string;
}

export interface CreateConsultationMemoDraftInput extends BuildConsultationMemoMessagesInput {
  provider: LlmProvider;
  preparationId: string;
  sourceSessionId: string;
  modelName: string;
  now?: string;
}

export function buildConsultationMemoMessages(input: BuildConsultationMemoMessagesInput): SessionMessage[] {
  const createdAt = new Date(0).toISOString();
  const locale = input.locale ?? "zh-CN";
  const counselorCorePrompt = input.counselorCorePrompt?.trim() || getCounselorCorePrompt(input.counselorId, locale);
  const counselorVoicePrompt = input.counselorVoicePrompt?.trim()
    || (!input.counselorCorePrompt?.trim() ? getCounselorVoicePrompt(input.counselorId, locale) : "");
  return [
    {
      id: "system-next-session-memo",
      sessionId: "next-session-memo",
      role: "system",
      content: [counselorCorePrompt, getTaskPrompt("next-session-memo", locale), counselorVoicePrompt]
        .filter(Boolean)
        .join("\n\n"),
      createdAt,
      status: "sent"
    },
    {
      id: "user-next-session-memo-material",
      sessionId: "next-session-memo",
      role: "user",
      content: locale === "en-US" ? [
        `Current counselor: ${input.counselorName} (${input.counselorId})`,
        "",
        "## Verbatim session (for attribution checking only)",
        formatSessionMessages(input.sessionMessages) || "No usable client or counselor messages are available.",
        "",
        "## Full single-session case formulation",
        input.sessionConceptualizationMd.trim(),
        "",
        "## Current longitudinal case formulation",
        input.longTermConceptualizationMd?.trim() || "No longitudinal case formulation is currently available.",
        "",
        "## Li Yanyun's supervision review",
        input.supervisionMd.trim()
      ].join("\n") : [
        `当前咨询师：${input.counselorName}（${input.counselorId}）`,
        "",
        "## 本次会谈原文（仅用于核对材料归属）",
        formatSessionMessages(input.sessionMessages) || "本次会谈没有可用的用户与咨询师消息。",
        "",
        "## 单次完整个案概念化",
        input.sessionConceptualizationMd.trim(),
        "",
        "## 最新长期完整个案概念化",
        input.longTermConceptualizationMd?.trim() || "当前没有长期个案概念化。",
        "",
        "## 李燕云督导意见",
        input.supervisionMd.trim()
      ].join("\n"),
      createdAt,
      status: "sent"
    }
  ];
}

export async function createConsultationMemoDraft(
  input: CreateConsultationMemoDraftInput
): Promise<ConsultationMemo> {
  const response = await input.provider.complete({
    messages: buildConsultationMemoMessages(input),
    maxTokens: 4096
  });
  const parsed = parseConsultationMemoOutput(response.content);
  const now = input.now ?? new Date().toISOString();
  return {
    id: `consultation-memo-${input.preparationId}`,
    preparationId: input.preparationId,
    sourceSessionId: input.sourceSessionId,
    counselorId: input.counselorId,
    modelName: input.modelName,
    memoMd: parsed.memoMd,
    status: "ready",
    createdAt: now,
    updatedAt: now
  };
}

export function parseConsultationMemoOutput(raw: string): ConsultationMemoOutput {
  const parsed = parseModelJson(raw);
  if (!parsed || typeof parsed !== "object") throw new Error("consultation memo output must be an object");
  const memoMd = typeof parsed.memoMd === "string" ? normalizeConsultationMemoHeading(parsed.memoMd) : "";
  if (!memoMd) throw new Error("consultation memo missing memoMd");
  if (memoMd.length > MAX_CONSULTATION_MEMO_CHARS) {
    throw new Error(`consultation memo exceeds ${MAX_CONSULTATION_MEMO_CHARS} characters`);
  }
  return { memoMd };
}

export function normalizeConsultationMemoHeading(value: string) {
  return value
    .trim()
    .replace(/^#\s*(?:下一次|下次|下一场|后续)咨询备忘录[ \t]*$/mu, "# 咨询备忘录")
    .replace(/^#\s*(?:Next|Future|Subsequent) Session Counseling Memo[ \t]*$/imu, "# Counseling Memo");
}

function formatSessionMessages(messages: SessionMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .filter((message) => message.status !== "failed")
    .map((message) => `${message.role}: ${message.content.trim()}`)
    .filter((line) => line.trim().length > 0)
    .join("\n\n");
}
