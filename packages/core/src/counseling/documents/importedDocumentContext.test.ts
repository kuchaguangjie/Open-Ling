// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { ImportedDocument, SessionMessage } from "@shared/index";
import type { LlmProvider, LlmProviderRequest } from "../../providers/llmProvider";
import {
  LONG_INPUT_AUTO_IMPORT_THRESHOLD_CHARS,
  LONG_INPUT_FULL_TEXT_CONTEXT_LIMIT_CHARS,
  buildImportedDocumentUserMessageContent,
  createImportedDocumentFromText,
  createImportedDocumentSummary,
  expandImportedDocumentMessages
} from "./importedDocumentContext";

describe("imported document context", () => {
  it("creates an imported document from long pasted text", () => {
    const document = createImportedDocumentFromText({
      id: "doc-1",
      sessionId: "s1",
      content: "x".repeat(LONG_INPUT_AUTO_IMPORT_THRESHOLD_CHARS + 1),
      createdAt: "2026-07-05T10:00:00.000Z"
    });

    expect(document).toMatchObject({
      id: "doc-1",
      sessionId: "s1",
      title: "长文本资料",
      kind: "pasted-text",
      contentLength: LONG_INPUT_AUTO_IMPORT_THRESHOLD_CHARS + 1,
      status: "ready"
    });
  });

  it("builds a concise user-facing message for imported long text", () => {
    expect(buildImportedDocumentUserMessageContent({ title: "长文本资料", contentLength: 21000 })).toBe(
      "我发送了一份资料：长文本资料（约 21000 字）。请结合这份资料继续和我讨论。"
    );
  });

  it("expands imported document references into model-facing message content", async () => {
    const message: SessionMessage = {
      id: "m1",
      sessionId: "s1",
      role: "user",
      content: "我发送了一份资料：长文本资料（约 21001 字）。请结合这份资料继续和我讨论。",
      createdAt: "2026-07-05T10:00:00.000Z",
      status: "sent",
      metadata: {
        importedDocuments: [
          {
            id: "doc-1",
            title: "长文本资料",
            contentLength: 21001
          }
        ]
      }
    };
    const document: ImportedDocument = {
      id: "doc-1",
      sessionId: "s1",
      title: "长文本资料",
      kind: "pasted-text",
      content: "完整资料正文",
      contentLength: 6,
      createdAt: "2026-07-05T10:00:00.000Z",
      status: "ready"
    };

    const expanded = await expandImportedDocumentMessages([message], async (id) => (id === "doc-1" ? document : null));

    expect(expanded[0].content).toContain("资料附件全文");
    expect(expanded[0].content).toContain("完整资料正文");
    expect(expanded[0].metadata).toEqual(message.metadata);
  });

  it("uses saved document summary instead of full text when imported document exceeds the context limit", async () => {
    const message: SessionMessage = {
      id: "m1",
      sessionId: "s1",
      role: "user",
      content: "请结合这份很长的资料。",
      createdAt: "2026-07-05T10:00:00.000Z",
      status: "sent",
      metadata: {
        importedDocuments: [
          {
            id: "doc-1",
            title: "长资料.txt",
            contentLength: LONG_INPUT_FULL_TEXT_CONTEXT_LIMIT_CHARS + 1
          }
        ]
      }
    };
    const document: ImportedDocument = {
      id: "doc-1",
      sessionId: "s1",
      title: "长资料.txt",
      kind: "pasted-text",
      content: "x".repeat(LONG_INPUT_FULL_TEXT_CONTEXT_LIMIT_CHARS + 1),
      contentLength: LONG_INPUT_FULL_TEXT_CONTEXT_LIMIT_CHARS + 1,
      createdAt: "2026-07-05T10:00:00.000Z",
      status: "ready",
      summary: "这是一份很长资料的事实性摘要。"
    };

    const expanded = await expandImportedDocumentMessages([message], async () => document);

    expect(expanded[0].content).toContain("资料附件摘要");
    expect(expanded[0].content).toContain("不是完整原文");
    expect(expanded[0].content).toContain("这是一份很长资料的事实性摘要。");
    expect(expanded[0].content).not.toContain("x".repeat(1000));
  });

  it("creates a factual imported document summary through the provider", async () => {
    const document = createImportedDocumentFromText({
      id: "doc-1",
      sessionId: "s1",
      title: "很长的资料.txt",
      content: "资料正文".repeat(10),
      createdAt: "2026-07-05T10:00:00.000Z"
    });
    const provider = {
      complete: async () => ({ content: "\n- 用户记录了一段过往经历。\n" }),
      stream: async function* () {}
    } as LlmProvider;

    const summary = await createImportedDocumentSummary({ document, provider });

    expect(summary).toBe("- 用户记录了一段过往经历。");
  });

  it("uses English labels and model instructions for an English session", async () => {
    const document = createImportedDocumentFromText({
      id: "doc-en",
      sessionId: "s-en",
      content: "A long account of a difficult week.",
      createdAt: "2026-07-05T10:00:00.000Z",
      locale: "en-US"
    });
    const complete = vi.fn(async (_request: LlmProviderRequest) => ({ content: "- The user described a difficult week." }));
    const provider = {
      complete,
      stream: async function* () {}
    } as LlmProvider;

    expect(document.title).toBe("Long text");
    expect(buildImportedDocumentUserMessageContent({
      title: document.title,
      contentLength: document.contentLength,
      locale: "en-US"
    })).toContain("I sent a document");

    await createImportedDocumentSummary({ document, provider, locale: "en-US" });
    const request = complete.mock.calls[0]![0];
    expect(request.messages[0].content).toContain("factual summary");
    expect(request.messages[0].content).not.toMatch(/[\u3400-\u9fff]/u);
  });

  it("forwards cancellation to long-document summary generation", async () => {
    const document = createImportedDocumentFromText({
      id: "doc-abort",
      sessionId: "s1",
      title: "长资料.txt",
      content: "资料正文".repeat(10),
      createdAt: "2026-07-05T10:00:00.000Z"
    });
    const controller = new AbortController();
    const provider: LlmProvider = {
      complete: vi.fn(async (request) => {
        expect(request.signal).toBe(controller.signal);
        return await new Promise<never>((_, reject) => {
          request.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          }, { once: true });
        });
      }),
      stream: async function* () {}
    };
    const pending = createImportedDocumentSummary({ document, provider, signal: controller.signal });

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
