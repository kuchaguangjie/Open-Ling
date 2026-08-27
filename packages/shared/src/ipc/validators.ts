import type { CounselingSession } from "../types/session.js";
import type { CounselingStreamRequest } from "../types/counseling.js";
import type { ImportedDocument } from "../types/importedDocument.js";
import type { SessionMessage } from "../types/message.js";
import type { MemoryItem } from "../types/memory.js";
import type { UserSettings } from "../types/settings.js";

// ---------------------------------------------------------------------------
// Minimal runtime payload validators for settings / sessions / messages / memories.
// Each function returns `null` when the payload is structurally acceptable,
// or a Chinese error string describing what's wrong.
//
// These are NOT comprehensive JSON Schema validators — they only guard the
// fields the repository layer needs to avoid a crash or data corruption.
// ---------------------------------------------------------------------------

/** Required string fields on a CounselingSession payload */
const SESSION_REQUIRED: string[] = [
  "id", "title", "counselorId", "roomThemeId", "modelName", "status"
];

/** Required string fields on a SessionMessage payload */
const MESSAGE_REQUIRED: string[] = [
  "id", "sessionId", "role", "content", "createdAt"
];

/** Required string fields on a MemoryItem payload */
const MEMORY_REQUIRED: string[] = [
  "id", "type", "title", "content", "status", "createdAt", "updatedAt"
];

const IMPORTED_DOCUMENT_REQUIRED: string[] = [
  "id", "sessionId", "title", "kind", "content", "createdAt", "status"
];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

export function validateId(id: unknown): string | null {
  if (!isNonEmptyString(id)) return "id 不能为空";
  return null;
}

export function validateSettings(payload: unknown): string | null {
  if (payload === null || payload === undefined || typeof payload !== "object") {
    return "settings 必须是一个对象";
  }
  const s = payload as Record<string, unknown>;
  if (typeof s.api !== "object" || s.api === null) {
    return "缺少 settings.api 字段";
  }
  const api = s.api as Record<string, unknown>;
  if (!isNonEmptyString(api.apiBaseUrl)) return "缺少 settings.api.apiBaseUrl";
  if (!isNonEmptyString(api.modelName)) return "缺少 settings.api.modelName";
  if (api.connectionKind !== undefined && !["local", "remote"].includes(api.connectionKind as string)) {
    return "settings.api.connectionKind 不合法";
  }
  if (api.localRuntime !== undefined && !["ollama", "lm-studio", "custom"].includes(api.localRuntime as string)) {
    return "settings.api.localRuntime 不合法";
  }
  if (api.remoteProvider !== undefined && !["deepseek", "kimi", "glm", "qwen", "custom"].includes(api.remoteProvider as string)) {
    return "settings.api.remoteProvider 不合法";
  }
  if (api.reasoningEffort !== undefined && !["none", "minimal", "low", "medium", "high", "xhigh", "max"].includes(api.reasoningEffort as string)) {
    return "settings.api.reasoningEffort 不合法";
  }
  if (s.voiceInput !== undefined) {
    if (!s.voiceInput || typeof s.voiceInput !== "object") return "settings.voiceInput 必须是对象";
    const voiceInput = s.voiceInput as Record<string, unknown>;
    if (!["local", "volcengine", "tencent", "aliyun"].includes(voiceInput.provider as string)) {
      return "settings.voiceInput.provider 不合法";
    }
    if (voiceInput.shortcut !== undefined && (typeof voiceInput.shortcut !== "string" || voiceInput.shortcut.length > 48)) {
      return "settings.voiceInput.shortcut 不合法";
    }
    if (!voiceInput.doubao || typeof voiceInput.doubao !== "object") {
      return "缺少 settings.voiceInput.doubao";
    }
    const doubao = voiceInput.doubao as Record<string, unknown>;
    if (!["seed-asr-2.0-hourly", "seed-asr-1.0-hourly", "seed-asr-1.0-concurrent"].includes(doubao.model as string)) {
      return "settings.voiceInput.doubao.model 不合法";
    }
    if (!voiceInput.tencent || typeof voiceInput.tencent !== "object") {
      return "缺少 settings.voiceInput.tencent";
    }
    const tencent = voiceInput.tencent as Record<string, unknown>;
    if (tencent.model !== "16k_zh") {
      return "settings.voiceInput.tencent.model 不合法";
    }
    if (!voiceInput.aliyun || typeof voiceInput.aliyun !== "object") {
      return "缺少 settings.voiceInput.aliyun";
    }
    const aliyun = voiceInput.aliyun as Record<string, unknown>;
    if (!["fun-asr-realtime", "qwen3-asr-flash-realtime"].includes(aliyun.model as string)) {
      return "settings.voiceInput.aliyun.model 不合法";
    }
    if (!["beijing", "singapore"].includes(aliyun.region as string)) {
      return "settings.voiceInput.aliyun.region 不合法";
    }
  }
  if (!isNonEmptyString(s.defaultCounselorId as string)) return "缺少 settings.defaultCounselorId";
  if (
    s.disabledCounselorIds !== undefined &&
    (!Array.isArray(s.disabledCounselorIds) || !s.disabledCounselorIds.every(isNonEmptyString))
  ) {
    return "settings.disabledCounselorIds 必须是字符串数组";
  }
  if (!isNonEmptyString(s.defaultRoomThemeId as string)) return "缺少 settings.defaultRoomThemeId";
  return null;
}

export function validateSessionPayload(payload: unknown): string | null {
  if (payload === null || payload === undefined || typeof payload !== "object") {
    return "session 必须是一个对象";
  }
  const obj = payload as Record<string, unknown>;
  for (const key of SESSION_REQUIRED) {
    if (!isNonEmptyString(obj[key])) return `session 缺少必填字段: ${key}`;
  }
  if (!["draft", "active", "ended"].includes(obj.status as string)) return "session.status 不合法";
  return null;
}

export function validateSessionUpdatePayload(payload: unknown): string | null {
  if (payload === null || payload === undefined || typeof payload !== "object" || Array.isArray(payload)) {
    return "session changes 必须是一个对象";
  }
  const changes = payload as Record<string, unknown>;
  const allowed = new Set(["title", "summary", "updatedAt"]);
  const keys = Object.keys(changes);
  if (keys.length === 0) return "session changes 不能为空";
  const forbidden = keys.find((key) => !allowed.has(key));
  if (forbidden) return `session changes 不允许修改字段: ${forbidden}`;
  if (changes.title !== undefined && !isNonEmptyString(changes.title)) return "session.title 不能为空";
  if (changes.summary !== undefined && typeof changes.summary !== "string") return "session.summary 必须是字符串";
  if (changes.updatedAt !== undefined && !isNonEmptyString(changes.updatedAt)) return "session.updatedAt 不能为空";
  return null;
}

export function validateMessagePayload(payload: unknown): string | null {
  if (payload === null || payload === undefined || typeof payload !== "object") {
    return "message 必须是一个对象";
  }
  const obj = payload as Record<string, unknown>;
  for (const key of MESSAGE_REQUIRED) {
    if (!isNonEmptyString(obj[key])) return `message 缺少必填字段: ${key}`;
  }
  if (!["system", "user", "assistant"].includes(obj.role as string)) return "message.role 不合法";
  if (obj.status !== undefined && !["draft", "sending", "sent", "failed"].includes(obj.status as string)) {
    return "message.status 不合法";
  }
  if ((obj.content as string).length > 200_000) return "message.content 过长";
  return null;
}

export function validateMessageBatchPayload(payload: unknown): string | null {
  if (!Array.isArray(payload) || payload.length === 0) return "messages 必须是非空数组";
  let sessionId: string | undefined;
  for (let index = 0; index < payload.length; index += 1) {
    const error = validateMessagePayload(payload[index]);
    if (error) return `messages[${index}]: ${error}`;
    const message = payload[index] as SessionMessage;
    sessionId ??= message.sessionId;
    if (message.sessionId !== sessionId) return "messages 必须属于同一次咨询";
  }
  return null;
}

export function validateCounselingStreamRequest(payload: unknown): string | null {
  if (payload === null || payload === undefined || typeof payload !== "object") {
    return "stream request 必须是一个对象";
  }
  const request = payload as Partial<CounselingStreamRequest>;
  if (!isNonEmptyString(request.requestId)) return "缺少 requestId";
  if (!isNonEmptyString(request.sessionId)) return "缺少 sessionId";
  if (!isNonEmptyString(request.assistantMessageId)) return "缺少 assistantMessageId";
  if (typeof request.api !== "object" || request.api === null) return "缺少 api";
  if (!isNonEmptyString(request.api.apiBaseUrl)) return "缺少 apiBaseUrl";
  if (!isNonEmptyString(request.api.modelName)) return "缺少 modelName";
  if (request.api.reasoningEffort !== undefined && !["none", "minimal", "low", "medium", "high", "xhigh", "max"].includes(request.api.reasoningEffort)) {
    return "reasoningEffort 不合法";
  }

  const messageErr = validateMessagePayload(request.message);
  if (messageErr) return messageErr;
  const message = request.message as SessionMessage;
  if (message.role !== "user") return "缺少用户消息";
  if (message.sessionId !== request.sessionId) return "用户消息 sessionId 与请求 sessionId 不一致";

  if (request.contextMessages !== undefined) {
    if (!Array.isArray(request.contextMessages)) return "contextMessages 必须是数组";
    for (let index = 0; index < request.contextMessages.length; index += 1) {
      const contextMessage = request.contextMessages[index];
      const contextMessageErr = validateMessagePayload(contextMessage);
      if (contextMessageErr) return `contextMessages[${index}]: ${contextMessageErr}`;
      if (contextMessage.sessionId !== request.sessionId) {
        return `contextMessages[${index}].sessionId 与请求 sessionId 不一致`;
      }
    }
  }

  if (request.imageInputs !== undefined) {
    if (!Array.isArray(request.imageInputs) || request.imageInputs.length === 0 || request.imageInputs.length > 16) {
      return "imageInputs 数量不合法";
    }
    let totalDataUrlLength = 0;
    for (let index = 0; index < request.imageInputs.length; index += 1) {
      const image = request.imageInputs[index];
      if (!image || typeof image !== "object") return `imageInputs[${index}] 不合法`;
      if (!isNonEmptyString(image.name) || image.name.length > 255) return `imageInputs[${index}].name 不合法`;
      if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(image.mimeType)) {
        return `imageInputs[${index}].mimeType 不合法`;
      }
      const prefix = `data:${image.mimeType};base64,`;
      if (typeof image.dataUrl !== "string" || !image.dataUrl.startsWith(prefix)) {
        return `imageInputs[${index}].dataUrl 不合法`;
      }
      totalDataUrlLength += image.dataUrl.length;
    }
    if (totalDataUrlLength > 48 * 1024 * 1024) return "imageInputs 总大小超过 48 MiB";
  }

  return null;
}

export function validateMemoryPayload(payload: unknown): string | null {
  if (payload === null || payload === undefined || typeof payload !== "object") {
    return "memory 必须是一个对象";
  }
  const obj = payload as Record<string, unknown>;
  for (const key of MEMORY_REQUIRED) {
    if (!isNonEmptyString(obj[key])) return `memory 缺少必填字段: ${key}`;
  }
  if (!["profile", "theme", "event", "preference"].includes(obj.type as string)) {
    return "memory.type 不合法";
  }
  if (!["pending", "confirmed", "hidden"].includes(obj.status as string)) {
    return "memory.status 不合法";
  }
  if ((obj.content as string).length > 200_000) return "memory.content 过长";
  return null;
}

export function validateMemoryUpdatePayload(payload: unknown): string | null {
  if (payload === null || payload === undefined || typeof payload !== "object" || Array.isArray(payload)) {
    return "memory changes 必须是一个对象";
  }
  const changes = payload as Record<string, unknown>;
  const allowed = new Set(["type", "title", "content", "sourceSessionId", "status", "updatedAt"]);
  const keys = Object.keys(changes);
  if (keys.length === 0) return "memory changes 不能为空";
  const forbidden = keys.find((key) => !allowed.has(key));
  if (forbidden) return `memory changes 不允许修改字段: ${forbidden}`;
  if (changes.type !== undefined && !["profile", "theme", "event", "preference"].includes(changes.type as string)) {
    return "memory.type 不合法";
  }
  if (changes.status !== undefined && !["pending", "confirmed", "hidden"].includes(changes.status as string)) {
    return "memory.status 不合法";
  }
  if (changes.content !== undefined && typeof changes.content === "string" && changes.content.length > 200_000) {
    return "memory.content 过长";
  }
  return null;
}

export function validateImportedDocumentPayload(payload: unknown): string | null {
  if (payload === null || payload === undefined || typeof payload !== "object") {
    return "document 必须是一个对象";
  }
  const obj = payload as Record<string, unknown>;
  for (const key of IMPORTED_DOCUMENT_REQUIRED) {
    if (!isNonEmptyString(obj[key])) return `document 缺少必填字段: ${key}`;
  }
  if ((obj as Partial<ImportedDocument>).kind !== "pasted-text") return "document.kind 不合法";
  if (!["ready", "processing", "failed"].includes(obj.status as string)) return "document.status 不合法";
  if (typeof obj.contentLength !== "number" || obj.contentLength < 0) return "document.contentLength 不合法";
  if ((obj.content as string).length !== obj.contentLength) return "document.contentLength 与内容长度不一致";
  return null;
}
