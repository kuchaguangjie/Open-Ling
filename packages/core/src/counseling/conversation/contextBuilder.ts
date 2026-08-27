import {
  type CounselingPromptSnapshot,
  type SessionMessage,
  type SupportedLocale
} from "../../../../shared/src/index.js";
import {
  buildCounselingContextPlan,
  type ContextBudgetOptions
} from "./contextBudgetPlanner.js";
import { getCounselingPromptLocale } from "./promptSnapshot.js";
import { buildCounselorSafetyPrompt } from "../../safety/counselorPackageSafety.js";
import {
  getCounselorCorePrompt,
  getCounselorVoicePrompt,
  getCounselingDialogueScenePrompt,
  getPolicyPrompt,
  getSharedCounselingValuesPrompt,
  getTeamPrompt
} from "../../prompts/counselorPromptRegistry.js";
import { normalizeConsultationMemoHeading } from "../post-session/consultationMemo.js";
import {
  applyReasonerUserPrefix,
  compilerIdOf,
  identityOnlySystemPrompt,
  splitChatSystemParts
} from "../compiler/promptCompiler.js";
import type { SafetyLane } from "../guards/safetyRouter.js";

export interface BuildCounselingMessagesInput extends ContextBudgetOptions {
  counselorId: string;
  teamId: string;
  messages: SessionMessage[];
  promptSnapshot?: CounselingPromptSnapshot;
  rollingSummary?: string;
  basicProfile?: string;
  consultationMemo?: string;
  safetyLane?: SafetyLane;
}

export const DEFAULT_CONSULTATION_MEMO_CONTEXT_BUDGET = 4_000;

/** Re-emphasize the reviewed realtime safety policy. No new clinical copy. */
export function extractCrisisSection(policy: string): string {
  const trimmed = policy.trim();
  if (!trimmed) return "";
  // Legacy long-form policies used a dedicated ## crisis section; prefer that slice.
  const markers = ["## 危险明确或无法排除时", "When immediate danger may be present:"];
  let start = -1;
  for (const marker of markers) {
    start = policy.indexOf(marker);
    if (start >= 0) break;
  }
  if (start >= 0) {
    const rest = policy.slice(start);
    const end = rest.indexOf("\n## ", 1);
    return (end < 0 ? rest : rest.slice(0, end)).trim();
  }
  // Current principles doc is already the reviewed crisis stance — restate it in full.
  return trimmed;
}

export function buildCounselingMessages(input: BuildCounselingMessagesInput): SessionMessage[] {
  const locale = getCounselingPromptLocale(input.promptSnapshot);
  const counselingEthicsPrompt = getPolicyPrompt("counseling-ethics", locale);
  const realtimeSafetyPrompt = buildCounselorSafetyPrompt(input.counselorId, locale);
  const crisisEmphasis =
    input.safetyLane && input.safetyLane !== "none"
      ? extractCrisisSection(realtimeSafetyPrompt)
      : "";
  const compilerId = compilerIdOf(input.promptSnapshot);
  const splitParts =
    compilerId === "chat-split-system" ? splitChatSystemParts(input.promptSnapshot) : null;

  let counselorSystemPrompt = buildRuntimeCounselingSystemPrompt({
    counselorId: input.counselorId,
    teamId: input.teamId,
    locale,
    promptSnapshot: input.promptSnapshot,
    counselingEthicsPrompt,
    realtimeSafetyPrompt
  });

  if (compilerId === "reasoner-user-prefix") {
    counselorSystemPrompt = identityOnlySystemPrompt(input.promptSnapshot, counselorSystemPrompt);
  } else if (splitParts) {
    counselorSystemPrompt = [
      splitParts.core,
      counselingEthicsPrompt,
      realtimeSafetyPrompt
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const counselorVoicePrompt = getRuntimeCounselorVoicePrompt({
    counselorId: input.counselorId,
    locale,
    promptSnapshot: input.promptSnapshot
  });
  const contextPlan = buildCounselingContextPlan({
    messages: input.messages,
    rollingSummary: input.rollingSummary,
    basicProfile: input.basicProfile,
    consultationMemo: input.consultationMemo,
    systemPrompt: [counselorSystemPrompt, counselorVoicePrompt].filter(Boolean).join("\n\n"),
    budget: {
      ...input,
      consultationMemoBudgetTokens:
        input.consultationMemoBudgetTokens ?? DEFAULT_CONSULTATION_MEMO_CONTEXT_BUDGET
    }
  });
  const recentMessages = contextPlan.includedMessages;
  const sessionId = recentMessages[0]?.sessionId ?? input.messages[0]?.sessionId ?? "system";
  const optionalSystemContextMessages = buildOptionalSystemContextMessages({
    sessionId,
    basicProfile: contextPlan.basicProfileSelection.content,
    rollingSummary: contextPlan.shouldInjectRollingSummary ? input.rollingSummary : undefined,
    consultationMemo: contextPlan.consultationMemoSelection.content,
    locale
  });
  const assembled: SessionMessage[] = [
    {
      id: `system-${input.counselorId}`,
      sessionId,
      role: "system",
      content: counselorSystemPrompt,
      createdAt: new Date(0).toISOString(),
      status: "sent"
    },
    ...optionalSystemContextMessages,
    ...(splitParts && splitParts.values.trim()
      ? [
          {
            id: "system-shared-values",
            sessionId,
            role: "system" as const,
            content: [splitParts.values, splitParts.team].filter((item) => item.trim()).join("\n\n"),
            createdAt: new Date(0).toISOString(),
            status: "sent" as const
          }
        ]
      : []),
    ...(splitParts && splitParts.scene.trim()
      ? [
          {
            id: "system-counseling-scene",
            sessionId,
            role: "system" as const,
            content: splitParts.scene,
            createdAt: new Date(0).toISOString(),
            status: "sent" as const
          }
        ]
      : []),
    ...(counselorVoicePrompt
      ? [
          {
            id: `system-${input.counselorId}-voice`,
            sessionId,
            role: "system" as const,
            content: counselorVoicePrompt,
            createdAt: new Date(0).toISOString(),
            status: "sent" as const
          }
        ]
      : []),
    ...(crisisEmphasis
      ? [
          {
            id: "system-safety-emphasis",
            sessionId,
            role: "system" as const,
            content: crisisEmphasis,
            createdAt: new Date(0).toISOString(),
            status: "sent" as const
          }
        ]
      : []),
    ...recentMessages.map(({ id, sessionId: recentSessionId, role, content, createdAt, status }) => ({
      id,
      sessionId: recentSessionId,
      role,
      content,
      createdAt,
      status
    }))
  ];
  return applyReasonerUserPrefix(assembled, input.promptSnapshot);
}

function getRuntimeCounselorVoicePrompt({
  counselorId,
  locale,
  promptSnapshot
}: {
  counselorId: string;
  locale: SupportedLocale;
  promptSnapshot?: CounselingPromptSnapshot;
}) {
  if (!promptSnapshot) return getCounselorVoicePrompt(counselorId, locale);
  return promptSnapshot.version === 5 ? promptSnapshot.counselorVoicePrompt.trim() : "";
}

function buildRuntimeCounselingSystemPrompt({
  counselorId,
  teamId,
  locale,
  promptSnapshot,
  counselingEthicsPrompt,
  realtimeSafetyPrompt
}: {
  counselorId: string;
  teamId: string;
  locale: SupportedLocale;
  promptSnapshot?: CounselingPromptSnapshot;
  counselingEthicsPrompt: string;
  realtimeSafetyPrompt: string;
}) {
  if (!promptSnapshot) {
    return [
      getCounselorCorePrompt(counselorId, locale),
      getSharedCounselingValuesPrompt(locale),
      counselingEthicsPrompt,
      getTeamPrompt(teamId),
      getCounselingDialogueScenePrompt(counselorId, locale),
      realtimeSafetyPrompt
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (promptSnapshot.version === 1) {
    return [promptSnapshot.systemPrompt, counselingEthicsPrompt, realtimeSafetyPrompt]
      .filter(Boolean)
      .join("\n\n");
  }

  const sharedValues =
    promptSnapshot.version === 2 ? "" : promptSnapshot.sharedCounselingValuesPrompt;
  return [
    promptSnapshot.counselorCorePrompt,
    sharedValues,
    counselingEthicsPrompt,
    promptSnapshot.teamPrompt,
    promptSnapshot.counselingTaskPrompt,
    realtimeSafetyPrompt
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildOptionalSystemContextMessages({
  sessionId,
  rollingSummary,
  basicProfile,
  consultationMemo,
  locale
}: {
  sessionId: string;
  rollingSummary?: string;
  basicProfile?: string;
  consultationMemo?: string;
  locale: SupportedLocale;
}): SessionMessage[] {
  const contextMessages: SessionMessage[] = [];
  const profile = basicProfile?.trim();
  const rolling = rollingSummary?.trim();
  const memo = consultationMemo ? normalizeConsultationMemoHeading(consultationMemo) : "";

  if (profile) {
    contextMessages.push({
      id: "system-basic-profile",
      sessionId,
      role: "system",
      content:
        locale === "en-US"
          ? `The following basic profile was provided by the client. Use it only for appropriate address and basic context; do not treat it as long-term memory or a conclusion about the client. The client's current words always take priority:\n${profile}`
          : `以下是用户主动填写的基础个人资料，只用于称呼和理解基本背景；不要把它当作长期记忆或对用户的定论。当前用户本轮表达始终优先：\n${profile}`,
      createdAt: new Date(0).toISOString(),
      status: "sent"
    });
  }

  if (rolling) {
    contextMessages.push({
      id: "system-rolling-summary",
      sessionId,
      role: "system",
      content:
        locale === "en-US"
          ? `The following summarizes earlier session context that is not included verbatim. Recent verbatim messages remain authoritative:\n${rolling}`
          : `以下是未逐字注入的较早会谈脉络摘要；最近原文仍以逐字消息为准：\n${rolling}`,
      createdAt: new Date(0).toISOString(),
      status: "sent"
    });
  }

  if (memo) {
    contextMessages.push({
      id: "system-consultation-memo",
      sessionId,
      role: "system",
      content:
        locale === "en-US"
          ? `The following is an internal counseling memo prepared by the current counselor after the previous session, informed by the full case formulation and independent supervision. It supports re-entering the therapeutic relationship; it is not a factual record, diagnosis, or treatment plan. The client's current words always take priority. Any understanding here may be revised or withdrawn, and people or events in the memo need not be raised unless they arise naturally:\n${memo}`
          : `以下是当前咨询师在上次会谈结束后，结合完整个案概念化和独立督导意见，为本次会谈准备的内部咨询备忘录。它用于重新进入咨询关系，不是事实档案、诊断结论或咨询计划。来访者当前表达始终优先，备忘录中的理解可以被修正或撤回，也不要求主动提及其中的人物与事件：\n${memo}`,
      createdAt: new Date(0).toISOString(),
      status: "sent"
    });
  }

  return contextMessages;
}
