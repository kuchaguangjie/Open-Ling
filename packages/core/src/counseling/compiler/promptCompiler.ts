import type { CounselingPromptSnapshot, SessionMessage } from "../../../../shared/src/index.js";

const REASONER_PREFIX = `以下是本回合必须遵守的咨询场景与价值观。它们优先于你的默认助手风格。只输出给来访者看的回复。`;

export function compilerIdOf(snapshot?: CounselingPromptSnapshot) {
  if (snapshot && snapshot.version === 5 && snapshot.runtimeContract?.compilerId) {
    return snapshot.runtimeContract.compilerId;
  }
  return "chat-system" as const;
}

export function applyReasonerUserPrefix(messages: SessionMessage[], snapshot?: CounselingPromptSnapshot): SessionMessage[] {
  if (compilerIdOf(snapshot) !== "reasoner-user-prefix") return messages;
  if (!snapshot || snapshot.version < 2) return messages;
  const scene = "counselingTaskPrompt" in snapshot ? snapshot.counselingTaskPrompt : "";
  const values = "sharedCounselingValuesPrompt" in snapshot ? snapshot.sharedCounselingValuesPrompt : "";
  const prefix = [REASONER_PREFIX, values, scene].filter(Boolean).join("\n\n");
  const lastUser = [...messages].reverse().findIndex((message) => message.role === "user");
  if (lastUser < 0) return messages;
  const index = messages.length - 1 - lastUser;
  return messages.map((message, current) => current === index
    ? { ...message, content: `${prefix}\n\n---\n\n${message.content}` }
    : message
  );
}

export function identityOnlySystemPrompt(snapshot?: CounselingPromptSnapshot, fallback = "") {
  if (snapshot && "counselorCorePrompt" in snapshot && snapshot.counselorCorePrompt.trim()) {
    return snapshot.counselorCorePrompt;
  }
  return fallback;
}

export function splitChatSystemParts(snapshot?: CounselingPromptSnapshot) {
  if (!snapshot || snapshot.version < 2) return null;
  if (!("counselorCorePrompt" in snapshot)) return null;
  return {
    core: snapshot.counselorCorePrompt,
    values: "sharedCounselingValuesPrompt" in snapshot ? snapshot.sharedCounselingValuesPrompt : "",
    scene: "counselingTaskPrompt" in snapshot ? snapshot.counselingTaskPrompt : "",
    team: "teamPrompt" in snapshot ? snapshot.teamPrompt : ""
  };
}