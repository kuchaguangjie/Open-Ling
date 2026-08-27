export type SessionStatus = "active" | "ended" | "draft";
export type CounselingCompilerId = "chat-system" | "chat-split-system" | "reasoner-user-prefix" | "json-task";
export type CounselingSamplingProfile = "dialogue" | "deterministic_task" | "eval";

export interface CounselingRuntimeContract {
  capabilityId?: string;
  matched: boolean;
  reasoningEffort?: string;
  samplingProfile: CounselingSamplingProfile;
  sampling: { temperature: number; top_p: number; seed?: number } | null;
  compilerId: CounselingCompilerId;
  vendorParamsTrusted?: boolean;
  wireParams?: Record<string, unknown>;
}

interface CounselingPromptSnapshotBase {
  counselorId: string;
  teamId?: string;
  modelName: string;
  systemPrompt: string;
  createdAt: string;
}

export interface CounselingPromptSnapshotV1 extends CounselingPromptSnapshotBase {
  version: 1;
}

export interface CounselingPromptSnapshotV2 extends CounselingPromptSnapshotBase {
  version: 2;
  counselorCorePrompt: string;
  counselingTaskPrompt: string;
  teamPrompt: string;
}

export interface CounselingPromptSnapshotV3 extends CounselingPromptSnapshotBase {
  version: 3;
  // Early V3 snapshots from the shared-values rollout predate locale freezing.
  // A missing locale is therefore read as zh-CN for backward compatibility.
  locale?: "zh-CN" | "en-US";
  counselorCorePrompt: string;
  sharedCounselingValuesPrompt: string;
  counselingTaskPrompt: string;
  teamPrompt: string;
}

export interface CounselingPromptSnapshotV4 extends CounselingPromptSnapshotBase {
  version: 4;
  locale: "zh-CN" | "en-US";
  counselorPackageVersion: string;
  promptContentHash: string;
  counselorCorePrompt: string;
  sharedCounselingValuesPrompt: string;
  counselingTaskPrompt: string;
  teamPrompt: string;
}

export interface CounselingPromptSnapshotV5 extends CounselingPromptSnapshotBase {
  version: 5;
  locale: "zh-CN" | "en-US";
  counselorPackageVersion: string;
  promptContentHash: string;
  counselorCorePrompt: string;
  sharedCounselingValuesPrompt: string;
  counselingTaskPrompt: string;
  counselorVoicePrompt: string;
  teamPrompt: string;
  runtimeContract?: CounselingRuntimeContract;
}

export type CounselingPromptSnapshot =
  | CounselingPromptSnapshotV1
  | CounselingPromptSnapshotV2
  | CounselingPromptSnapshotV3
  | CounselingPromptSnapshotV4
  | CounselingPromptSnapshotV5;

export interface CounselingMemorySnapshot {
  version: 2;
  enabled: boolean;
  consultationMemo?: string;
  sourceMemoId?: string;
  createdAt: string;
}

export interface CounselingSession {
  id: string;
  title: string;
  counselorId: string;
  roomThemeId: string;
  teamId?: string;
  modelName: string;
  promptSnapshot?: CounselingPromptSnapshot;
  memorySnapshot?: CounselingMemorySnapshot;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string;
  endedAt?: string;
  summary?: string;
  status: SessionStatus;
}

export interface CreateCounselingSessionOptions {
  replaceUnfinishedSessionId?: string;
}

export type SessionMetadataChanges = Partial<Pick<CounselingSession, "title" | "summary" | "updatedAt">>;
