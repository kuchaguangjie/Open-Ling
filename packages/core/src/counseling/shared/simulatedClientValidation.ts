import type { SessionMessage } from "@shared/index";

export interface SimulatedClientConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface BuildSimulatedClientMessagesInput {
  clientPrompt: string;
  conversation: SimulatedClientConversationTurn[];
}

export interface RealClientValidationArtifact {
  title: string;
  content: string;
}

export interface RealClientValidationSession {
  title: string;
  messages: SimulatedClientConversationTurn[];
  artifacts: RealClientValidationArtifact[];
}

export interface CapturedRealClientValidationRequest {
  stage: string;
  maxTokens?: number;
  messages: Array<Pick<SessionMessage, "role" | "content">>;
}

export interface BuildRealClientValidationReportInput {
  clientFileName: string;
  clientPrompt: string;
  modelName: string;
  apiBaseUrl: string;
  sessions: RealClientValidationSession[];
  modelRequests: CapturedRealClientValidationRequest[];
  checks: string[];
}

export interface AssertSimulatedClientPromptIsolationInput {
  clientPrompt: string;
  downstreamRequests: Array<Pick<CapturedRealClientValidationRequest, "stage" | "messages">>;
}

export function buildSimulatedClientMessages(input: BuildSimulatedClientMessagesInput): SessionMessage[] {
  const createdAt = new Date(0).toISOString();
  return [
    {
      id: "system-simulated-client",
      sessionId: "simulated-client-validation",
      role: "system",
      content: input.clientPrompt.trim(),
      createdAt,
      status: "sent"
    },
    {
      id: "user-simulated-client-conversation",
      sessionId: "simulated-client-validation",
      role: "user",
      content: [
        "以下是你与咨询师刚刚发生的文字会谈。请只以当前来访者身份，自然写出你的下一条消息。",
        "不要解释角色设定、不要使用括号舞台说明、不要评价咨询师或会谈质量。",
        "",
        formatConversation(input.conversation) || "咨询刚刚开始。"
      ].join("\n"),
      createdAt,
      status: "sent"
    }
  ];
}

export function buildRealClientValidationReport(input: BuildRealClientValidationReportInput): string {
  const sections = [
    "# 模拟来访者真实会谈验收包",
    "",
    "## 模型配置（不含凭据）",
    `- 模型：${input.modelName}`,
    `- 服务地址：${input.apiBaseUrl}`,
    "",
    "## 模拟来访者提示词",
    `- 来源：${input.clientFileName}`,
    "",
    input.clientPrompt.trim()
  ];

  input.sessions.forEach((session, index) => {
    sections.push("", `## 会谈 ${index + 1}｜${session.title}`, "", "### 完整对话", "", formatConversation(session.messages));
    session.artifacts.forEach((artifact) => {
      sections.push("", `### ${artifact.title}`, "", artifact.content.trim());
    });
  });

  sections.push("", "## 实际模型请求");
  input.modelRequests.forEach((request, index) => {
    sections.push(
      "",
      `### ${index + 1}. ${request.stage}${request.maxTokens ? `（maxTokens: ${request.maxTokens}）` : ""}`,
      "",
      formatRequestMessages(request.messages)
    );
  });

  sections.push("", "## 自动检查", ...input.checks.map((check) => `- ${check.trim()}`));
  return `${sections.join("\n").trim()}\n`;
}

export function assertSimulatedClientPromptIsIsolated(input: AssertSimulatedClientPromptIsolationInput): void {
  const clientPrompt = input.clientPrompt.trim();
  if (!clientPrompt) throw new Error("simulated client prompt is empty");
  for (const request of input.downstreamRequests) {
    if (request.messages.some((message) => message.content.includes(clientPrompt))) {
      throw new Error(`simulated client prompt leaked into ${request.stage}`);
    }
  }
}

function formatConversation(messages: SimulatedClientConversationTurn[]): string {
  return messages
    .map((message) => `${message.role}: ${message.content.trim()}`)
    .filter((message) => message.trim().length > 0)
    .join("\n\n");
}

function formatRequestMessages(messages: Array<Pick<SessionMessage, "role" | "content">>): string {
  return messages
    .map((message) => `#### ${message.role}\n\n${message.content.trim()}`)
    .join("\n\n");
}
