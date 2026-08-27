export type AppUpdateState =
  | "disabled"
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "error";

export interface AppUpdateStatus {
  state: AppUpdateState;
  currentVersion: string;
  availableVersion?: string;
  checkedAt?: string;
  message?: string;
}
