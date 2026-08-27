export type SessionLetterStatus = "pending" | "ready" | "failed";

export interface SessionLetter {
  id: string;
  sessionId: string;
  counselorId: string;
  modelName: string;
  letterMd: string;
  status: SessionLetterStatus;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}
