import type {
  CounselingSession,
  LongTermConceptualization,
  SessionConceptualization,
  SessionMessage,
  SupportedLocale
} from "@shared/index";
import type { LlmProvider } from "../../providers/llmProvider.js";
import {
  getCounselorCorePrompt,
  getCounselorVoicePrompt,
  getTaskPrompt
} from "../../prompts/counselorPromptRegistry.js";
import { parseModelJson } from "../shared/modelJson.js";

export interface LongTermConceptualizationOutput {
  fullMd: string;
}

export interface LongTermSessionMaterial {
  session: CounselingSession;
  conceptualization: SessionConceptualization;
}

export interface BuildLongTermConceptualizationMessagesInput {
  counselorId: string;
  counselorName: string;
  counselorCorePrompt?: string;
  counselorVoicePrompt?: string;
  locale?: SupportedLocale;
  previous?: LongTermConceptualization | null;
  materials: LongTermSessionMaterial[];
  recentSession: CounselingSession;
  recentMessages: SessionMessage[];
  rollingSummary?: string;
}

export interface CreateLongTermConceptualizationDraftInput extends BuildLongTermConceptualizationMessagesInput {
  provider: LlmProvider;
  modelName: string;
  now?: string;
}

const recentContextCharLimit = 24_000;

export function selectLongTermSessionMaterials({
  previous,
  materials
}: {
  previous?: LongTermConceptualization | null;
  materials: LongTermSessionMaterial[];
}) {
  return isUsablePreviousLongTermConceptualization(previous) ? materials.slice(-3) : materials;
}

export function buildLongTermConceptualizationMessages(input: BuildLongTermConceptualizationMessagesInput): SessionMessage[] {
  const createdAt = new Date(0).toISOString();
  const locale = input.locale ?? "zh-CN";
  const counselorVoicePrompt = input.counselorVoicePrompt?.trim()
    || (!input.counselorCorePrompt?.trim() ? getCounselorVoicePrompt(input.counselorId, locale) : "");
  return [
    {
      id: "system-long-term-conceptualization-task",
      sessionId: "long-term-conceptualization",
      role: "system",
      content: [
        input.counselorCorePrompt?.trim() || getCounselorCorePrompt(input.counselorId, locale),
        getTaskPrompt("long-term-conceptualization", locale),
        counselorVoicePrompt
      ].filter(Boolean).join("\n\n"),
      createdAt,
      status: "sent"
    },
    {
      id: "user-long-term-conceptualization-material",
      sessionId: "long-term-conceptualization",
      role: "user",
      content: buildMaterialContent(input),
      createdAt,
      status: "sent"
    }
  ];
}

export async function createLongTermConceptualizationDraft(
  input: CreateLongTermConceptualizationDraftInput
): Promise<LongTermConceptualization> {
  const response = await input.provider.complete({
    messages: buildLongTermConceptualizationMessages(input),
    maxTokens: 12_000
  });
  const parsed = parseLongTermConceptualizationOutput(response.content);
  const now = input.now ?? new Date().toISOString();
  const latest = input.materials[input.materials.length - 1];
  return {
    id: `long-term-conceptualization-${input.counselorId}`,
    counselorId: input.counselorId,
    modelName: input.modelName,
    fullMd: parsed.fullMd,
    coveredSessionIds: input.materials.map((material) => material.session.id),
    coveredUntilSessionId: latest?.session.id,
    coveredUntilEndedAt: latest ? getSessionEndedOrUpdatedAt(latest.session) : undefined,
    status: "ready",
    createdAt: now,
    updatedAt: now
  };
}

export function parseLongTermConceptualizationOutput(raw: string): LongTermConceptualizationOutput {
  const parsed = parseModelJson(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("long-term conceptualization output must be an object");
  }
  const fullMd = typeof parsed.fullMd === "string" ? parsed.fullMd.trim() : "";
  if (!fullMd) throw new Error("long-term conceptualization missing fullMd");
  return { fullMd };
}

function buildMaterialContent(input: BuildLongTermConceptualizationMessagesInput) {
  if (input.locale === "en-US") return buildEnglishMaterialContent(input);
  const selectedMaterials = selectLongTermSessionMaterials({
    previous: input.previous,
    materials: input.materials
  });
  const sections = [
    "# 当前场景",
    "请基于以下材料更新长期个案概念化。新近材料优先；旧理解可修订；不要把假设写成事实。",
    "",
    "# 当前咨询师",
    `- counselorId：${input.counselorId}`,
    `- 咨询师：${input.counselorName}`,
    ""
  ];

  const previous = isUsablePreviousLongTermConceptualization(input.previous) ? input.previous : null;

  if (previous) {
    sections.push(
      "## 0. 上一版长期个案概念化",
      "- 材料类型：long_term_conceptualization.fullMd",
      `- updatedAt：${previous.updatedAt}`,
      `- coveredUntilSessionId：${previous.coveredUntilSessionId ?? "无"}`,
      "",
      previous.fullMd,
      ""
    );
  }

  selectedMaterials.forEach((material, index) => {
    sections.push(
      `## ${index + 1}. 单次会谈个案概念化`,
      "- 材料类型：session_conceptualization.fullMd",
      `- sessionId：${material.session.id}`,
      `- sessionTitle：${material.session.title}`,
      `- counselorId：${material.session.counselorId}`,
      `- startedAt：${material.session.startedAt ?? material.session.createdAt}`,
      `- endedAt：${material.session.endedAt ?? "无"}`,
      `- conceptualizationUpdatedAt：${material.conceptualization.updatedAt}`,
      "",
      material.conceptualization.fullMd,
      ""
    );
  });

  sections.push(
    "## 最近一次会谈原始上下文",
    "- 材料类型：raw_messages 或 rolling_summary + recent_messages",
    `- sessionId：${input.recentSession.id}`,
    `- sessionTitle：${input.recentSession.title}`,
    `- startedAt：${input.recentSession.startedAt ?? input.recentSession.createdAt}`,
    `- endedAt：${input.recentSession.endedAt ?? "无"}`,
    "",
    formatRecentContext(input),
    ""
  );

  return sections.join("\n");
}

function buildEnglishMaterialContent(input: BuildLongTermConceptualizationMessagesInput) {
  const selectedMaterials = selectLongTermSessionMaterials({
    previous: input.previous,
    materials: input.materials
  });
  const sections = [
    "# Current task",
    "Update the longitudinal case formulation from the material below. Newer material takes priority; revise prior understanding when warranted; never write hypotheses as facts.",
    "",
    "# Current counselor",
    `- counselorId: ${input.counselorId}`,
    `- counselor: ${input.counselorName}`,
    ""
  ];
  const previous = isUsablePreviousLongTermConceptualization(input.previous) ? input.previous : null;
  if (previous) {
    sections.push(
      "## 0. Previous longitudinal case formulation",
      "- material type: long_term_conceptualization.fullMd",
      `- updatedAt: ${previous.updatedAt}`,
      `- coveredUntilSessionId: ${previous.coveredUntilSessionId ?? "none"}`,
      "",
      previous.fullMd,
      ""
    );
  }
  selectedMaterials.forEach((material, index) => {
    sections.push(
      `## ${index + 1}. Single-session case formulation`,
      "- material type: session_conceptualization.fullMd",
      `- sessionId: ${material.session.id}`,
      `- sessionTitle: ${material.session.title}`,
      `- counselorId: ${material.session.counselorId}`,
      `- startedAt: ${material.session.startedAt ?? material.session.createdAt}`,
      `- endedAt: ${material.session.endedAt ?? "none"}`,
      `- conceptualizationUpdatedAt: ${material.conceptualization.updatedAt}`,
      "",
      material.conceptualization.fullMd,
      ""
    );
  });
  sections.push(
    "## Raw context from the most recent session",
    "- material type: raw_messages or rolling_summary + recent_messages",
    `- sessionId: ${input.recentSession.id}`,
    `- sessionTitle: ${input.recentSession.title}`,
    `- startedAt: ${input.recentSession.startedAt ?? input.recentSession.createdAt}`,
    `- endedAt: ${input.recentSession.endedAt ?? "none"}`,
    "",
    formatRecentContext(input),
    ""
  );
  return sections.join("\n");
}

function formatRecentContext(input: BuildLongTermConceptualizationMessagesInput) {
  const raw = formatSessionMessages(input.recentMessages);
  if (raw.length <= recentContextCharLimit) {
    return raw || (input.locale === "en-US" ? "No usable transcript is available for the most recent session." : "最近一次会谈没有可用原文。");
  }
  const recentWindow = raw.slice(-recentContextCharLimit);
  const summary = input.rollingSummary?.trim();
  return [
    summary
      ? `### rolling summary\n${summary}`
      : input.locale === "en-US"
        ? "### rolling summary\nNo rolling summary is available."
        : "### rolling summary\n无可用 rolling summary。",
    "",
    "### recent raw messages",
    recentWindow
  ].join("\n");
}

function formatSessionMessages(messages: SessionMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .filter((message) => message.status !== "failed")
    .map((message) => `${message.role}: ${message.content.trim()}`)
    .filter((line) => line.trim().length > 0)
    .join("\n\n");
}

function getSessionEndedOrUpdatedAt(session: CounselingSession) {
  return session.endedAt ?? session.updatedAt ?? session.startedAt ?? session.createdAt;
}


function isUsablePreviousLongTermConceptualization(previous?: LongTermConceptualization | null) {
  return previous?.status === "ready" && previous.fullMd.trim().length > 0;
}
