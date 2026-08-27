import type { CounselingSession, SessionMessage } from "@shared/index";

export interface PrototypeSession {
  id: string;
  title: string;
  time: string;
  preview: string;
  counselorId: string;
  roomThemeId: string;
  teamId?: string;
  modelName: string;
  promptSnapshot?: CounselingSession["promptSnapshot"];
  createdAt?: string;
  startedAt?: string;
  updatedAt?: string;
  endedAt?: string;
  status: CounselingSession["status"];
  messages: SessionMessage[];
  messagesLoaded?: boolean;
}

export interface MessageAttachmentReference {
  id: string;
  title: string;
  contentLength: number;
  kind: "text" | "image" | "document";
  status: "context-ready" | "record-only";
}
