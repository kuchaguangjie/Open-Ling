import type {
  CounselingSession,
  DataExportScope,
  SessionLetter,
  SessionMessage,
  SupportedLocale
} from "../../../../../packages/shared/src/index.js";
import { exportCounselingArchiveMarkdown } from "../../../../../packages/core/src/export/archiveMarkdownExporter.js";
import { chmod, writeFile } from "node:fs/promises";

export interface DataExportRepositories {
  sessions: { list: () => Promise<CounselingSession[]> };
  messages: { listBySessionId: (sessionId: string) => Promise<SessionMessage[]> };
  sessionLetters: { list: () => Promise<SessionLetter[]> };
}

export interface CollectedDataExport {
  content: string;
  fileName: string;
  sessionCount: number;
  letterCount: number;
}

export async function collectDataExport(
  repositories: DataExportRepositories,
  scope: DataExportScope,
  generatedAt = new Date().toISOString(),
  locale: SupportedLocale = "zh-CN"
): Promise<CollectedDataExport> {
  const sessions = await repositories.sessions.list();
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const includeSessions = scope === "all" || scope === "sessions";
  const includeLetters = scope === "all" || scope === "letters";
  const sessionRecords = includeSessions
    ? await Promise.all(
        sessions.map(async (session) => ({
          session,
          messages: await repositories.messages.listBySessionId(session.id)
        }))
      )
    : [];
  const letters = includeLetters
    ? (await repositories.sessionLetters.list())
        .filter((letter) => letter.status === "ready")
        .map((letter) => ({ letter, session: sessionById.get(letter.sessionId) }))
    : [];
  const date = formatLocalFileDate(generatedAt);
  const fileLabel: Record<DataExportScope, string> = locale === "en-US"
    ? { all: "Sessions-and-Letters", sessions: "Session-Records", letters: "Counselor-Letters" }
    : { all: "会谈与来信", sessions: "会谈记录", letters: "咨询师来信" };

  return {
    content: exportCounselingArchiveMarkdown({
      generatedAt,
      locale,
      scope,
      sessions: sessionRecords,
      letters
    }),
    fileName: `Ling-${fileLabel[scope]}-${date}.md`,
    sessionCount: sessionRecords.length,
    letterCount: letters.length
  };
}

export async function saveCollectedDataExport(archive: CollectedDataExport, filePath: string) {
  await writeFile(filePath, archive.content, "utf8");
  await chmod(filePath, 0o600);
}

function formatLocalFileDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
