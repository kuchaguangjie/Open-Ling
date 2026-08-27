import type { ImportedDocument, SessionMessage, SupportedLocale } from "@shared/index";
import { buildImportedDocumentReferences } from "@core/counseling/documents/importedDocumentContext";
import type { MessageAttachmentReference } from "./types";

const attachmentOnlyMessageContent = " ";

export function buildBoundedContext(messages: SessionMessage[], userMessage: SessionMessage) {
  const cleaned = messages.filter(
    (message) => message.id !== userMessage.id && !(message.role === "assistant" && message.status === "sending" && !message.content)
  );
  return cleaned.slice(-12).map(normalizeMessageContentForTransport);
}

export function buildUserMessagePreview(
  content: string,
  attachments: MessageAttachmentReference[],
  locale: SupportedLocale = "zh-CN"
) {
  if (content.trim()) return content;
  if (attachments.length === 0) return content;
  const firstAttachment = attachments[0];
  if (locale === "en-US") {
    return attachments.length === 1
      ? `Attachment: ${firstAttachment.title}`
      : `Attachment: ${firstAttachment.title} and ${attachments.length - 1} more`;
  }
  return attachments.length === 1
    ? `附件：${firstAttachment.title}`
    : `附件：${firstAttachment.title} 等 ${attachments.length} 个文件`;
}

export function buildUserAuthoredMessageContent(
  content: string,
  { importedDocuments, attachments }: { importedDocuments: ImportedDocument[]; attachments: MessageAttachmentReference[] }
) {
  if (content.trim()) return content;
  return importedDocuments.length > 0 || attachments.length > 0 ? attachmentOnlyMessageContent : content;
}

export function normalizeMessageContentForTransport(message: SessionMessage): SessionMessage {
  if (message.content.length > 0) return message;
  return messageHasAttachmentContext(message) ? { ...message, content: attachmentOnlyMessageContent } : message;
}

export function buildMessageMetadata({
  importedDocuments,
  attachments,
  includeFullText
}: {
  importedDocuments: ImportedDocument[];
  attachments: MessageAttachmentReference[];
  includeFullText: boolean;
}) {
  if (importedDocuments.length === 0 && attachments.length === 0) return undefined;
  return {
    ...(importedDocuments.length > 0
      ? { importedDocuments: buildImportedDocumentReferences(importedDocuments, { includeFullText }) }
      : {}),
    ...(attachments.length > 0 ? { attachments } : {})
  };
}

export function upsertMessages(messages: SessionMessage[], updates: SessionMessage[]) {
  const next = [...messages];
  for (const update of updates) {
    const index = next.findIndex((message) => message.id === update.id);
    if (index >= 0) next[index] = update;
    else next.push(update);
  }
  return next;
}

function messageHasAttachmentContext(message: SessionMessage) {
  const attachments = message.metadata?.attachments;
  const importedDocuments = message.metadata?.importedDocuments;
  return (Array.isArray(attachments) && attachments.length > 0) || (Array.isArray(importedDocuments) && importedDocuments.length > 0);
}
