import type { SessionMessage, SessionSupervision, SupportedLocale } from "@shared/index";
import type { LlmProvider } from "../../providers/llmProvider.js";
import { getSupervisorCorePrompt, getTaskPrompt } from "../../prompts/counselorPromptRegistry.js";
import { parseModelJson } from "../shared/modelJson.js";

export interface SessionSupervisionOutput {
  supervisionMd: string;
}

export const MAX_SESSION_SUPERVISION_CHARS = 8_000;

export interface BuildSessionSupervisionMessagesInput {
  counselorId: string;
  counselorName: string;
  counselorCorePrompt: string;
  counselorVoicePrompt?: string;
  locale?: SupportedLocale;
  sessionMessages: SessionMessage[];
  sessionConceptualizationMd: string;
  longTermConceptualizationMd?: string;
  transcriptReviewMd?: string;
}

export interface CreateSessionSupervisionDraftInput extends BuildSessionSupervisionMessagesInput {
  provider: LlmProvider;
  preparationId: string;
  sessionId: string;
  modelName: string;
  now?: string;
}

export function buildSessionSupervisionMessages(input: BuildSessionSupervisionMessagesInput): SessionMessage[] {
  const createdAt = new Date(0).toISOString();
  const locale = input.locale ?? "zh-CN";
  return [
    {
      id: "system-post-session-supervision",
      sessionId: "post-session-supervision",
      role: "system",
      content: [
        getSupervisorCorePrompt("li-yanyun", locale),
        getTaskPrompt("post-session-supervision", locale)
      ].join("\n\n"),
      createdAt,
      status: "sent"
    },
    {
      id: "user-post-session-supervision-material",
      sessionId: "post-session-supervision",
      role: "user",
      content: locale === "en-US" ? [
        "# Material for supervision",
        `- counselor under supervision: ${input.counselorName} (${input.counselorId})`,
        "",
        input.transcriptReviewMd ? "## 1. Sequential review of the full transcript" : "## 1. Complete session transcript",
        input.transcriptReviewMd?.trim()
          || formatSessionMessages(input.sessionMessages)
          || "No usable client or counselor messages are available.",
        "",
        "## 2. Counselor's core orientation",
        input.counselorCorePrompt.trim(),
        "",
        "## 3. Full single-session case formulation",
        input.sessionConceptualizationMd.trim(),
        "",
        "## 4. Current longitudinal case formulation",
        input.longTermConceptualizationMd?.trim() || "No longitudinal case formulation is currently available.",
        ...formatSupervisedCounselorVoice(input.counselorVoicePrompt, locale)
      ].join("\n") : [
        "# 待督导材料",
        `- 被督导咨询师：${input.counselorName}（${input.counselorId}）`,
        "",
        input.transcriptReviewMd ? "## 1. 本次会谈完整原文的分段审阅记录" : "## 1. 本次会谈完整原文",
        input.transcriptReviewMd?.trim()
          || formatSessionMessages(input.sessionMessages)
          || "本次会谈没有可用的用户与咨询师消息。",
        "",
        "## 2. 被督导咨询师核心取向",
        input.counselorCorePrompt.trim(),
        "",
        "## 3. 单次完整个案概念化",
        input.sessionConceptualizationMd.trim(),
        "",
        "## 4. 最新长期完整个案概念化",
        input.longTermConceptualizationMd?.trim() || "当前没有长期个案概念化可供比较。",
        ...formatSupervisedCounselorVoice(input.counselorVoicePrompt, locale)
      ].join("\n"),
      createdAt,
      status: "sent"
    }
  ];
}

export async function createSessionSupervisionDraft(
  input: CreateSessionSupervisionDraftInput
): Promise<SessionSupervision> {
  const transcriptChunks = splitSessionTranscript(input.sessionMessages);
  const transcriptReviewMd = transcriptChunks.length > 1
    ? await reviewTranscriptChunks(input, transcriptChunks)
    : undefined;
  const response = await input.provider.complete({
    messages: buildSessionSupervisionMessages({ ...input, transcriptReviewMd }),
    maxTokens: 6144
  });
  const parsed = parseSessionSupervisionOutput(response.content);
  const now = input.now ?? new Date().toISOString();
  return {
    id: `supervision-${input.preparationId}`,
    preparationId: input.preparationId,
    sessionId: input.sessionId,
    counselorId: input.counselorId,
    supervisorId: "li-yanyun",
    modelName: input.modelName,
    supervisionMd: parsed.supervisionMd,
    status: "ready",
    createdAt: now,
    updatedAt: now
  };
}

const supervisionTranscriptChunkChars = 40_000;

async function reviewTranscriptChunks(
  input: CreateSessionSupervisionDraftInput,
  transcriptChunks: string[]
) {
  const reviews: string[] = [];
  for (let index = 0; index < transcriptChunks.length; index += 1) {
    const response = await input.provider.complete({
      messages: buildTranscriptChunkReviewMessages(input, transcriptChunks[index], index, transcriptChunks.length),
      maxTokens: 3072
    });
    const review = parseSessionSupervisionOutput(response.content).supervisionMd;
    reviews.push(
      input.locale === "en-US"
        ? `### Segment ${index + 1}/${transcriptChunks.length}\n${review}`
        : `### 分段 ${index + 1}/${transcriptChunks.length}\n${review}`
    );
  }
  return [
    input.locale === "en-US"
      ? "Li Yanyun produced the following notes by reviewing the full session sequentially. They are an evidence index, not the final supervision conclusion."
      : "以下记录由李燕云按原始顺序逐段审阅完整会谈后形成；它们是证据索引，不是最终督导结论。",
    ...reviews
  ].join("\n\n");
}

function buildTranscriptChunkReviewMessages(
  input: BuildSessionSupervisionMessagesInput,
  transcriptChunk: string,
  index: number,
  total: number
): SessionMessage[] {
  const createdAt = new Date(0).toISOString();
  const locale = input.locale ?? "zh-CN";
  return [
    {
      id: `system-post-session-supervision-chunk-${index + 1}`,
      sessionId: "post-session-supervision",
      role: "system",
      content: [
        getSupervisorCorePrompt("li-yanyun", locale),
        locale === "en-US"
          ? "# Sequential transcript-review scene\n\nThis is one continuous segment of the complete session. Record only actual process, relational shifts, working choices, possible mismatches, and transcript evidence useful to final supervision. Do not draw final conclusions from one segment or invent surrounding context. Output strict JSON only: {\"supervisionMd\":\"...\"}."
          : "# 分段原文审阅场景\n\n这是完整会谈的一个连续分段。只记录该分段中对最终督导有用的实际过程、关系变化、有效工作、可能失配和原文依据。不得根据单段下总结论，不得补造前后文。只输出严格 JSON：{\"supervisionMd\":\"...\"}。"
      ].join("\n\n"),
      createdAt,
      status: "sent"
    },
    {
      id: `user-post-session-supervision-chunk-${index + 1}`,
      sessionId: "post-session-supervision",
      role: "user",
      content: locale === "en-US" ? [
        `# Complete-session segment ${index + 1}/${total}`,
        `Counselor under supervision: ${input.counselorName} (${input.counselorId})`,
        "",
        "## Counselor's core orientation",
        input.counselorCorePrompt.trim(),
        "",
        "## Verbatim segment in chronological order with roles preserved",
        transcriptChunk,
        ...formatSupervisedCounselorVoice(input.counselorVoicePrompt, locale)
      ].join("\n") : [
        `# 完整会谈分段 ${index + 1}/${total}`,
        `被督导咨询师：${input.counselorName}（${input.counselorId}）`,
        "",
        "## 咨询师核心取向",
        input.counselorCorePrompt.trim(),
        "",
        "## 按时间顺序保留角色的原文分段",
        transcriptChunk,
        ...formatSupervisedCounselorVoice(input.counselorVoicePrompt, locale)
      ].join("\n"),
      createdAt,
      status: "sent"
    }
  ];
}

export function parseSessionSupervisionOutput(raw: string): SessionSupervisionOutput {
  const parsed = parseModelJson(raw);
  if (!parsed || typeof parsed !== "object") throw new Error("session supervision output must be an object");
  const supervisionMd = typeof parsed.supervisionMd === "string" ? parsed.supervisionMd.trim() : "";
  if (!supervisionMd) throw new Error("session supervision missing supervisionMd");
  if (supervisionMd.length > MAX_SESSION_SUPERVISION_CHARS) {
    throw new Error(`session supervision exceeds ${MAX_SESSION_SUPERVISION_CHARS} characters (${supervisionMd.length})`);
  }
  return { supervisionMd };
}

function formatSupervisedCounselorVoice(
  counselorVoicePrompt: string | undefined,
  locale: SupportedLocale
) {
  const voice = counselorVoicePrompt?.trim();
  if (!voice) return [];
  return locale === "en-US"
    ? [
        "",
        "## Supervised counselor's voice and expression style (reference only)",
        "Use this only to evaluate whether the counselor's actual responses fit their role. It must not determine or imitate Li Yanyun's supervision-report voice.",
        voice
      ]
    : [
        "",
        "## 被督导咨询师的语言与表达风格（仅作评估参考）",
        "只用于判断咨询师的实际回应是否符合其角色，不得决定或模仿李燕云督导报告的表达方式。",
        voice
      ];
}

function formatSessionMessages(messages: SessionMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .filter((message) => message.status !== "failed")
    .map((message) => `${message.role}: ${message.content.trim()}`)
    .filter((line) => line.trim().length > 0)
    .join("\n\n");
}

function splitSessionTranscript(messages: SessionMessage[]) {
  const entries = messages
    .filter((message): message is SessionMessage & { role: "user" | "assistant" } =>
      message.role === "user" || message.role === "assistant"
    )
    .filter((message) => message.status !== "failed")
    .flatMap((message) => splitTranscriptEntry(message.role, message.content.trim()));
  const chunks: string[] = [];
  let current = "";
  for (const entry of entries) {
    const candidate = current ? `${current}\n\n${entry}` : entry;
    if (current && candidate.length > supervisionTranscriptChunkChars) {
      chunks.push(current);
      current = entry;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitTranscriptEntry(role: "user" | "assistant", content: string) {
  if (!content) return [];
  const availableChars = supervisionTranscriptChunkChars - 80;
  const parts: string[] = [];
  for (let offset = 0; offset < content.length; offset += availableChars) {
    const continuation = offset === 0 ? "" : " (续)";
    parts.push(`${role}${continuation}: ${content.slice(offset, offset + availableChars)}`);
  }
  return parts;
}
