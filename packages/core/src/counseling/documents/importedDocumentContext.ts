import type { ImportedDocument, ImportedDocumentReference, SessionMessage, SupportedLocale } from "@shared/index";
import type { LlmProvider } from "../../providers/llmProvider.js";

export const LONG_INPUT_AUTO_IMPORT_THRESHOLD_CHARS = 20_000;
export const LONG_INPUT_FULL_TEXT_CONTEXT_LIMIT_CHARS = 200_000;

export function shouldAutoImportLongInput(content: string) {
  return content.trim().length > LONG_INPUT_AUTO_IMPORT_THRESHOLD_CHARS;
}

export function createImportedDocumentFromText({
  id,
  sessionId,
  content,
  createdAt,
  title,
  locale = "zh-CN"
}: {
  id: string;
  sessionId: string;
  content: string;
  createdAt: string;
  title?: string;
  locale?: SupportedLocale;
}): ImportedDocument {
  return {
    id,
    sessionId,
    title: title ?? (locale === "en-US" ? "Long text" : "长文本资料"),
    kind: "pasted-text",
    content,
    contentLength: content.length,
    createdAt,
    status: "ready"
  };
}

export function buildImportedDocumentUserMessageContent({
  title,
  contentLength,
  locale = "zh-CN"
}: {
  title: string;
  contentLength: number;
  locale?: SupportedLocale;
}) {
  return locale === "en-US"
    ? `I sent a document: ${title} (about ${contentLength} characters). Please use it as context as we continue.`
    : `我发送了一份资料：${title}（约 ${contentLength} 字）。请结合这份资料继续和我讨论。`;
}

export function buildImportedDocumentReferences(
  documents: ImportedDocument[],
  options: { includeFullText?: boolean } = {}
): ImportedDocumentReference[] {
  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    contentLength: document.contentLength,
    ...(options.includeFullText ? { fullText: document.content } : {})
  }));
}

export async function expandImportedDocumentMessages(
  messages: SessionMessage[],
  resolveDocument: (id: string) => Promise<ImportedDocument | null>,
  locale: SupportedLocale = "zh-CN"
): Promise<SessionMessage[]> {
  const expanded: SessionMessage[] = [];
  for (const message of messages) {
    const references = getImportedDocumentReferences(message);
    if (references.length === 0) {
      expanded.push(message);
      continue;
    }

    const documentBlocks: string[] = [];
    for (const reference of references) {
      const document = await resolveDocument(reference.id);
      const content = document?.content ?? reference.fullText ?? "";
      if (!content.trim()) continue;
      documentBlocks.push(formatImportedDocumentForContext({
        title: document?.title ?? reference.title,
        content,
        contentLength: document?.contentLength ?? reference.contentLength,
        summary: document?.summary,
        locale
      }));
    }

    expanded.push({
      ...message,
      content: documentBlocks.length > 0 ? `${message.content}\n\n${documentBlocks.join("\n\n")}` : message.content
    });
  }
  return expanded;
}

export function stripImportedDocumentFullText(message: SessionMessage): SessionMessage {
  const references = getImportedDocumentReferences(message);
  if (references.length === 0) return message;
  return {
    ...message,
    metadata: {
      ...message.metadata,
      importedDocuments: references.map(({ id, title, contentLength }) => ({ id, title, contentLength }))
    }
  };
}

export function getImportedDocumentReferences(message: SessionMessage): ImportedDocumentReference[] {
  const value = message.metadata?.importedDocuments;
  if (!Array.isArray(value)) return [];
  return value.filter(isImportedDocumentReference);
}

export async function createImportedDocumentSummary({
  document,
  provider,
  signal,
  locale = "zh-CN"
}: {
  document: ImportedDocument;
  provider: LlmProvider;
  signal?: AbortSignal;
  locale?: SupportedLocale;
}) {
  const generated = await provider.complete({
    maxTokens: 1200,
    messages: buildImportedDocumentSummaryMessages(document, locale),
    signal
  });
  return normalizeImportedDocumentSummary(generated.content);
}

export function buildImportedDocumentSummaryMessages(document: ImportedDocument, locale: SupportedLocale = "zh-CN"): SessionMessage[] {
  const english = locale === "en-US";
  return [
    {
      id: "document-summary-system",
      sessionId: document.sessionId,
      role: "system",
      content: (english
        ? [
            "You are Ling's local document-summarization module. You do not speak directly with the user.",
            "Compress the document uploaded by the user into a factual summary for later context.",
            "Use only the source document. Do not add facts, diagnose, offer counseling advice, or introduce psychological interpretations.",
            "Write 6–12 concise bullet points in English. When the structure allows, organize by time, people, events, and feelings explicitly stated by the user.",
            "Do not add an introduction, explanation, or conclusion."
          ]
        : [
            "你是 Ling 的本地资料摘要模块，不直接和用户对话。",
            "请把用户上传的资料压缩为事实性摘要，用于后续上下文。",
            "只依据资料原文，不要新增事实，不要做诊断，不要加入咨询建议或心理分析。",
            "输出 6-12 条中文要点；如果资料结构清晰，可以按时间、人物、事件、用户明确表达的感受整理。",
            "不要输出引言、解释或结尾。"
          ]).join("\n"),
      createdAt: new Date(0).toISOString(),
      status: "sent"
    },
    {
      id: "document-summary-user",
      sessionId: document.sessionId,
      role: "user",
      content: (english
        ? [
            `Document title: ${document.title}`,
            `Document length: about ${document.contentLength} characters`,
            "",
            "Source document:",
            document.content
          ]
        : [
            `资料标题：${document.title}`,
            `资料长度：约 ${document.contentLength} 字`,
            "",
            "资料原文：",
            document.content
          ]).join("\n"),
      createdAt: new Date(0).toISOString(),
      status: "sent"
    }
  ];
}

function normalizeImportedDocumentSummary(summary: string) {
  return String(summary || "").trim().slice(0, 6000);
}

function formatImportedDocumentForContext({
  title,
  content,
  contentLength,
  summary,
  locale
}: {
  title: string;
  content: string;
  contentLength: number;
  summary?: string;
  locale: SupportedLocale;
}) {
  const english = locale === "en-US";
  if (content.length > LONG_INPUT_FULL_TEXT_CONTEXT_LIMIT_CHARS) {
    const normalizedSummary = summary?.trim();
    if (normalizedSummary) {
      return english
        ? ["Attached-document summary (not the complete source):", `Title: ${title}`, `Source length: about ${contentLength} characters`, normalizedSummary].join("\n")
        : ["资料附件摘要（不是完整原文）：", `标题：${title}`, `原文长度：约 ${contentLength} 字`, normalizedSummary].join("\n");
    }
    return english
      ? ["Attached-document note:", `Title: ${title}`, `Length: about ${contentLength} characters`, "This document exceeds the full-text context budget and will be handled through summarization or chunking."].join("\n")
      : ["资料附件说明：", `标题：${title}`, `长度：约 ${contentLength} 字`, "当前资料超过全文注入预算；后续将进入摘要/分块处理。"].join("\n");
  }
  return english
    ? ["Full attached document:", `Title: ${title}`, `Length: about ${contentLength} characters`, content].join("\n")
    : ["资料附件全文：", `标题：${title}`, `长度：约 ${contentLength} 字`, content].join("\n");
}

function isImportedDocumentReference(value: unknown): value is ImportedDocumentReference {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.title === "string" &&
    typeof record.contentLength === "number" &&
    (record.fullText === undefined || typeof record.fullText === "string")
  );
}
