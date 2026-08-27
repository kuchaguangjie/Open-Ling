import type { ConsultationMemo } from "./consultationMemo.js";
import type { LongTermConceptualization } from "./longTermConceptualization.js";
import type { SessionConceptualization } from "./sessionConceptualization.js";
import type { SessionSupervision } from "./sessionSupervision.js";

export type ConsultationPreparationStatus = "pending" | "processing" | "ready" | "failed" | "stale";

export type ConsultationPreparationPhase =
  | "session-conceptualization"
  | "long-term-conceptualization"
  | "supervision"
  | "consultation-memo"
  | "complete";

export interface ConsultationPreparation {
  id: string;
  sessionId: string;
  counselorId: string;
  sourceEndedAt: string;
  modelName: string;
  status: ConsultationPreparationStatus;
  phase: ConsultationPreparationPhase;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface PublishConsultationPreparationInput {
  preparationId: string;
  sessionConceptualization: SessionConceptualization;
  longTermConceptualization?: LongTermConceptualization;
  supervision: SessionSupervision;
  memo: ConsultationMemo;
  publishedAt: string;
}
