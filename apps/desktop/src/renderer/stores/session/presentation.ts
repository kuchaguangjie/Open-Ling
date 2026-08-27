import {
  getDefaultCounselors,
  type CounselingSession,
  type SessionMessage,
  type SupportedLocale
} from "@shared/index";
import type { PrototypeSession } from "./types";

export const nowLabel = "刚刚";

export function toPrototypeSession(session: CounselingSession, messages: SessionMessage[], messagesLoaded = true): PrototypeSession {
  const locale = session.promptSnapshot?.version === 3 ? session.promptSnapshot.locale : "zh-CN";
  return {
    id: session.id,
    title: session.title,
    time: formatSessionTime(session.updatedAt ?? session.startedAt ?? session.createdAt),
    preview: previewFromMessages(
      messages,
      session.summary ?? (locale === "en-US"
        ? "Begin with whatever feels most important right now."
        : "可以从此刻最想说的地方开始。")
    ),
    counselorId: session.counselorId,
    roomThemeId: session.roomThemeId,
    teamId: session.teamId,
    modelName: session.modelName,
    promptSnapshot: session.promptSnapshot,
    createdAt: session.createdAt,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    status: session.status,
    updatedAt: session.updatedAt,
    messages,
    messagesLoaded
  };
}

export function metadataFromPrototypeSession(session: PrototypeSession) {
  return {
    currentCounselorId: session.counselorId,
    currentRoomThemeId: session.roomThemeId,
    currentTeamId: session.teamId ?? "one-way-mirror",
    currentModelName: session.modelName
  };
}

export function metadataFromCounselingSession(session: CounselingSession) {
  return {
    currentCounselorId: session.counselorId,
    currentRoomThemeId: session.roomThemeId,
    currentTeamId: session.teamId ?? "one-way-mirror",
    currentModelName: session.modelName
  };
}

export function previewFromMessages(messages: SessionMessage[], fallback: string) {
  return messages[messages.length - 1]?.content ?? fallback;
}

export function buildSessionListMetadata(
  session: PrototypeSession | undefined,
  previewContent: string,
  updatedAt: string,
  locale: SupportedLocale = "zh-CN"
) {
  return {
    title: session?.title || (locale === "en-US" ? "Untitled session" : "未命名会谈"),
    preview: normalizeListText(previewContent),
    time: locale === "en-US" ? "Just now" : nowLabel,
    updatedAt
  };
}

export function buildDefaultSessionTitle({
  counselorId,
  sessions,
  locale = "zh-CN"
}: {
  counselorId: string;
  createdAt: string;
  sessions: PrototypeSession[];
  locale?: SupportedLocale;
}) {
  const counselorName =
    getDefaultCounselors(locale).find((counselor) => counselor.id === counselorId)?.name ??
    (locale === "en-US" ? "Counselor" : "咨询师");
  const baseTitle = locale === "en-US" ? `Session with ${counselorName}` : `与${counselorName}的会谈`;
  const counselorSessions = sessions.filter((session) => session.counselorId === counselorId);
  const highestExistingNumber = counselorSessions.reduce((highest, session) => {
    const match = session.title.match(new RegExp(`^${escapeRegExp(baseTitle)} · session (\\d+)$`));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${baseTitle} · session ${Math.max(counselorSessions.length, highestExistingNumber) + 1}`;
}

export function normalizeListText(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

export function formatSessionTime(value: string | undefined, locale: SupportedLocale = "zh-CN") {
  const currentLabel = locale === "en-US" ? "Just now" : nowLabel;
  if (!value) return currentLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return currentLabel;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs >= 0 && diffMs < 60_000) return currentLabel;
  if (isSameLocalDate(date, now)) return locale === "en-US" ? `Today ${formatHourMinute(date)}` : `今天 ${formatHourMinute(date)}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameLocalDate(date, yesterday)) return locale === "en-US" ? `Yesterday ${formatHourMinute(date)}` : `昨天 ${formatHourMinute(date)}`;
  return locale === "en-US"
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : `${date.getMonth() + 1}/${date.getDate()}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSameLocalDate(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function formatHourMinute(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
