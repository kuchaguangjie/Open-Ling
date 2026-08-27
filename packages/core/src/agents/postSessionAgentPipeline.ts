export type ConsultationPreparationAgentPhase =
  | "session-conceptualization"
  | "long-term-conceptualization"
  | "supervision"
  | "consultation-memo";

export interface PostSessionAgentPipelineTasks<
  SessionConceptualization,
  LongTermConceptualization,
  Supervision,
  ConsultationMemo
> {
  shouldCreateLongTermConceptualization: boolean;
  currentLongTermConceptualization: LongTermConceptualization | null;
  onPhase?: (phase: ConsultationPreparationAgentPhase) => void | Promise<void>;
  createSessionConceptualization: () => Promise<SessionConceptualization>;
  createLongTermConceptualization: (
    sessionConceptualization: SessionConceptualization
  ) => Promise<LongTermConceptualization>;
  createSupervision: (input: {
    sessionConceptualization: SessionConceptualization;
    longTermConceptualization: LongTermConceptualization | null;
  }) => Promise<Supervision>;
  createConsultationMemo: (input: {
    sessionConceptualization: SessionConceptualization;
    longTermConceptualization: LongTermConceptualization | null;
    supervision: Supervision;
  }) => Promise<ConsultationMemo>;
}

export interface PostSessionAgentPipelineResult<
  SessionConceptualization,
  LongTermConceptualization,
  Supervision,
  ConsultationMemo
> {
  sessionConceptualization: SessionConceptualization;
  longTermConceptualization: LongTermConceptualization | null;
  supervision: Supervision;
  consultationMemo: ConsultationMemo;
}

/**
 * Runs the public, production post-session agent sequence. Persistence and LLM
 * adapters stay with the host so the same orchestration can be reused by the
 * desktop app, tests, and future SDK consumers.
 */
export async function runPostSessionAgentPipeline<
  SessionConceptualization,
  LongTermConceptualization,
  Supervision,
  ConsultationMemo
>(
  tasks: PostSessionAgentPipelineTasks<
    SessionConceptualization,
    LongTermConceptualization,
    Supervision,
    ConsultationMemo
  >
): Promise<PostSessionAgentPipelineResult<
  SessionConceptualization,
  LongTermConceptualization,
  Supervision,
  ConsultationMemo
>> {
  await tasks.onPhase?.("session-conceptualization");
  const sessionConceptualization = await tasks.createSessionConceptualization();

  let longTermConceptualization = tasks.currentLongTermConceptualization;
  if (tasks.shouldCreateLongTermConceptualization) {
    await tasks.onPhase?.("long-term-conceptualization");
    longTermConceptualization = await tasks.createLongTermConceptualization(sessionConceptualization);
  }

  await tasks.onPhase?.("supervision");
  const supervision = await tasks.createSupervision({
    sessionConceptualization,
    longTermConceptualization
  });

  await tasks.onPhase?.("consultation-memo");
  const consultationMemo = await tasks.createConsultationMemo({
    sessionConceptualization,
    longTermConceptualization,
    supervision
  });

  return {
    sessionConceptualization,
    longTermConceptualization,
    supervision,
    consultationMemo
  };
}
