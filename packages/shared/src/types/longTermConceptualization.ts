export type LongTermConceptualizationStatus = "ready" | "failed";

export interface LongTermConceptualization {
  id: string;
  counselorId: string;
  modelName: string;
  fullMd: string;
  coveredSessionIds: string[];
  coveredUntilSessionId?: string;
  coveredUntilEndedAt?: string;
  status: LongTermConceptualizationStatus;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}
