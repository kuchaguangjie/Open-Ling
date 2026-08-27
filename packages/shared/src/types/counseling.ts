import type { ApiSettings } from "./settings.js";
import type { SessionMessage } from "./message.js";

export interface ModelImageInput {
  dataUrl: string;
  mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  name: string;
}

export type CounselingStreamStatus = "connecting" | "thinking" | "streaming" | "done" | "error" | "cancelled";

export interface CounselingStreamRequest {
  requestId: string;
  sessionId: string;
  counselorId?: string;
  teamId?: string;
  api: ApiSettings;
  message: SessionMessage;
  assistantMessageId: string;
  contextMessages?: SessionMessage[];
  imageInputs?: ModelImageInput[];
  rollingSummary?: string;
}

export interface ActiveCounselingStream {
  requestId: string;
  sessionId: string;
}

export type CounselingStreamEvent =
  | {
      requestId: string;
      type: "status";
      status: CounselingStreamStatus;
    }
  | {
      requestId: string;
      type: "chunk";
      content: string;
    }
  | {
      requestId: string;
      type: "done";
      content: string;
    }
  | {
      requestId: string;
      type: "error";
      message: string;
      failedUserMessageId?: string;
    };
