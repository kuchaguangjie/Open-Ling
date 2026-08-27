import {
  getDefaultCounselors,
  type CounselingSession,
  type DataExportScope,
  type SessionLetter,
  type SessionMessage,
  type SupportedLocale
} from "../../../shared/src/index.js";

export interface ArchiveSessionRecord {
  session: CounselingSession;
  messages: SessionMessage[];
}

export interface ArchiveLetterRecord {
  letter: SessionLetter;
  session?: CounselingSession;
}

export interface CounselingArchiveExportInput {
  generatedAt: string;
  scope: DataExportScope;
  sessions: ArchiveSessionRecord[];
  letters: ArchiveLetterRecord[];
  locale?: SupportedLocale;
}

export function exportCounselingArchiveMarkdown(input: CounselingArchiveExportInput): string {
  const locale = input.locale ?? "zh-CN";
  const counselors = getDefaultCounselors(locale);
  const counselorOrder = new Map(counselors.map((counselor, index) => [counselor.id, index]));
  const counselorNames = new Map(counselors.map((counselor) => [counselor.id, counselor.name]));
  const scopeTitle: Record<DataExportScope, string> = locale === "en-US"
    ? { all: "Ling Sessions & Letters", sessions: "Ling Session Records", letters: "Ling Counselor Letters" }
    : { all: "Ling 会谈与来信", sessions: "Ling 会谈记录", letters: "Ling 咨询师来信" };
  const lines = [
    `# ${scopeTitle[input.scope]}`,
    "",
    copy(locale, `> 导出时间：${formatDateTime(input.generatedAt, locale)}`, `> Exported: ${formatDateTime(input.generatedAt, locale)}`),
    copy(locale, "> 排列方式：按咨询师分组，每位咨询师内按时间从新到旧排列。", "> Records are grouped by counselor and ordered newest to oldest within each group."),
    ""
  ];
  const counselorIds = collectCounselorIds(input, counselorOrder);

  if (counselorIds.length === 0) {
    lines.push(copy(locale, "当前没有可导出的内容。", "There is no content to export."), "");
    return lines.join("\n");
  }

  for (const counselorId of counselorIds) {
    const counselorName = counselorNames.get(counselorId) ?? counselorId;
    const sessions = input.sessions
      .filter((record) => record.session.counselorId === counselorId)
      .sort((left, right) => sessionTime(right.session).localeCompare(sessionTime(left.session)));
    const letters = input.letters
      .filter((record) => record.letter.counselorId === counselorId && record.letter.status === "ready")
      .sort((left, right) => right.letter.updatedAt.localeCompare(left.letter.updatedAt));

    lines.push(`## ${counselorName}`, "");

    if (sessions.length > 0) {
      lines.push(copy(locale, "### 会谈记录", "### Session records"), "");
      for (const record of sessions) {
        appendSession(lines, record, counselorName, locale);
      }
    }

    if (letters.length > 0) {
      lines.push(copy(locale, "### 咨询师的信", "### Counselor letters"), "");
      for (const record of letters) {
        appendLetter(lines, record, counselorName, locale);
      }
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

function appendSession(lines: string[], record: ArchiveSessionRecord, counselorName: string, locale: SupportedLocale) {
  const { session } = record;
  lines.push(`#### ${singleLine(session.title, locale)}`, "");
  lines.push(copy(locale, `- 咨询师：${counselorName}`, `- Counselor: ${counselorName}`));
  lines.push(copy(locale, `- 开始时间：${formatDateTime(session.startedAt ?? session.createdAt, locale)}`, `- Started: ${formatDateTime(session.startedAt ?? session.createdAt, locale)}`));
  if (session.endedAt) lines.push(copy(locale, `- 结束时间：${formatDateTime(session.endedAt, locale)}`, `- Ended: ${formatDateTime(session.endedAt, locale)}`));
  lines.push("");

  const messages = record.messages
    .filter((message) => message.role !== "system" && (message.content.trim().length > 0 || attachmentLabels(message, locale).length > 0))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  if (messages.length === 0) {
    lines.push(copy(locale, "_这次会谈没有可导出的对话内容。_", "_This session has no conversation content to export._"), "");
  } else {
    for (const message of messages) {
      const speaker = message.role === "user" ? copy(locale, "我", "Me") : counselorName;
      const attachments = attachmentLabels(message, locale);
      lines.push(`##### ${speaker} · ${formatDateTime(message.createdAt, locale)}`, "");
      if (message.content.trim()) lines.push(message.content.trim(), "");
      if (attachments.length > 0) lines.push(copy(locale, `_附带资料：${attachments.join("、")}_`, `_Attachments: ${attachments.join(", ")}_`), "");
    }
  }

  lines.push("---", "");
}

function appendLetter(lines: string[], record: ArchiveLetterRecord, counselorName: string, locale: SupportedLocale) {
  const title = record.session?.title
    ? copy(locale, `关于「${singleLine(record.session.title, locale)}」`, `About “${singleLine(record.session.title, locale)}”`)
    : copy(locale, "咨询师来信", "Counselor letter");
  lines.push(`#### ${title}`, "");
  lines.push(copy(locale, `- 来信时间：${formatDateTime(record.letter.updatedAt, locale)}`, `- Letter date: ${formatDateTime(record.letter.updatedAt, locale)}`));
  lines.push(copy(locale, `- 咨询师：${counselorName}`, `- Counselor: ${counselorName}`), "");
  lines.push(record.letter.letterMd.trim(), "", "---", "");
}

function collectCounselorIds(input: CounselingArchiveExportInput, counselorOrder: Map<string, number>) {
  const ids = new Set<string>();
  input.sessions.forEach(({ session }) => ids.add(session.counselorId));
  input.letters.forEach(({ letter }) => {
    if (letter.status === "ready") ids.add(letter.counselorId);
  });
  return [...ids].sort((left, right) => {
    const leftOrder = counselorOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = counselorOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.localeCompare(right);
  });
}

function sessionTime(session: CounselingSession) {
  return session.startedAt ?? session.createdAt ?? session.updatedAt ?? "";
}

function singleLine(value: string, locale: SupportedLocale) {
  return value.replace(/\s+/g, " ").trim() || copy(locale, "未命名会谈", "Untitled session");
}

function attachmentLabels(message: SessionMessage, locale: SupportedLocale) {
  const metadata = message.metadata;
  if (!metadata || typeof metadata !== "object") return [];
  const labels = [
    ...collectMetadataTitles(metadata.attachments, copy(locale, "附件", "Attachment"), locale),
    ...collectMetadataTitles(metadata.importedDocuments, copy(locale, "资料", "Document"), locale)
  ];
  return [...new Set(labels)];
}

function collectMetadataTitles(value: unknown, fallback: string, locale: SupportedLocale) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const title = (entry as { title?: unknown }).title;
    if (typeof title !== "string" || !title.trim()) return [fallback];
    return [singleLine(title, locale)];
  });
}

function formatDateTime(value: string | undefined, locale: SupportedLocale) {
  if (!value) return copy(locale, "未记录", "Not recorded");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function copy(locale: SupportedLocale, zhCN: string, enUS: string) {
  return locale === "en-US" ? enUS : zhCN;
}
