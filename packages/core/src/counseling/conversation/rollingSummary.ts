import type { RollingSummary, SessionMessage, SupportedLocale } from "@shared/index";
import type { LlmProvider } from "../../providers/llmProvider.js";
import {
  DEFAULT_SUMMARY_UPDATE_THRESHOLD_TOKENS,
  DEFAULT_SUMMARY_WARMUP_THRESHOLD_TOKENS,
  estimateMessagesTokens,
  type ContextBudgetOptions
} from "./contextBudgetPlanner.js";

export const ROLLING_SUMMARY_MAX_CHARS = 400;
export const ROLLING_SUMMARY_MAX_ITEMS_PER_SECTION = 3;

const REQUIRED_HEADINGS = ["### 重要事实", "### 事情经过"] as const;
const ENGLISH_REQUIRED_HEADINGS = ["### Important Facts", "### What Happened"] as const;

export interface RollingSummaryValidationResult {
  ok: boolean;
  issues: string[];
}

export interface RollingSummaryValidationOptions {
  requireTimelineContent?: boolean;
  locale?: SupportedLocale;
}

export interface RollingSummaryDraft {
  summary: string;
  coveredMessageCount: number;
  coveredUntilMessageId?: string;
  sourceHash: string;
}

export function filterSummarizableMessages(messages: SessionMessage[]) {
  return messages.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      message.status !== "failed" &&
      message.content.trim().length > 0
  );
}

export function shouldUpdateRollingSummary({
  messages,
  existing,
  budget
}: {
  messages: SessionMessage[];
  existing?: RollingSummary | null;
  budget?: Pick<ContextBudgetOptions, "summaryWarmupThresholdTokens" | "summaryUpdateThresholdTokens">;
}) {
  const summarizable = filterSummarizableMessages(messages);
  const warmupThreshold = budget?.summaryWarmupThresholdTokens ?? DEFAULT_SUMMARY_WARMUP_THRESHOLD_TOKENS;
  const updateThreshold = budget?.summaryUpdateThresholdTokens ?? DEFAULT_SUMMARY_UPDATE_THRESHOLD_TOKENS;
  if (!existing?.summary.trim()) return estimateMessagesTokens(summarizable) > warmupThreshold;
  return estimateMessagesTokens(selectRollingSummaryNewMessages(messages, existing)) > updateThreshold;
}

export function selectRollingSummaryNewMessages(messages: SessionMessage[], existing?: RollingSummary | null) {
  const summarizable = filterSummarizableMessages(messages);
  const covered = Math.max(0, existing?.coveredMessageCount ?? 0);
  return summarizable.slice(Math.min(covered, summarizable.length));
}

export function validateRollingSummary(
  summary: string,
  options: RollingSummaryValidationOptions = {}
): RollingSummaryValidationResult {
  const normalized = String(summary || "").trim();
  const locale = options.locale ?? "zh-CN";
  const requiredHeadings = locale === "en-US" ? ENGLISH_REQUIRED_HEADINGS : REQUIRED_HEADINGS;
  const issues: string[] = [];
  if (!normalized) return { ok: false, issues: ["summary is empty"] };
  const maxChars = locale === "en-US" ? 800 : ROLLING_SUMMARY_MAX_CHARS;
  if (normalized.length > maxChars) {
    issues.push(`summary exceeds ${maxChars} characters`);
  }

  const lines = normalized.split(/\r?\n/);
  const headingIndexes = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter((item) => item.line.startsWith("### "));

  if (headingIndexes.length !== 2) {
    issues.push("summary must contain exactly two level-3 headings");
  }

  requiredHeadings.forEach((heading, index) => {
    if (headingIndexes[index]?.line !== heading) {
      issues.push(`heading ${index + 1} must be "${heading}"`);
    }
  });

  if (headingIndexes.length >= 2 && headingIndexes[0].index > headingIndexes[1].index) {
    issues.push("headings are out of order");
  }

  const firstHeadingIndex = headingIndexes[0]?.index ?? -1;
  const secondHeadingIndex = headingIndexes[1]?.index ?? -1;
  if (firstHeadingIndex > 0 && lines.slice(0, firstHeadingIndex).some((line) => line.trim())) {
    issues.push("summary has non-empty text before the first heading");
  }
  if (secondHeadingIndex >= 0 && lines.slice(secondHeadingIndex + 1).some((line) => line.trim().startsWith("### "))) {
    issues.push("summary has extra headings");
  }

  const factsLines = firstHeadingIndex >= 0 && secondHeadingIndex >= 0
    ? lines.slice(firstHeadingIndex + 1, secondHeadingIndex)
    : [];
  const timelineLines = secondHeadingIndex >= 0 ? lines.slice(secondHeadingIndex + 1) : [];
  validateListSection(factsLines, locale === "en-US" ? "Important Facts" : "重要事实", issues, {}, locale);
  validateListSection(timelineLines, locale === "en-US" ? "What Happened" : "事情经过", issues, {
    requireContent: options.requireTimelineContent
  }, locale);
  validateNoDanglingListItems([...factsLines, ...timelineLines], issues, locale);
  validateNoTestMarkers([...factsLines, ...timelineLines], issues);

  return { ok: issues.length === 0, issues };
}

export function normalizeRollingSummary(summary: string) {
  return String(summary || "").trim();
}

export function buildRollingSummaryRepairMessages({
  summary,
  issues,
  sessionId = "rolling-summary-repair",
  existing,
  newMessages = [],
  locale = "zh-CN"
}: {
  summary: string;
  issues: string[];
  sessionId?: string;
  existing?: RollingSummary | null;
  newMessages?: SessionMessage[];
  locale?: SupportedLocale;
}): SessionMessage[] {
  if (locale === "en-US") {
    return [
      {
        id: "rolling-summary-repair-system",
        sessionId,
        role: "system",
        content: [
          "You repair Ling rolling summaries and do not speak to the client.",
          "Using only the draft, prior summary, new messages, and validation issues, produce a valid complete summary.",
          "Do not add facts, interpretation, diagnosis, or advice. Merge related items if necessary.",
          "Output only this Markdown structure:",
          "### Important Facts",
          "- ...",
          "",
          "### What Happened",
          "- ...",
          "Use 1–3 one-sentence items per section and no more than 800 characters total.",
          "If a section has no material, write `- None`. Do not include testing markers."
        ].join("\n"),
        createdAt: new Date(0).toISOString(),
        status: "sent"
      },
      {
        id: "rolling-summary-repair-user",
        sessionId,
        role: "user",
        content: [
          "Validation issues:",
          issues.map((issue) => `- ${issue}`).join("\n"),
          "",
          "Prior rolling summary:",
          existing?.summary.trim() || "- None",
          "",
          "New messages:",
          formatMessagesForSummary(newMessages, locale),
          "",
          "Draft:",
          summary
        ].join("\n"),
        createdAt: new Date(0).toISOString(),
        status: "sent"
      }
    ];
  }
  return [
    {
      id: "rolling-summary-repair-system",
      sessionId,
      role: "system",
      content: [
        "你是 Ling rolling summary 的格式修复器。",
        "请根据给定草稿、上一版 summary 和新增消息，修复成可保存的 rolling summary。",
        "只依据给定材料，不要新增材料外的事实，不要解释。",
        "如果列表项太多，可以合并相近条目，但不要引入新含义。",
        "如果校验提示指出事情经过不能为空，必须根据给定材料写出简短经过，不要写 `- 无`。",
        "最终答案必须只包含：",
        "### 重要事实",
        "- ...",
        "",
        "### 事情经过",
        "- ...",
        "每段最多 3 条。",
        "如果某节没有内容，写 `- 无`。",
        "不要保留“第几轮测试”这类测试轮次标记。"
      ].join("\n"),
      createdAt: new Date(0).toISOString(),
      status: "sent"
    },
    {
      id: "rolling-summary-repair-user",
      sessionId,
      role: "user",
      content: [
        "校验失败：",
        issues.map((issue) => `- ${issue}`).join("\n"),
        "",
        "上一版 rolling summary：",
        existing?.summary.trim() || "- 无",
        "",
        "新增消息：",
        formatMessagesForSummary(newMessages),
        "",
        "草稿：",
        summary
      ].join("\n"),
      createdAt: new Date(0).toISOString(),
      status: "sent"
    }
  ];
}

export function buildRollingSummaryGenerationMessages({
  existing,
  newMessages,
  sessionId = "rolling-summary",
  locale = "zh-CN"
}: {
  existing?: RollingSummary | null;
  newMessages: SessionMessage[];
  sessionId?: string;
  locale?: SupportedLocale;
}): SessionMessage[] {
  const previous = existing?.summary.trim() || (locale === "en-US" ? "- None" : "- 无");
  if (locale === "en-US") {
    return [
      {
        id: "rolling-summary-system",
        sessionId,
        role: "system",
        content: [
          "You are Ling's internal session-context summarizer and never speak to the client.",
          "Update the rolling summary used to compress context for the next turn.",
          "Include only facts, events, the client's explicitly stated experience, and what occurred in this session.",
          "Do not add advice, diagnosis, interpretation, relational patterns, defenses, or hidden dynamics.",
          "Output only this fixed Markdown structure:",
          "### Important Facts",
          "- ...",
          "",
          "### What Happened",
          "- ...",
          "Use 1–3 one-sentence items per section and no more than 800 characters total. Be brief when information is sparse."
        ].join("\n"),
        createdAt: new Date(0).toISOString(),
        status: "sent"
      },
      {
        id: "rolling-summary-user",
        sessionId,
        role: "user",
        content: [
          "Prior rolling summary:",
          previous,
          "",
          "New messages:",
          formatMessagesForSummary(newMessages, locale),
          "",
          "Output the complete updated rolling summary."
        ].join("\n"),
        createdAt: new Date(0).toISOString(),
        status: "sent"
      }
    ];
  }
  return [
    {
      id: "rolling-summary-system",
      sessionId,
      role: "system",
      content: [
        "你是 Ling 的本地会谈脉络整理模块，不直接和用户对话。",
        "请更新当前会谈的 rolling summary，用于下一轮对话上下文压缩。",
        "只整理本次会谈中已经出现的事实、事件、用户明确表达的体验描述和对话经过。",
        "不要新增咨询建议，不要做诊断，不要把假设写成事实。",
        "不要输出咨询师解释、阶段性理解、关系模式、防御方式或深层动力。",
        "输出必须严格符合固定 Markdown 格式：",
        "### 重要事实",
        "- ...",
        "",
        "### 事情经过",
        "- ...",
        "标题之外不要输出任何文字。每段 1-3 条，每条一句话。总长度不超过 400 个中文字符；信息少就写短，不凑字数。"
      ].join("\n"),
      createdAt: new Date(0).toISOString(),
      status: "sent"
    },
    {
      id: "rolling-summary-user",
      sessionId,
      role: "user",
      content: [
        "上一版 rolling summary：",
        previous,
        "",
        "新增消息：",
        formatMessagesForSummary(newMessages),
        "",
        "请输出更新后的完整 rolling summary。"
      ].join("\n"),
      createdAt: new Date(0).toISOString(),
      status: "sent"
    }
  ];
}

export async function createRollingSummaryDraft({
  provider,
  messages,
  existing,
  sessionId,
  locale = "zh-CN"
}: {
  provider: LlmProvider;
  messages: SessionMessage[];
  existing?: RollingSummary | null;
  sessionId: string;
  locale?: SupportedLocale;
}): Promise<RollingSummaryDraft> {
  const summarizable = filterSummarizableMessages(messages);
  const newMessages = selectRollingSummaryNewMessages(messages, existing);
  const sourceHash = hashSummarySource(existing?.summary ?? "", newMessages);
  const generated = await provider.complete({
    messages: buildRollingSummaryGenerationMessages({ existing, newMessages, sessionId, locale }),
    maxTokens: 700
  });
  let summary = normalizeRollingSummary(generated.content);
  const validationOptions = {
    requireTimelineContent: newMessages.length >= 2,
    locale
  };
  let validation = validateRollingSummary(summary, validationOptions);

  if (!validation.ok) {
    const repaired = await provider.complete({
      messages: buildRollingSummaryRepairMessages({
        summary,
        issues: validation.issues,
        sessionId,
        existing,
        newMessages,
        locale
      }),
      maxTokens: 700
    });
    summary = normalizeRollingSummary(repaired.content);
    validation = validateRollingSummary(summary, validationOptions);
  }

  if (!validation.ok) {
    throw new Error(`rolling summary format invalid after repair: ${validation.issues.join("; ")}`);
  }

  const lastMessage = summarizable.at(-1);
  return {
    summary,
    coveredMessageCount: summarizable.length,
    coveredUntilMessageId: lastMessage?.id,
    sourceHash
  };
}

function validateListSection(
  lines: string[],
  sectionName: string,
  issues: string[],
  options: { requireContent?: boolean } = {},
  locale: SupportedLocale = "zh-CN"
) {
  const nonEmpty = lines.map((line) => line.trim()).filter(Boolean);
  if (nonEmpty.length === 0) {
    issues.push(`${sectionName} section must contain at least one list item`);
    return;
  }
  if (nonEmpty.some((line) => !line.startsWith("- "))) {
    issues.push(`${sectionName} section must only contain "- " list items`);
  }
  if (nonEmpty.length > ROLLING_SUMMARY_MAX_ITEMS_PER_SECTION) {
    issues.push(`${sectionName} section must contain at most ${ROLLING_SUMMARY_MAX_ITEMS_PER_SECTION} list items`);
  }
  const emptyMarker = locale === "en-US" ? "- None" : "- 无";
  if (options.requireContent && nonEmpty.every((line) => line === emptyMarker)) {
    issues.push(`${sectionName} section cannot be empty when there are new dialogue messages`);
  }
}

function validateNoDanglingListItems(lines: string[], issues: string[], locale: SupportedLocale) {
  const items = lines.map((line) => line.trim()).filter((line) => line.startsWith("- "));
  for (const item of items) {
    const content = item.slice(2).trim();
    if (content === "无" || (locale === "en-US" && content.toLowerCase() === "none")) continue;
    if (content.length < 6) {
      issues.push("summary contains a dangling or too-short list item");
      continue;
    }
    if (/^(第|用户|咨询师|今天|202\d-\d{2}-\d{2})[，。；、：:]*$/.test(content)) {
      issues.push("summary contains an incomplete list item");
    }
  }
}

function validateNoTestMarkers(lines: string[], issues: string[]) {
  const items = lines.map((line) => line.trim()).filter((line) => line.startsWith("- "));
  if (items.some((item) => /第\s*\d+\s*轮测试/.test(item))) {
    issues.push("summary must not include test round markers");
  }
}

function formatMessagesForSummary(messages: SessionMessage[], locale: SupportedLocale = "zh-CN") {
  if (messages.length === 0) return locale === "en-US" ? "- None" : "- 无";
  return messages
    .map((message) => {
      const speaker = locale === "en-US"
        ? message.role === "user" ? "Client" : "Counselor"
        : message.role === "user" ? "用户" : "咨询师";
      return `${message.createdAt} ${speaker}: ${message.content.trim()}`;
    })
    .join("\n");
}

function hashSummarySource(previousSummary: string, messages: SessionMessage[]) {
  const input = `${previousSummary}\n${messages.map((message) => `${message.id}:${message.content}`).join("\n")}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
