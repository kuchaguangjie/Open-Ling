export type SessionConceptualizationStatus = "ready" | "failed";

export interface SessionConceptualization {
  id: string;
  sessionId: string;
  counselorId: string;
  modelName: string;
  fullMd: string;
  status: SessionConceptualizationStatus;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}
