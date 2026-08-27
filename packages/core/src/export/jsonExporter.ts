import type { CounselingSession, SessionMessage } from "@shared/index";

export interface ExportPayload {
  session: CounselingSession;
  messages: SessionMessage[];
}

/**
 * Export a session and its messages as a stable JSON string.
 */
export function exportJson(payload: ExportPayload): string {
  return JSON.stringify(payload, null, 2);
}
