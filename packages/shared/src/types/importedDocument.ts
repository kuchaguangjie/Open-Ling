export type ImportedDocumentKind = "pasted-text";
export type ImportedDocumentStatus = "ready" | "processing" | "failed";

export interface ImportedDocument {
  id: string;
  sessionId: string;
  title: string;
  kind: ImportedDocumentKind;
  content: string;
  contentLength: number;
  createdAt: string;
  status: ImportedDocumentStatus;
  summary?: string;
}

export interface ImportedDocumentReference {
  id: string;
  title: string;
  contentLength: number;
  fullText?: string;
}
