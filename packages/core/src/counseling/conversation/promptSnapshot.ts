import {
  requireCounselorPackage,
  type CounselingPromptSnapshot,
  type CounselingSession,
  type SupportedLocale
} from "../../../../shared/src/index.js";
import {
  getCounselorCorePrompt,
  getCounselorVoicePrompt,
  getCounselingDialogueScenePrompt,
  getPolicyPrompt,
  getSharedCounselingValuesPrompt,
  getTeamPrompt
} from "../../prompts/counselorPromptRegistry.js";
import {
  resolveModelRuntimeContract,
  type CapabilityLookup
} from "../../providers/modelCapabilityTable.js";
import type { ApiSettings, ModelReasoningEffort } from "../../../../shared/src/index.js";

export function buildCounselingSystemPrompt({
  counselorId,
  teamId,
  locale = "zh-CN"
}: {
  counselorId: string;
  teamId?: string;
  locale?: SupportedLocale;
}) {
  return [
    getCounselorCorePrompt(counselorId, locale),
    getSharedCounselingValuesPrompt(locale),
    getPolicyPrompt("counseling-ethics", locale),
    getTeamPrompt(teamId ?? "one-way-mirror"),
    getCounselingDialogueScenePrompt(counselorId, locale),
    getCounselorVoicePrompt(counselorId, locale)
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function createCounselingPromptSnapshot({
  counselorId,
  teamId,
  modelName,
  locale = "zh-CN",
  createdAt = new Date().toISOString(),
  api
}: {
  counselorId: string;
  teamId?: string;
  modelName: string;
  locale?: SupportedLocale;
  createdAt?: string;
  api?: CapabilityLookup & Pick<ApiSettings, "reasoningEffort">;
}): CounselingPromptSnapshot {
  const counselorCorePrompt = getCounselorCorePrompt(counselorId, locale);
  const counselorVoicePrompt = getCounselorVoicePrompt(counselorId, locale);
  const sharedCounselingValuesPrompt = getSharedCounselingValuesPrompt(locale);
  const counselingTaskPrompt = getCounselingDialogueScenePrompt(counselorId, locale);
  const teamPrompt = getTeamPrompt(teamId ?? "one-way-mirror");
  const counselorPackage = requireCounselorPackage(counselorId);
  const systemPrompt = [
    counselorCorePrompt,
    sharedCounselingValuesPrompt,
    teamPrompt,
    counselingTaskPrompt,
    counselorVoicePrompt
  ].filter(Boolean).join("\n\n");
  const runtimeContract = resolveModelRuntimeContract(
    api ?? {
      apiBaseUrl: "",
      modelName,
      reasoningEffort: undefined as ModelReasoningEffort | undefined
    },
    "dialogue",
    { warn: () => {} }
  );
  return {
    version: 5,
    locale,
    counselorId,
    teamId,
    modelName,
    counselorPackageVersion: counselorPackage.version,
    promptContentHash: createStableContentHash(systemPrompt),
    counselorCorePrompt,
    sharedCounselingValuesPrompt,
    counselingTaskPrompt,
    counselorVoicePrompt,
    teamPrompt,
    systemPrompt,
    createdAt,
    runtimeContract
  };
}

export function getSnapshotCounselorCorePrompt(snapshot?: CounselingPromptSnapshot) {
  return snapshot?.version === 2 || snapshot?.version === 3 || snapshot?.version === 4 || snapshot?.version === 5
    ? snapshot.counselorCorePrompt.trim() || undefined
    : undefined;
}

export function getSnapshotCounselorVoicePrompt(snapshot?: CounselingPromptSnapshot) {
  return snapshot?.version === 5
    ? snapshot.counselorVoicePrompt.trim() || undefined
    : undefined;
}

export function getCounselingPromptLocale(snapshot?: CounselingPromptSnapshot): SupportedLocale {
  return snapshot?.version === 3 || snapshot?.version === 4 || snapshot?.version === 5
    ? snapshot.locale ?? "zh-CN"
    : "zh-CN";
}

export function createStableContentHash(content: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function ensureCounselingPromptSnapshot(
  session: CounselingSession,
  locale: SupportedLocale = "zh-CN",
  api?: CapabilityLookup & Pick<ApiSettings, "reasoningEffort">
): CounselingSession {
  if (session.promptSnapshot?.systemPrompt.trim()) return session;
  const createdAt = session.createdAt ?? session.startedAt ?? new Date().toISOString();
  return {
    ...session,
    promptSnapshot: createCounselingPromptSnapshot({
      counselorId: session.counselorId,
      teamId: session.teamId,
      modelName: session.modelName,
      locale,
      createdAt,
      api
    })
  };
}
