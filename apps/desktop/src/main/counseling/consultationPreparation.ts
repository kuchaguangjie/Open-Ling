import { getDefaultCounselors } from "../../../../../packages/shared/src/index.js";
import type { LlmProvider } from "../../../../../packages/core/src/providers/llmProvider.js";
import { createSessionConceptualizationDraft } from "../../../../../packages/core/src/counseling/post-session/sessionConceptualization.js";
import {
  createLongTermConceptualizationDraft,
  type LongTermSessionMaterial
} from "../../../../../packages/core/src/counseling/post-session/longTermConceptualization.js";
import { createSessionSupervisionDraft } from "../../../../../packages/core/src/counseling/post-session/sessionSupervision.js";
import { createConsultationMemoDraft } from "../../../../../packages/core/src/counseling/post-session/consultationMemo.js";
import { runPostSessionAgentPipeline } from "../../../../../packages/core/src/agents/postSessionAgentPipeline.js";
import {
  getCounselingPromptLocale,
  getSnapshotCounselorCorePrompt,
  getSnapshotCounselorVoicePrompt
} from "../../../../../packages/core/src/counseling/conversation/promptSnapshot.js";
import {
  getCounselorCorePrompt,
  getCounselorVoicePrompt
} from "../../../../../packages/core/src/prompts/counselorPromptRegistry.js";
import type {
  ConsultationMemoRepository,
  ConsultationPreparationRepository,
  LongTermConceptualizationRepository,
  MessageRepository,
  RollingSummaryRepository,
  SessionConceptualizationRepository,
  SessionRepository,
  SessionSupervisionRepository
} from "../../../../../packages/database/src/index.js";

export interface ConsultationPreparationRepositories {
  sessions: SessionRepository;
  messages: MessageRepository;
  rollingSummaries: RollingSummaryRepository;
  conceptualizations: SessionConceptualizationRepository;
  longTermConceptualizations: LongTermConceptualizationRepository;
  preparations: ConsultationPreparationRepository;
  supervisions: SessionSupervisionRepository;
  memos: ConsultationMemoRepository;
}

export interface RunConsultationPreparationInput {
  sessionId: string;
  preparationId: string;
  sourceEndedAt: string;
  provider: LlmProvider;
  modelName: string;
  repositories: ConsultationPreparationRepositories;
  now?: () => string;
}

export type ConsultationPreparationRunResult = "published" | "stale";

export async function runConsultationPreparation(
  input: RunConsultationPreparationInput
): Promise<ConsultationPreparationRunResult> {
  const now = input.now ?? (() => new Date().toISOString());
  const { repositories } = input;
  const [session, preparation] = await Promise.all([
    repositories.sessions.getById(input.sessionId),
    repositories.preparations.getBySessionId(input.sessionId)
  ]);
  if (!session) throw new Error("没有找到需要整理的会谈。请重新读取会谈列表。");
  if (!preparation) throw new Error("没有找到这次咨询结束后的整理记录。请返回会谈并重新检查状态。");
  if (
    preparation.id !== input.preparationId ||
    preparation.sourceEndedAt !== input.sourceEndedAt
  ) {
    // A newer ending cycle has replaced the queued batch. Never let the old
    // worker process or mark that newer batch.
    return "stale";
  }
  if (session.status !== "ended" || session.endedAt !== preparation.sourceEndedAt) {
    await repositories.preparations.markStale(preparation.id, now());
    return "stale";
  }

  const locale = getCounselingPromptLocale(session.promptSnapshot);
  const counselorName =
    getDefaultCounselors(locale).find((item) => item.id === session.counselorId)?.name ??
    (locale === "en-US" ? "Counselor" : "咨询师");
  const counselorCorePrompt =
    getSnapshotCounselorCorePrompt(session.promptSnapshot) ?? getCounselorCorePrompt(session.counselorId, locale);
  const counselorVoicePrompt = session.promptSnapshot
    ? getSnapshotCounselorVoicePrompt(session.promptSnapshot) ?? ""
    : getCounselorVoicePrompt(session.counselorId, locale);
  const sessionMessages = await repositories.messages.listBySessionId(session.id);

  const previousSessionConceptualizations = (
    await repositories.conceptualizations.listReadyByCounselorId(session.counselorId)
  ).filter((item) => item.sessionId !== session.id);
  const materials = await buildLongTermMaterials(repositories.sessions, previousSessionConceptualizations);
  const previousLongTerm = await repositories.longTermConceptualizations.getByCounselorId(session.counselorId);
  const currentLongTerm = previousLongTerm?.status === "ready" ? previousLongTerm : null;
  const shouldCreateLongTerm = materials.length + 1 >= 2;
  const pipeline = await runPostSessionAgentPipeline({
    shouldCreateLongTermConceptualization: shouldCreateLongTerm,
    currentLongTermConceptualization: currentLongTerm,
    onPhase: (phase) => repositories.preparations.markProcessing(preparation.id, phase, now()),
    createSessionConceptualization: () => createSessionConceptualizationDraft({
      provider: input.provider,
      sessionId: session.id,
      counselorId: session.counselorId,
      counselorName,
      locale,
      modelName: input.modelName,
      counselorCorePrompt,
      counselorVoicePrompt,
      sessionMessages,
      now: now()
    }),
    createLongTermConceptualization: async (sessionConceptualization) => {
      const rollingSummary = await repositories.rollingSummaries.getBySessionId(session.id);
      return createLongTermConceptualizationDraft({
        provider: input.provider,
        counselorId: session.counselorId,
        counselorName,
        locale,
        counselorCorePrompt,
        counselorVoicePrompt,
        modelName: input.modelName,
        previous: currentLongTerm,
        materials: [...materials, { session, conceptualization: sessionConceptualization }],
        recentSession: session,
        recentMessages: sessionMessages,
        rollingSummary: rollingSummary?.summary,
        now: now()
      });
    },
    createSupervision: ({ sessionConceptualization, longTermConceptualization }) =>
      createSessionSupervisionDraft({
        provider: input.provider,
        preparationId: preparation.id,
        sessionId: session.id,
        counselorId: session.counselorId,
        counselorName,
        locale,
        counselorCorePrompt,
        counselorVoicePrompt,
        sessionMessages,
        sessionConceptualizationMd: sessionConceptualization.fullMd,
        longTermConceptualizationMd: longTermConceptualization?.fullMd,
        modelName: input.modelName,
        now: now()
      }),
    createConsultationMemo: ({ sessionConceptualization, longTermConceptualization, supervision }) =>
      createConsultationMemoDraft({
        provider: input.provider,
        preparationId: preparation.id,
        sourceSessionId: session.id,
        counselorId: session.counselorId,
        counselorName,
        locale,
        counselorCorePrompt,
        counselorVoicePrompt,
        sessionMessages,
        sessionConceptualizationMd: sessionConceptualization.fullMd,
        longTermConceptualizationMd: longTermConceptualization?.fullMd,
        supervisionMd: supervision.supervisionMd,
        modelName: input.modelName,
        now: now()
      })
  });

  const {
    sessionConceptualization,
    longTermConceptualization: publishedLongTerm,
    supervision,
    consultationMemo: memo
  } = pipeline;

  const published = await repositories.preparations.publishReady({
    preparationId: preparation.id,
    sessionConceptualization,
    ...(shouldCreateLongTerm && publishedLongTerm ? { longTermConceptualization: publishedLongTerm } : {}),
    supervision,
    memo,
    publishedAt: now()
  });
  return published ? "published" : "stale";
}

async function buildLongTermMaterials(
  sessions: SessionRepository,
  conceptualizations: Awaited<ReturnType<SessionConceptualizationRepository["listReadyByCounselorId"]>>
) {
  const materials: LongTermSessionMaterial[] = [];
  for (const conceptualization of conceptualizations) {
    const session = await sessions.getById(conceptualization.sessionId);
    if (session) materials.push({ session, conceptualization });
  }
  return materials;
}
