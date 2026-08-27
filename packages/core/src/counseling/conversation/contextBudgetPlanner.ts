import type { SessionMessage } from "@shared/index";

export const DEFAULT_MODEL_CONTEXT_WINDOW_TOKENS = 1_000_000;
export const DEFAULT_SHORT_TERM_HISTORY_BUDGET_TOKENS = 80_000;
export const DEFAULT_SUMMARY_WARMUP_THRESHOLD_TOKENS = 40_000;
export const DEFAULT_SUMMARY_UPDATE_THRESHOLD_TOKENS = 12_000;
export const DEFAULT_CURRENT_USER_WARNING_THRESHOLD_TOKENS = 20_000;
export const DEFAULT_CURRENT_USER_HARD_LIMIT_TOKENS = 80_000;
export const DEFAULT_BASIC_PROFILE_BUDGET_TOKENS = 2_000;
export const DEFAULT_CONSULTATION_MEMO_BUDGET_TOKENS = 4_000;

export type ContextPlanWarning =
  | "historyBudgetExceeded"
  | "missingRollingSummary"
  | "currentUserLongInput"
  | "currentUserHardLimitExceeded"
  | "basicProfileBudgetExceeded"
  | "consultationMemoBudgetExceeded";

export interface ContextBudgetOptions {
  modelContextWindowTokens?: number;
  shortTermHistoryBudgetTokens?: number;
  summaryWarmupThresholdTokens?: number;
  summaryUpdateThresholdTokens?: number;
  currentUserWarningThresholdTokens?: number;
  currentUserHardLimitTokens?: number;
  basicProfileBudgetTokens?: number;
  consultationMemoBudgetTokens?: number;
}

export interface ResolvedContextBudget {
  modelContextWindowTokens: number;
  shortTermHistoryBudgetTokens: number;
  summaryWarmupThresholdTokens: number;
  summaryUpdateThresholdTokens: number;
  currentUserWarningThresholdTokens: number;
  currentUserHardLimitTokens: number;
  basicProfileBudgetTokens: number;
  consultationMemoBudgetTokens: number;
}

export interface ContextTextSelection {
  available: boolean;
  injected: boolean;
  originalTokens: number;
  injectedTokens: number;
  truncated: boolean;
  content: string;
}

export interface ContextTextAudit {
  available: boolean;
  injected: boolean;
  originalTokens: number;
  injectedTokens: number;
  truncated: boolean;
}

export interface CounselingContextPlan {
  budget: ResolvedContextBudget;
  includedMessages: SessionMessage[];
  omittedMessages: SessionMessage[];
  shouldInjectRollingSummary: boolean;
  hasRollingSummary: boolean;
  systemPromptTokens: number;
  fullHistoryTokens: number;
  includedHistoryTokens: number;
  omittedHistoryTokens: number;
  currentUserMessageTokens: number;
  basicProfileSelection: ContextTextSelection;
  consultationMemoSelection: ContextTextSelection;
  warnings: ContextPlanWarning[];
}

export type ContextAuditSource = "electron" | "web-dev";

export interface ContextPlanAuditMessage {
  id: string;
  role: SessionMessage["role"];
  status?: SessionMessage["status"];
  tokens: number;
}

export interface ContextPlanAudit {
  requestId: string;
  sessionId: string;
  source: ContextAuditSource;
  modelName: string;
  createdAt: string;
  budget: ResolvedContextBudget;
  tokens: {
    systemPrompt: number;
    fullHistory: number;
    includedHistory: number;
    omittedHistory: number;
    currentUserMessage: number;
  };
  rollingSummary: {
    available: boolean;
    injected: boolean;
  };
  basicProfile: ContextTextAudit;
  consultationMemo: ContextTextAudit;
  messageSelection: {
    includedCount: number;
    omittedCount: number;
    included: ContextPlanAuditMessage[];
    omitted: ContextPlanAuditMessage[];
  };
  warnings: ContextPlanWarning[];
}

export function resolveContextBudget(options: ContextBudgetOptions = {}): ResolvedContextBudget {
  return {
    modelContextWindowTokens: options.modelContextWindowTokens ?? DEFAULT_MODEL_CONTEXT_WINDOW_TOKENS,
    shortTermHistoryBudgetTokens: options.shortTermHistoryBudgetTokens ?? DEFAULT_SHORT_TERM_HISTORY_BUDGET_TOKENS,
    summaryWarmupThresholdTokens: options.summaryWarmupThresholdTokens ?? DEFAULT_SUMMARY_WARMUP_THRESHOLD_TOKENS,
    summaryUpdateThresholdTokens: options.summaryUpdateThresholdTokens ?? DEFAULT_SUMMARY_UPDATE_THRESHOLD_TOKENS,
    currentUserWarningThresholdTokens:
      options.currentUserWarningThresholdTokens ?? DEFAULT_CURRENT_USER_WARNING_THRESHOLD_TOKENS,
    currentUserHardLimitTokens: options.currentUserHardLimitTokens ?? DEFAULT_CURRENT_USER_HARD_LIMIT_TOKENS,
    basicProfileBudgetTokens: options.basicProfileBudgetTokens ?? DEFAULT_BASIC_PROFILE_BUDGET_TOKENS,
    consultationMemoBudgetTokens: options.consultationMemoBudgetTokens ?? DEFAULT_CONSULTATION_MEMO_BUDGET_TOKENS
  };
}

export function estimateTextTokens(text: string) {
  if (!text) return 0;
  return text.length;
}

export function estimateMessageTokens(message: Pick<SessionMessage, "content">) {
  return estimateTextTokens(message.content);
}

export function estimateMessagesTokens(messages: Pick<SessionMessage, "content">[]) {
  return messages.reduce((sum, message) => sum + estimateMessageTokens(message), 0);
}

export function buildCounselingContextPlan({
  messages,
  rollingSummary,
  systemPrompt,
  basicProfile,
  consultationMemo,
  budget: budgetOptions
}: {
  messages: SessionMessage[];
  rollingSummary?: string;
  systemPrompt?: string;
  basicProfile?: string;
  consultationMemo?: string;
  budget?: ContextBudgetOptions;
}): CounselingContextPlan {
  const budget = resolveContextBudget(budgetOptions);
  const chatMessages = messages.filter((message) => message.role !== "system");
  const fullHistoryTokens = estimateMessagesTokens(chatMessages);
  const hasRollingSummary = Boolean(rollingSummary?.trim());
  const systemPromptTokens = estimateTextTokens(systemPrompt ?? "");
  const currentUserMessage = findCurrentUserMessage(chatMessages);
  const currentUserMessageTokens = currentUserMessage ? estimateMessageTokens(currentUserMessage) : 0;
  const basicProfileSelection = buildContextTextSelection(basicProfile, budget.basicProfileBudgetTokens);
  const consultationMemoSelection = buildContextTextSelection(consultationMemo, budget.consultationMemoBudgetTokens);
  const warnings: ContextPlanWarning[] = [];

  if (currentUserMessageTokens > budget.currentUserWarningThresholdTokens) {
    warnings.push("currentUserLongInput");
  }
  if (currentUserMessageTokens > budget.currentUserHardLimitTokens) {
    warnings.push("currentUserHardLimitExceeded");
  }
  if (basicProfileSelection.truncated) {
    warnings.push("basicProfileBudgetExceeded");
  }
  if (consultationMemoSelection.truncated) {
    warnings.push("consultationMemoBudgetExceeded");
  }
  if (fullHistoryTokens <= budget.shortTermHistoryBudgetTokens) {
    return {
      budget,
      includedMessages: chatMessages,
      omittedMessages: [],
      shouldInjectRollingSummary: false,
      hasRollingSummary,
      systemPromptTokens,
      fullHistoryTokens,
      includedHistoryTokens: fullHistoryTokens,
      omittedHistoryTokens: 0,
      currentUserMessageTokens,
      basicProfileSelection,
      consultationMemoSelection,
      warnings
    };
  }

  warnings.push("historyBudgetExceeded");

  const includedMessages = takeRecentMessagesByTokenBudget(chatMessages, budget.shortTermHistoryBudgetTokens);
  const includedIds = new Set(includedMessages.map((message) => message.id));
  const omittedMessages = chatMessages.filter((message) => !includedIds.has(message.id));
  const includedHistoryTokens = estimateMessagesTokens(includedMessages);
  const omittedHistoryTokens = estimateMessagesTokens(omittedMessages);
  const shouldInjectRollingSummary = omittedMessages.length > 0 && hasRollingSummary;

  if (omittedMessages.length > 0 && !hasRollingSummary) {
    warnings.push("missingRollingSummary");
  }

  return {
    budget,
    includedMessages,
    omittedMessages,
    shouldInjectRollingSummary,
    hasRollingSummary,
    systemPromptTokens,
    fullHistoryTokens,
    includedHistoryTokens,
    omittedHistoryTokens,
    currentUserMessageTokens,
    basicProfileSelection,
    consultationMemoSelection,
    warnings
  };
}

export function buildContextPlanAudit({
  requestId,
  sessionId,
  source,
  modelName,
  plan,
  createdAt = new Date().toISOString()
}: {
  requestId: string;
  sessionId: string;
  source: ContextAuditSource;
  modelName: string;
  plan: CounselingContextPlan;
  createdAt?: string;
}): ContextPlanAudit {
  return {
    requestId,
    sessionId,
    source,
    modelName,
    createdAt,
    budget: plan.budget,
    tokens: {
      systemPrompt: plan.systemPromptTokens,
      fullHistory: plan.fullHistoryTokens,
      includedHistory: plan.includedHistoryTokens,
      omittedHistory: plan.omittedHistoryTokens,
      currentUserMessage: plan.currentUserMessageTokens
    },
    rollingSummary: {
      available: plan.hasRollingSummary,
      injected: plan.shouldInjectRollingSummary
    },
    basicProfile: toAuditContextText(plan.basicProfileSelection),
    consultationMemo: toAuditContextText(plan.consultationMemoSelection),
    messageSelection: {
      includedCount: plan.includedMessages.length,
      omittedCount: plan.omittedMessages.length,
      included: plan.includedMessages.map(toAuditMessage),
      omitted: plan.omittedMessages.map(toAuditMessage)
    },
    warnings: [...plan.warnings]
  };
}

function buildContextTextSelection(rawContent: string | undefined, tokenBudget: number): ContextTextSelection {
  const content = rawContent?.trim() ?? "";
  const originalTokens = estimateTextTokens(content);
  const truncatedContent = truncateText(content, tokenBudget);
  const injectedTokens = estimateTextTokens(truncatedContent);
  return {
    available: originalTokens > 0,
    injected: injectedTokens > 0,
    originalTokens,
    injectedTokens,
    truncated: originalTokens > injectedTokens,
    content: truncatedContent
  };
}

function truncateText(text: string, maxTokens: number) {
  if (maxTokens <= 0) return "";
  if (estimateTextTokens(text) <= maxTokens) return text;
  const marker = "\n[已按上下文预算截断，完整记录保留在本地。]";
  if (maxTokens > marker.length) {
    return `${text.slice(0, maxTokens - marker.length)}${marker}`;
  }
  return text.slice(0, maxTokens);
}

const SENSITIVE_AUDIT_KEYS = new Set([
  "apiKey",
  "content",
  "message",
  "messages",
  "prompt",
  "rollingSummary",
  "consultationMemo",
  "systemPrompt",
  "text"
]);
const ALLOWED_AUDIT_KEY_PATHS = new Set([
  "audit.tokens.systemPrompt",
  "audit.rollingSummary",
  "audit.consultationMemo"
]);

export function assertContextPlanAuditIsSanitized(audit: unknown): asserts audit is ContextPlanAudit {
  const sensitivePath = findSensitiveAuditPath(audit);
  if (sensitivePath) {
    throw new Error(`ContextPlanAudit 包含敏感字段：${sensitivePath}`);
  }
}

function takeRecentMessagesByTokenBudget(messages: SessionMessage[], tokenBudget: number) {
  const selected: SessionMessage[] = [];
  let total = 0;

  for (const message of [...messages].reverse()) {
    const nextTotal = total + estimateMessageTokens(message);
    if (selected.length > 0 && nextTotal > tokenBudget) break;
    selected.push(message);
    total = nextTotal;
  }

  return selected.reverse();
}

function findCurrentUserMessage(messages: SessionMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") return messages[index];
  }
  return undefined;
}

function toAuditMessage(message: SessionMessage): ContextPlanAuditMessage {
  return {
    id: message.id,
    role: message.role,
    status: message.status,
    tokens: estimateMessageTokens(message)
  };
}

function toAuditContextText(item: ContextTextSelection): ContextTextAudit {
  const { content: _content, ...auditItem } = item;
  return auditItem;
}

function findSensitiveAuditPath(value: unknown, path = "audit", seen = new Set<object>()): string | null {
  if (value === null || typeof value !== "object") return null;
  if (seen.has(value)) return null;
  seen.add(value);

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const nested = findSensitiveAuditPath(value[index], `${path}[${index}]`, seen);
      if (nested) return nested;
    }
    return null;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (SENSITIVE_AUDIT_KEYS.has(key) && !ALLOWED_AUDIT_KEY_PATHS.has(nextPath)) return nextPath;
    const nested = findSensitiveAuditPath(nestedValue, nextPath, seen);
    if (nested) return nested;
  }
  return null;
}
