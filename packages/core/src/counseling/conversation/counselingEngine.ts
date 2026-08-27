import type { SessionMessage } from "@shared/index";

export interface CounselingTurnInput {
  sessionId: string;
  messages: SessionMessage[];
}

export interface CounselingTurnOutput {
  assistantMessage: SessionMessage;
}

export function createCounselingEnginePlaceholder() {
  return {
    description: "会谈引擎占位：后续负责组织 Prompt、Provider 调用和会谈流。"
  };
}
