import type { CounselingSession, SessionMessage } from "@shared/index";

const roleLabel: Record<string, string> = {
  user: "用户",
  assistant: "咨询师",
  system: "系统"
};

/**
 * Export a session and its messages as a readable Markdown string.
 * The export includes session metadata and role-labeled messages.
 */
export function exportSessionMarkdown(session: CounselingSession, messages: SessionMessage[]): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${session.title}`);
  lines.push("");

  // Metadata block
  lines.push("| 字段 | 值 |");
  lines.push("|------|----|");
  lines.push(`| 咨询师 | ${session.counselorId} |`);
  lines.push(`| 咨询室主题 | ${session.roomThemeId} |`);
  lines.push(`| 模型 | ${session.modelName} |`);
  lines.push(`| 状态 | ${session.status} |`);
  if (session.createdAt) {
    lines.push(`| 创建时间 | ${session.createdAt} |`);
  }
  if (session.endedAt) {
    lines.push(`| 结束时间 | ${session.endedAt} |`);
  }
  if (session.summary) {
    lines.push("");
    lines.push("## 会谈总结");
    lines.push("");
    lines.push(session.summary);
  }

  // Messages
  lines.push("");
  lines.push("## 会谈内容");
  lines.push("");

  for (const message of messages) {
    const label = roleLabel[message.role] ?? message.role;
    lines.push(`### ${label}`);
    lines.push("");
    lines.push(message.content);
    lines.push("");
    if (message.createdAt) {
      lines.push(`> ${message.createdAt}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
