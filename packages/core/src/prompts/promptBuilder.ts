export interface PromptBuildInput {
  counselorPrompt: string;
  sessionContext: string;
  safetyBoundary: string;
}

export function buildCounselingPrompt(input: PromptBuildInput) {
  return [input.safetyBoundary, input.counselorPrompt, input.sessionContext].filter(Boolean).join("\n\n");
}
