import type { ModelConnectionKind } from "./settings.js";

/**
 * A single recorded model call. Ling stores token counts only; it never
 * stores or displays provider pricing or currency amounts.
 */
export interface ModelUsageRecord {
  id: string;
  providerName: string;
  modelName: string;
  connectionKind: ModelConnectionKind;
  /** What the call was for: counseling, post-session work, or connection test. */
  scope: "counseling" | "post-session" | "connection-test";
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
}

export interface ModelUsageByModel {
  modelName: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ProviderUsageSummary {
  providerName: string;
  connectionKind: ModelConnectionKind;
  inputTokens: number;
  outputTokens: number;
  models: ModelUsageByModel[];
}

export interface DailyUsageSummary {
  /** Local calendar date in YYYY-MM-DD. */
  date: string;
  inputTokens: number;
  outputTokens: number;
  providers: ProviderUsageSummary[];
}

export interface UsageSummaryResult {
  days: DailyUsageSummary[];
}
