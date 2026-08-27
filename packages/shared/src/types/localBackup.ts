export interface LocalBackupResult {
  status: "saved" | "cancelled";
  fileName?: string;
}

export interface LocalRestoreResult {
  status: "restored" | "cancelled";
  fileName?: string;
}
