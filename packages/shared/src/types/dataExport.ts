export type DataExportScope = "all" | "sessions" | "letters";

export interface DataExportResult {
  status: "saved" | "cancelled";
  fileName?: string;
  sessionCount: number;
  letterCount: number;
}
