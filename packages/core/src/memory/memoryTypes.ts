export type MemoryCandidateStatus = "suggested" | "accepted" | "rejected";

export interface MemoryCandidate {
  id: string;
  type: "profile" | "theme" | "event" | "preference";
  content: string;
  status: MemoryCandidateStatus;
}
