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
  /**
   * When the client last opened the full letter. Absent means unread, which is
   * also the state a regenerated letter returns to — the previous read stamp is
   * replaced along with the text it referred to.
   */
  readAt?: string;
}
