export type SessionSupervisionStatus = "ready" | "failed";

export interface SessionSupervision {
  id: string;
  preparationId: string;
  sessionId: string;
  counselorId: string;
  supervisorId: "li-yanyun";
  modelName: string;
  supervisionMd: string;
  status: SessionSupervisionStatus;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}
