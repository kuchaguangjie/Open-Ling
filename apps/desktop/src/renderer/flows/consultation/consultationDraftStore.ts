import { create } from "zustand";

export interface PendingConsultationAttachment {
  id: string;
  name: string;
  size: number;
  extension: string;
  file: File;
}

interface ConsultationDraftState {
  draftsBySessionId: Record<string, string>;
  attachmentsBySessionId: Record<string, PendingConsultationAttachment[]>;
  setDraft: (sessionId: string, value: string) => void;
  addAttachments: (sessionId: string, attachments: PendingConsultationAttachment[]) => void;
  removeAttachment: (sessionId: string, attachmentId: string) => void;
  clearAfterSend: (sessionId: string) => void;
  clearSession: (sessionId: string) => void;
}

export const useConsultationDraftStore = create<ConsultationDraftState>((set) => ({
  draftsBySessionId: {},
  attachmentsBySessionId: {},
  setDraft: (sessionId, value) =>
    set((state) => ({ draftsBySessionId: { ...state.draftsBySessionId, [sessionId]: value } })),
  addAttachments: (sessionId, attachments) =>
    set((state) => ({
      attachmentsBySessionId: {
        ...state.attachmentsBySessionId,
        [sessionId]: [...(state.attachmentsBySessionId[sessionId] ?? []), ...attachments]
      }
    })),
  removeAttachment: (sessionId, attachmentId) =>
    set((state) => ({
      attachmentsBySessionId: {
        ...state.attachmentsBySessionId,
        [sessionId]: (state.attachmentsBySessionId[sessionId] ?? []).filter((attachment) => attachment.id !== attachmentId)
      }
    })),
  clearAfterSend: (sessionId) =>
    set((state) => ({
      draftsBySessionId: { ...state.draftsBySessionId, [sessionId]: "" },
      attachmentsBySessionId: { ...state.attachmentsBySessionId, [sessionId]: [] }
    })),
  clearSession: (sessionId) =>
    set((state) => {
      const draftsBySessionId = { ...state.draftsBySessionId };
      const attachmentsBySessionId = { ...state.attachmentsBySessionId };
      delete draftsBySessionId[sessionId];
      delete attachmentsBySessionId[sessionId];
      return { draftsBySessionId, attachmentsBySessionId };
    })
}));

export function resetConsultationDraftStore() {
  useConsultationDraftStore.setState({ draftsBySessionId: {}, attachmentsBySessionId: {} });
}
