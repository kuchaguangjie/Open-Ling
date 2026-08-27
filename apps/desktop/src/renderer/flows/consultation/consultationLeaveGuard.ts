import { useConsultationDraftStore } from "./consultationDraftStore";

export function hasPendingConsultationInput(sessionId?: string) {
  const { attachmentsBySessionId, draftsBySessionId } = useConsultationDraftStore.getState();
  if (sessionId) {
    return Boolean(draftsBySessionId[sessionId]?.trim() || attachmentsBySessionId[sessionId]?.length);
  }
  const sessionIds = new Set([
    ...Object.keys(draftsBySessionId),
    ...Object.keys(attachmentsBySessionId)
  ]);
  return [...sessionIds].some(
    (id) => Boolean(draftsBySessionId[id]?.trim() || attachmentsBySessionId[id]?.length)
  );
}
