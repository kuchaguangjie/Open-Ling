import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertContextPlanAuditIsSanitized,
  buildContextPlanAudit,
  buildCounselingContextPlan
} from "./packages/core/src/counseling/conversation/contextBudgetPlanner";
import { buildCounselingMessages } from "./packages/core/src/counseling/conversation/contextBuilder";
import { expandImportedDocumentMessages } from "./packages/core/src/counseling/documents/importedDocumentContext";
import { buildCounselingSystemPrompt } from "./packages/core/src/counseling/conversation/promptSnapshot";
import { getPolicyPrompt } from "./packages/core/src/prompts/counselorPromptRegistry";
import { createOpenAICompatibleProvider } from "./packages/core/src/providers/openAICompatibleProvider";
import type { ContextPlanAudit } from "./packages/core/src/counseling/conversation/contextBudgetPlanner";
import type { CounselingStreamEvent, CounselingStreamRequest } from "./packages/shared/src/index";

export default defineConfig({
  // Electron loads the packaged renderer through file://, so production assets
  // must resolve relative to dist/index.html instead of the filesystem root.
  base: "./",
  plugins: [react(), lingDevCounselingProxy(), lingProductionCsp()],
  resolve: {
    alias: {
      "@renderer": "/apps/desktop/src/renderer",
      "@shared": "/packages/shared/src",
      "@core": "/packages/core/src"
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});

function lingProductionCsp() {
  return {
    name: "ling-production-csp",
    apply: "build" as const,
    transformIndexHtml(html: string) {
      const contentSecurityPolicy = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: ling-counselor-resource:",
        "font-src 'self' data:",
        "connect-src 'self' https: wss: http://127.0.0.1:* http://localhost:*",
        "media-src 'self' data: blob:",
        "worker-src 'self' blob:",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'"
      ].join("; ");
      return {
        html,
        tags: [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content: contentSecurityPolicy
            },
            injectTo: "head-prepend" as const
          }
        ]
      };
    }
  };
}

function lingDevCounselingProxy() {
  return {
    name: "ling-dev-counseling-proxy",
    configureServer(server) {
      server.middlewares.use("/__ling_dev/counseling/stream", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }

        const body = await readJsonBody(req);
        const request = body as CounselingStreamRequest;
        const apiKey = readDevDeepSeekApiKey();
        if (!apiKey) {
          res.statusCode = 500;
          res.end("Missing local DeepSeek test key");
          return;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");

        const emit = (event: CounselingStreamEvent) => {
          res.write(`${JSON.stringify(event)}\n`);
        };

        try {
          const provider = createOpenAICompatibleProvider({
            apiBaseUrl: request.api.apiBaseUrl || "https://api.deepseek.com",
            apiKey,
            modelName: request.api.modelName || "deepseek-v4-flash-vision-exp",
            reasoningEffort: request.api.reasoningEffort
          });
          const contextMessages = await expandImportedDocumentMessages(
            [...(request.contextMessages ?? []), request.message],
            async () => null
          );
          const systemPrompt = buildCounselingSystemPrompt({
            counselorId: request.counselorId ?? "chengling",
            teamId: request.teamId ?? "one-way-mirror"
          });
          const contextPlan = buildCounselingContextPlan({
            messages: contextMessages,
            rollingSummary: request.rollingSummary,
            systemPrompt: [systemPrompt, getPolicyPrompt("realtime-safety")].join("\n\n")
          });
          void writeContextPlanAudit(
            buildContextPlanAudit({
              requestId: request.requestId,
              sessionId: request.sessionId,
              source: "web-dev",
              modelName: request.api.modelName || "deepseek-v4-flash-vision-exp",
              plan: contextPlan
            })
          ).catch(() => {
            // Dev audits are best-effort local diagnostics.
          });
          const messages = buildCounselingMessages({
            counselorId: request.counselorId ?? "chengling",
            teamId: request.teamId ?? "one-way-mirror",
            messages: contextMessages,
            rollingSummary: request.rollingSummary,
            sessionSummary: request.sessionSummary,
            longTermMemory: request.longTermMemory
          });

          let content = "";
          for await (const event of provider.stream({ messages, imageInputs: request.imageInputs })) {
            if (event.type === "status") {
              emit({ requestId: request.requestId, type: "status", status: event.status });
              continue;
            }
            if (event.type === "usage") continue;
            content += event.content;
            emit({ requestId: request.requestId, type: "chunk", content: event.content });
          }
          emit({ requestId: request.requestId, type: "done", content });
        } catch {
          emit({ requestId: request.requestId, type: "error", message: "网页测试模型连接失败，请检查本地测试 key。" });
        } finally {
          res.end();
        }
      });
    }
  };
}

async function writeContextPlanAudit(audit: ContextPlanAudit) {
  assertContextPlanAuditIsSanitized(audit);
  const dir = resolve(process.cwd(), "tmp/context-audits");
  await mkdir(dir, { recursive: true });
  const fileName = `${safeFilePart(audit.createdAt)}-${safeFilePart(audit.source)}-${safeFilePart(audit.requestId)}.json`;
  await writeFile(resolve(dir, fileName), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
}

function safeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}

function readDevDeepSeekApiKey() {
  return process.env.DEEPSEEK_API_KEY?.trim() ?? "";
}

function readJsonBody(req: import("node:http").IncomingMessage) {
  return new Promise<unknown>((resolveBody, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolveBody(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
