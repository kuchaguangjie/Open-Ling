import type { SessionMessage, SupportedLocale } from "@shared/index";
import type { LlmProvider } from "../../providers/llmProvider.js";

const TITLE_MAX_CHARS = 10;
const ENGLISH_TITLE_MAX_CHARS = 50;
const TITLE_MESSAGE_LIMIT = 10;

export function isDefaultSessionTitle(title: string) {
  const text = title.trim();
  return (
    /^与.+的会谈 · session \d+$/.test(text) ||
    /^与.+的会谈 · \d{4}年\d{1,2}月\d{1,2}日 · session \d+$/.test(text) ||
    /^与.+的会谈 · \d{1,2}月\d{1,2}日 [A-Z](?:\d+)?$/.test(text) ||
    /^Session with .+ · (?:session \d+|[A-Z](?:\d+)?)$/i.test(text) ||
    /^Session with .+ · [A-Z][a-z]{2} \d{1,2}, \d{4} · session \d+$/i.test(text)
  );
}

export function normalizeSessionTitle(title: string, locale: SupportedLocale = "zh-CN") {
  const normalized = String(title || "")
    .trim()
    .replace(/^["'“”‘’《【\[\(（]+/, "")
    .replace(/["'“”‘’》】\]\)）]+$/, "")
    .replace(/^(标题|会谈标题|主题)[:：]\s*/, "")
    .replace(/^关于/, "")
    .replace(/^(title|session title|topic):\s*/i, "")
    .replace(/(的)?(长标题|短标题|会谈标题|标题|需要整理|需要讨论|相关讨论)$/g, "")
    .replace(/[。！？!?，,、；;：:]+$/g, "")
    .trim();
  return Array.from(normalized)
    .slice(0, locale === "en-US" ? ENGLISH_TITLE_MAX_CHARS : TITLE_MAX_CHARS)
    .join("");
}

export async function createSessionTitleDraft({
  provider,
  sessionId,
  messages,
  locale = "zh-CN"
}: {
  provider: LlmProvider;
  sessionId: string;
  messages: SessionMessage[];
  locale?: SupportedLocale;
}) {
  const source = selectTitleSourceMessages(messages);
  if (source.length === 0) return "";

  const generated = await provider.complete({
    maxTokens: 32,
    messages: [
      {
        id: "session-title-system",
        sessionId,
        role: "system",
        content: locale === "en-US" ? [
          "You generate concise session titles for Ling.",
          "Create a natural English title from the opening of this counseling session.",
          `The title must be no more than ${ENGLISH_TITLE_MAX_CHARS} characters.`,
          "Output the title only, without explanation or quotation marks."
        ].join("\n") : [
          "你是 Ling 的会谈标题生成器。",
          "请根据会谈开头内容生成一个中文短标题。",
          `标题必须在 ${TITLE_MAX_CHARS} 个字以内。`,
          "只输出标题本身，不要解释，不要加引号。"
        ].join("\n"),
        createdAt: new Date().toISOString()
      },
      {
        id: "session-title-user",
        sessionId,
        role: "user",
        content: locale === "en-US" ? [
          "Opening session content:",
          ...source.map((message) => `${message.role === "user" ? "Client" : "Counselor"}: ${message.content.trim()}`),
          "",
          "Output the session title."
        ].join("\n") : [
          "会谈开头内容：",
          ...source.map((message) => `${message.role === "user" ? "用户" : "咨询师"}：${message.content.trim()}`),
          "",
          "请输出会谈标题。"
        ].join("\n"),
        createdAt: new Date().toISOString()
      }
    ]
  });

  return normalizeSessionTitle(generated.content, locale);
}

function selectTitleSourceMessages(messages: SessionMessage[]) {
  const selected: SessionMessage[] = [];
  let hasSeenUser = false;

  for (const message of messages) {
    if (selected.length >= TITLE_MESSAGE_LIMIT) break;
    if (message.status !== "sent") continue;
    if (message.role !== "user" && message.role !== "assistant") continue;

    const content = message.content.trim();
    if (!content) continue;
    if (message.role === "assistant" && !hasSeenUser) continue;
    if (message.role === "user") hasSeenUser = true;

    selected.push({ ...message, content: stripTitleSourceNoise(content) });
  }

  return selected.filter((message) => message.content.trim());
}

function stripTitleSourceNoise(content: string) {
  return content
    .replace(/\n+\[资料附件][\s\S]*$/g, "")
    .replace(/\n+附件[:：][\s\S]*$/g, "")
    .trim()
    .slice(0, 500);
}
