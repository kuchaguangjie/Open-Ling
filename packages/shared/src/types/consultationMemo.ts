export type ConsultationMemoStatus = "ready" | "failed";

export interface ConsultationMemo {
  id: string;
  preparationId: string;
  sourceSessionId: string;
  counselorId: string;
  modelName: string;
  memoMd: string;
  status: ConsultationMemoStatus;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}
