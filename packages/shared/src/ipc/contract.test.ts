// @vitest-environment node
import { describe, expect, it } from "vitest";

// We test the pure validation/response helpers that don't depend on Electron.
// These can be imported once the shared IPC module exists.
import {
  IPC_CHANNELS,
  type IpcSuccess,
  type IpcFailure,
  success,
  failure,
  ERROR_CODES,
  sanitizeErrorPayload,
  wrapIpcHandler,
} from "@shared/ipc/index.js";
import {
  validateCounselingStreamRequest,
  validateId,
  validateSettings,
  validateMessagePayload,
  validateMessageBatchPayload,
  validateSessionPayload,
  validateSessionUpdatePayload,
  validateImportedDocumentPayload,
  validateMemoryPayload,
} from "@shared/ipc/index.js";

describe("IPC channel constants", () => {
  it("defines all expected channels as non-empty strings", () => {
    expect(typeof IPC_CHANNELS.APP_INFO).toBe("string");
    expect(IPC_CHANNELS.APP_INFO.length).toBeGreaterThan(0);
    expect(typeof IPC_CHANNELS.COUNSELOR_PACKAGES_LIST).toBe("string");
    expect(typeof IPC_CHANNELS.COUNSELOR_PACKAGES_INSTALL).toBe("string");
    expect(typeof IPC_CHANNELS.COUNSELOR_PACKAGES_REMOVE).toBe("string");

    expect(typeof IPC_CHANNELS.SETTINGS_READ).toBe("string");
    expect(typeof IPC_CHANNELS.SETTINGS_SAVE).toBe("string");
    expect(typeof IPC_CHANNELS.SETTINGS_API_KEY_HAS).toBe("string");
    expect(typeof IPC_CHANNELS.SETTINGS_API_KEY_DELETE).toBe("string");
    expect(typeof IPC_CHANNELS.SETTINGS_TEST_CONNECTION).toBe("string");
    expect(typeof IPC_CHANNELS.SETTINGS_LIST_MODELS).toBe("string");
    expect(typeof IPC_CHANNELS.SESSIONS_LIST).toBe("string");
    expect(typeof IPC_CHANNELS.SESSIONS_GET).toBe("string");
    expect(typeof IPC_CHANNELS.SESSIONS_CREATE).toBe("string");
    expect(typeof IPC_CHANNELS.SESSIONS_UPDATE).toBe("string");
    expect(typeof IPC_CHANNELS.SESSIONS_DELETE).toBe("string");
    expect(typeof IPC_CHANNELS.SESSIONS_ACTIVATE_DRAFT).toBe("string");
    expect(typeof IPC_CHANNELS.SESSIONS_CANCEL_DRAFT).toBe("string");
    expect(typeof IPC_CHANNELS.SESSIONS_END).toBe("string");
    expect(typeof IPC_CHANNELS.SESSIONS_RESUME).toBe("string");
    expect(typeof IPC_CHANNELS.CONSULTATION_PREPARATION_GET_BY_SESSION).toBe("string");
    expect(typeof IPC_CHANNELS.CONSULTATION_PREPARATION_GET_LATEST_BY_COUNSELOR).toBe("string");
    expect(typeof IPC_CHANNELS.CONSULTATION_PREPARATION_RETRY).toBe("string");
    expect(typeof IPC_CHANNELS.SESSION_LETTERS_LIST).toBe("string");
    expect(typeof IPC_CHANNELS.SESSION_LETTERS_GET_BY_SESSION).toBe("string");
    expect(typeof IPC_CHANNELS.SESSION_LETTERS_REGENERATE).toBe("string");
    expect(typeof IPC_CHANNELS.MESSAGES_LIST).toBe("string");
    expect(typeof IPC_CHANNELS.MESSAGES_APPEND).toBe("string");
    expect(typeof IPC_CHANNELS.MESSAGES_APPEND_MANY).toBe("string");
    expect(typeof IPC_CHANNELS.DOCUMENTS_CREATE).toBe("string");
    expect(typeof IPC_CHANNELS.DOCUMENTS_GET).toBe("string");
    expect(typeof IPC_CHANNELS.DOCUMENTS_LIST_BY_SESSION).toBe("string");
    expect(typeof IPC_CHANNELS.MEMORIES_LIST).toBe("string");
    expect(typeof IPC_CHANNELS.MEMORIES_CREATE).toBe("string");
    expect(typeof IPC_CHANNELS.MEMORIES_UPDATE).toBe("string");
    expect(typeof IPC_CHANNELS.MEMORIES_DELETE).toBe("string");
    expect(typeof IPC_CHANNELS.COUNSELING_STREAM_GET_ACTIVE).toBe("string");
  });

  it("has no duplicate channel values", () => {
    const values = Object.values(IPC_CHANNELS);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("success / failure helpers", () => {
  it("success() wraps data in { ok: true, data }", () => {
    const result = success({ name: "Ling" });
    expect(result).toEqual({ ok: true, data: { name: "Ling" } });
  });

  it("success() handles null data", () => {
    const result = success(null);
    expect(result).toEqual({ ok: true, data: null });
  });

  it("failure() returns { ok: false, error } with code and message", () => {
    const result = failure("VALIDATION_ERROR", "缺少必填字段");
    expect(result).toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "缺少必填字段" }
    });
  });

  it("sanitizeErrorPayload strips apiKey, content, and stack from error context", () => {
    const dirty = {
      apiKey: "sk-secret-123",
      modelName: "gpt-4",
      content: "用户说了很多私密的话",
      stack: "Error\n  at foo.ts:12",
      apiBaseUrl: "https://api.example.com/v1"
    };
    const clean = sanitizeErrorPayload(dirty);
    expect(clean.apiKey).toBe("[redacted]");
    expect(clean.content).toBe("[redacted]");
    expect(clean.stack).toBe("[redacted]");
    // Safe fields should remain
    expect(clean.modelName).toBe("gpt-4");
    expect(clean.apiBaseUrl).toBe("https://api.example.com/v1");
  });
});

describe("wrapIpcHandler", () => {
  it("does not wrap an IpcFailure inside an IpcSuccess", async () => {
    const handler = wrapIpcHandler(async () => failure(ERROR_CODES.VALIDATION_ERROR, "缺少必填字段"));

    await expect(handler()).resolves.toEqual({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "缺少必填字段" }
    });
  });

  it("wraps successful business data in an IpcSuccess", async () => {
    const handler = wrapIpcHandler(async () => ({ name: "Ling" }));

    await expect(handler()).resolves.toEqual({
      ok: true,
      data: { name: "Ling" }
    });
  });

  it("returns a fixed safe internal error message without leaking thrown details", async () => {
    const handler = wrapIpcHandler(async () => {
      throw new Error("apiKey=sk-test content=私密内容 stack=trace");
    });

    const result = await handler();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(result.error.message).toBe("服务器内部错误，请稍后重试");
      expect(result.error.message).not.toContain("sk-test");
      expect(result.error.message).not.toContain("私密内容");
      expect(result.error.message).not.toContain("stack");
    }
  });
});

describe("validateId", () => {
  it("returns null for a valid string id", () => {
    expect(validateId("session-1")).toBeNull();
    expect(validateId("abc123")).toBeNull();
  });

  it("returns an error string for invalid id (empty)", () => {
    expect(validateId("")).toBe("id 不能为空");
  });

  it("returns an error string for non-string id", () => {
    expect(validateId(undefined as unknown as string)).toBe("id 不能为空");
  });
});

describe("validateSettings", () => {
  it("returns null for valid UserSettings", () => {
    const valid = {
      api: { apiBaseUrl: "https://api.example.com/v1", apiKey: "key", modelName: "m" },
      defaultCounselorId: "chengling",
      defaultRoomThemeId: "quiet-study"
    };
    expect(validateSettings(valid)).toBeNull();
  });

  it("allows settings without a full api key", () => {
    const valid = {
      api: { apiBaseUrl: "https://api.example.com/v1", apiKeySaved: true, apiKeyPreview: "sk...xx", modelName: "m" },
      defaultCounselorId: "chengling",
      defaultRoomThemeId: "quiet-study"
    };
    expect(validateSettings(valid)).toBeNull();
  });

  it("allows settings with local profile data", () => {
    const valid = {
      api: { apiBaseUrl: "https://api.example.com/v1", apiKeySaved: true, modelName: "m" },
      defaultCounselorId: "chengling",
      defaultRoomThemeId: "quiet-study",
      profile: {
        displayName: "Bella",
        background: "希望对话慢一点。",
        avatarDataUrl: "data:image/png;base64,YXZhdGFy",
        avatarFileName: "avatar.png"
      }
    };
    expect(validateSettings(valid)).toBeNull();
  });

  it("allows a list of counselors disabled for new consultations", () => {
    const valid = {
      api: { apiBaseUrl: "https://api.example.com/v1", modelName: "m" },
      defaultCounselorId: "chengling",
      disabledCounselorIds: ["professional-listener"],
      defaultRoomThemeId: "quiet-study"
    };
    expect(validateSettings(valid)).toBeNull();
    expect(validateSettings({ ...valid, disabledCounselorIds: [""] })).toBe(
      "settings.disabledCounselorIds 必须是字符串数组"
    );
  });

  it("returns error for missing api", () => {
    expect(validateSettings({ defaultCounselorId: "x", defaultRoomThemeId: "y" } as any)).toBe(
      "缺少 settings.api 字段"
    );
  });

  it("returns error for null/undefined", () => {
    expect(validateSettings(null as any)).toBe("settings 必须是一个对象");
    expect(validateSettings(undefined as any)).toBe("settings 必须是一个对象");
  });
});

describe("validateMessagePayload", () => {
  it("returns null for a valid SessionMessage", () => {
    const valid = {
      id: "msg-1",
      sessionId: "s1",
      role: "user" as const,
      content: "hello",
      createdAt: "2026-07-03T10:00:00.000Z",
      status: "sent" as const,
    };
    expect(validateMessagePayload(valid)).toBeNull();
  });

  it("returns error for missing id", () => {
    const msg = {
      sessionId: "s1",
      role: "user",
      content: "hello",
      createdAt: "2026-07-03T10:00:00.000Z",
    };
    expect(validateMessagePayload(msg as any)).toBe("message 缺少必填字段: id");
  });

  it("rejects invalid status and lifecycle fields in a generic update", () => {
    expect(
      validateSessionPayload({
        id: "s1",
        title: "测试",
        counselorId: "chengling",
        roomThemeId: "quiet-study",
        modelName: "m",
        status: "unknown"
      })
    ).toBe("session.status 不合法");
    expect(validateSessionUpdatePayload({ status: "ended", updatedAt: "2026-07-12T12:00:00.000Z" })).toBe(
      "session changes 不允许修改字段: status"
    );
    expect(validateSessionUpdatePayload({ title: "新标题", updatedAt: "2026-07-12T12:00:00.000Z" })).toBeNull();
  });

  it("returns error for missing sessionId", () => {
    const msg = { id: "m1", role: "user", content: "hello", createdAt: "2026-07-03T10:00:00.000Z" };
    expect(validateMessagePayload(msg as any)).toBe("message 缺少必填字段: sessionId");
  });
});

describe("validateMessageBatchPayload", () => {
  const message = {
    id: "msg-1",
    sessionId: "session-1",
    role: "user" as const,
    content: "hello",
    createdAt: "2026-07-12T10:00:00.000Z",
    status: "sent" as const
  };

  it("accepts a non-empty same-session batch", () => {
    expect(validateMessageBatchPayload([message, { ...message, id: "msg-2", role: "assistant" }])).toBeNull();
  });

  it("rejects empty and mixed-session batches", () => {
    expect(validateMessageBatchPayload([])).toBe("messages 必须是非空数组");
    expect(validateMessageBatchPayload([message, { ...message, id: "msg-2", sessionId: "session-2" }])).toBe(
      "messages 必须属于同一次咨询"
    );
  });
});

describe("validateCounselingStreamRequest", () => {
  const valid = {
    requestId: "request-1",
    sessionId: "session-1",
    api: {
      apiBaseUrl: "https://api.example.com/v1",
      modelName: "deepseek-v4-flash"
    },
    message: {
      id: "user-1",
      sessionId: "session-1",
      role: "user" as const,
      content: "我最近有点累。",
      createdAt: "2026-07-05T10:00:00.000Z",
      status: "sent" as const
    },
    assistantMessageId: "assistant-1",
    contextMessages: [
      {
        id: "previous-user",
        sessionId: "session-1",
        role: "user" as const,
        content: "之前的内容。",
        createdAt: "2026-07-05T09:59:00.000Z",
        status: "sent" as const
      }
    ]
  };

  it("returns null for a valid stream request", () => {
    expect(validateCounselingStreamRequest(valid)).toBeNull();
  });

  it("accepts validated inline image input for a vision request", () => {
    expect(validateCounselingStreamRequest({
      ...valid,
      api: { ...valid.api, modelName: "deepseek-v4-flash-vision-exp", reasoningEffort: "high" },
      imageInputs: [{ name: "photo.png", mimeType: "image/png", dataUrl: "data:image/png;base64,aGVsbG8=" }]
    })).toBeNull();
  });

  it("rejects malformed image data and reasoning effort", () => {
    expect(validateCounselingStreamRequest({
      ...valid,
      api: { ...valid.api, reasoningEffort: "turbo" }
    })).toBe("reasoningEffort 不合法");
    expect(validateCounselingStreamRequest({
      ...valid,
      imageInputs: [{ name: "photo.png", mimeType: "image/png", dataUrl: "https://example.com/photo.png" }]
    })).toBe("imageInputs[0].dataUrl 不合法");
  });

  it("requires assistantMessageId so stream persistence can upsert one assistant message", () => {
    const request = { ...valid, assistantMessageId: undefined };

    expect(validateCounselingStreamRequest(request)).toBe("缺少 assistantMessageId");
  });

  it("requires the user message to belong to the requested session", () => {
    const request = {
      ...valid,
      message: {
        ...valid.message,
        sessionId: "another-session"
      }
    };

    expect(validateCounselingStreamRequest(request)).toBe("用户消息 sessionId 与请求 sessionId 不一致");
  });

  it("rejects assistant messages as the current stream input", () => {
    const request = {
      ...valid,
      message: {
        ...valid.message,
        role: "assistant" as const
      }
    };

    expect(validateCounselingStreamRequest(request)).toBe("缺少用户消息");
  });

  it("requires contextMessages to be an array when provided", () => {
    const request = { ...valid, contextMessages: {} };

    expect(validateCounselingStreamRequest(request)).toBe("contextMessages 必须是数组");
  });

  it("requires context messages to belong to the requested session", () => {
    const request = {
      ...valid,
      contextMessages: [
        {
          ...valid.contextMessages[0],
          sessionId: "another-session"
        }
      ]
    };

    expect(validateCounselingStreamRequest(request)).toBe("contextMessages[0].sessionId 与请求 sessionId 不一致");
  });
});

describe("validateSessionPayload", () => {
  it("returns null for a valid CounselingSession", () => {
    const valid = {
      id: "s1", title: "测试", counselorId: "chengling",
      roomThemeId: "quiet-study", modelName: "m", status: "active" as const
    };
    expect(validateSessionPayload(valid)).toBeNull();
  });

  it("returns error for missing id", () => {
    expect(validateSessionPayload({ title: "x" } as any)).toBe("session 缺少必填字段: id");
  });
});

describe("validateImportedDocumentPayload", () => {
  it("returns null for a valid imported document", () => {
    expect(
      validateImportedDocumentPayload({
        id: "doc-1",
        sessionId: "s1",
        title: "长文本资料",
        kind: "pasted-text",
        content: "完整文本",
        contentLength: 4,
        createdAt: "2026-07-05T10:00:00.000Z",
        status: "ready"
      })
    ).toBeNull();
  });

  it("returns error for invalid imported document status", () => {
    expect(
      validateImportedDocumentPayload({
        id: "doc-1",
        sessionId: "s1",
        title: "长文本资料",
        kind: "pasted-text",
        content: "完整文本",
        contentLength: 4,
        createdAt: "2026-07-05T10:00:00.000Z",
        status: "unknown"
      })
    ).toBe("document.status 不合法");
  });
});

describe("validateMemoryPayload", () => {
  it("returns null for a valid MemoryItem", () => {
    const valid = {
      id: "mem1", type: "theme" as const, title: "主题",
      content: "内容", sourceSessionId: "session-1", status: "confirmed" as const, createdAt: "2026-07-03T10:00:00.000Z",
      updatedAt: "2026-07-03T10:00:00.000Z"
    };
    expect(validateMemoryPayload(valid)).toBeNull();
  });

  it("returns error for missing id", () => {
    expect(validateMemoryPayload({ type: "theme" } as any)).toBe("memory 缺少必填字段: id");
  });
});

describe("ERROR_CODES", () => {
  it("defines expected error codes", () => {
    expect(ERROR_CODES.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
    expect(ERROR_CODES.NOT_FOUND).toBe("NOT_FOUND");
    expect(ERROR_CODES.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
    expect(ERROR_CODES.BUSY).toBe("BUSY");
  });
});
