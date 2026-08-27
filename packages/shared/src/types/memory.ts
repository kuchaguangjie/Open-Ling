export type MemoryType = "profile" | "theme" | "event" | "preference";
export type MemoryStatus = "pending" | "confirmed" | "hidden";

export interface MemoryItem {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  sourceSessionId?: string;
  status: MemoryStatus;
  createdAt: string;
  updatedAt: string;
}
