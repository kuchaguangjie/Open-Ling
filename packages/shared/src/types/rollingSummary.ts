export type RollingSummaryStatus = "active" | "stale" | "failed";

export interface RollingSummary {
  sessionId: string;
  counselorId: string;
  summary: string;
  coveredMessageCount: number;
  coveredUntilMessageId?: string;
  lastAttemptedMessageCount?: number;
  lastErrorAt?: string;
  sourceHash?: string;
  createdAt: string;
  updatedAt: string;
  status: RollingSummaryStatus;
  errorMessage?: string;
}
