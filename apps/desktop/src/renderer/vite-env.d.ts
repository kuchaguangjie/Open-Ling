/// <reference types="vite/client" />

import type {
  CounselingSession,
  CreateCounselingSessionOptions,
  ActiveCounselingStream,
  CounselingStreamEvent,
  CounselingStreamRequest,
  DataExportResult,
  DataExportScope,
  LocalBackupResult,
  LocalRestoreResult,
  ConsultationPreparation,
  ImportedDocument,
  MemoryItem,
  SessionLetter,
  SessionMessage,
  SessionMetadataChanges,
  UserSettings,
  IpcSuccess,
  IpcFailure,
  ModelConnectionTestResult,
  ModelListResult,
  UsageSummaryResult,
  AccessLockPasswordChangeInput,
  AccessLockRecoveryInput,
  AccessLockSetupInput,
  AccessLockStatus,
  VoiceInputRuntimeStatus,
  VoiceModelStatus,
  VoiceRecognitionAudioChunk,
  VoiceRecognitionEvent,
  VoiceRecognitionStartRequest,
  CounselorPackageManifest,
  CounselorPackageImportCommitResult,
  CounselorPackageImportPreviewResult,
  CounselorPackageRemoveResult,
  AppUpdateStatus
} from "@shared/index";

interface LingDesktopApi {
  platform: string;
  getAppInfo: () => Promise<IpcSuccess<{ name: string; version: string; mode: string }> | IpcFailure>;
  app?: {
    onNewSessionShortcut: (callback: () => void) => () => void;
    onSessionChanged?: (callback: (sessionId: string) => void) => () => void;
  };
  updates?: {
    getStatus: () => Promise<IpcSuccess<AppUpdateStatus> | IpcFailure>;
    check: () => Promise<IpcSuccess<AppUpdateStatus> | IpcFailure>;
    openDownloadPage: () => Promise<IpcSuccess<void> | IpcFailure>;
    onStatusChanged: (callback: (status: AppUpdateStatus) => void) => () => void;
  };
  counselorPackages?: {
    list: () => Promise<IpcSuccess<CounselorPackageManifest[]> | IpcFailure>;
    previewImport: () => Promise<IpcSuccess<CounselorPackageImportPreviewResult> | IpcFailure>;
    commitImport: (previewToken: string) => Promise<IpcSuccess<CounselorPackageImportCommitResult> | IpcFailure>;
    cancelImport: (previewToken: string) => Promise<IpcSuccess<void> | IpcFailure>;
    remove: (packageId: string) => Promise<IpcSuccess<CounselorPackageRemoveResult> | IpcFailure>;
  };
  settings: {
    read: () => Promise<IpcSuccess<UserSettings | null> | IpcFailure>;
    save: (settings: UserSettings) => Promise<IpcSuccess<void> | IpcFailure>;
    hasApiKey: () => Promise<IpcSuccess<boolean> | IpcFailure>;
    deleteApiKey: () => Promise<IpcSuccess<void> | IpcFailure>;
    testConnection: (api: UserSettings["api"]) => Promise<IpcSuccess<ModelConnectionTestResult> | IpcFailure>;
    listModels: (api: UserSettings["api"]) => Promise<IpcSuccess<ModelListResult> | IpcFailure>;
  };
  usage?: {
    getSummary: () => Promise<IpcSuccess<UsageSummaryResult> | IpcFailure>;
  };
  voice?: {
    getRuntimeStatus?: () => Promise<IpcSuccess<VoiceInputRuntimeStatus> | IpcFailure>;
    getModelStatus: () => Promise<IpcSuccess<VoiceModelStatus> | IpcFailure>;
    installModel: () => Promise<IpcSuccess<VoiceModelStatus> | IpcFailure>;
    onModelProgress: (callback: (status: VoiceModelStatus) => void) => () => void;
    startRecognition: (
      request: VoiceRecognitionStartRequest,
      onEvent: (event: VoiceRecognitionEvent) => void
    ) => Promise<IpcSuccess<{ sessionId: string }> | IpcFailure>;
    sendAudio: (chunk: VoiceRecognitionAudioChunk) => void;
    stopRecognition: (sessionId: string) => Promise<IpcSuccess<void> | IpcFailure>;
  };
  accessLock?: {
    initializeDevice: () => Promise<IpcSuccess<void> | IpcFailure>;
    status: () => Promise<IpcSuccess<AccessLockStatus> | IpcFailure>;
    setup: (input: AccessLockSetupInput) => Promise<IpcSuccess<void> | IpcFailure>;
    unlock: (password: string) => Promise<IpcSuccess<void> | IpcFailure>;
    recover: (input: AccessLockRecoveryInput) => Promise<IpcSuccess<void> | IpcFailure>;
    changePassword: (input: AccessLockPasswordChangeInput) => Promise<IpcSuccess<void> | IpcFailure>;
    setGraceMinutes: (minutes: number) => Promise<IpcSuccess<void> | IpcFailure>;
    disable: (password: string) => Promise<IpcSuccess<void> | IpcFailure>;
    lockNow: () => Promise<IpcSuccess<void> | IpcFailure>;
  };
  dataExports?: {
    export: (scope: DataExportScope) => Promise<IpcSuccess<DataExportResult> | IpcFailure>;
  };
  localBackups?: {
    create: () => Promise<IpcSuccess<LocalBackupResult> | IpcFailure>;
    restore: (recoveryPhrase?: string) => Promise<IpcSuccess<LocalRestoreResult> | IpcFailure>;
  };
  sessions: {
    list: () => Promise<IpcSuccess<CounselingSession[]> | IpcFailure>;
    get: (id: string) => Promise<IpcSuccess<CounselingSession | null> | IpcFailure>;
    create: (session: CounselingSession, options?: CreateCounselingSessionOptions) => Promise<IpcSuccess<void> | IpcFailure>;
    update: (id: string, changes: SessionMetadataChanges) => Promise<IpcSuccess<void> | IpcFailure>;
    delete: (id: string) => Promise<IpcSuccess<void> | IpcFailure>;
    activateDraft?: (id: string) => Promise<IpcSuccess<void> | IpcFailure>;
    cancelDraft?: (id: string) => Promise<IpcSuccess<void> | IpcFailure>;
    end?: (id: string) => Promise<IpcSuccess<void> | IpcFailure>;
    resume?: (id: string) => Promise<IpcSuccess<void> | IpcFailure>;
  };
  consultationPreparations?: {
    getBySessionId: (sessionId: string) => Promise<IpcSuccess<ConsultationPreparation | null> | IpcFailure>;
    getLatestByCounselorId: (counselorId: string) => Promise<IpcSuccess<ConsultationPreparation | null> | IpcFailure>;
    retry: (sessionId: string) => Promise<IpcSuccess<ConsultationPreparation> | IpcFailure>;
  };
  sessionLetters?: {
    list: () => Promise<IpcSuccess<SessionLetter[]> | IpcFailure>;
    getBySessionId: (sessionId: string) => Promise<IpcSuccess<SessionLetter | null> | IpcFailure>;
    regenerate: (sessionId: string) => Promise<IpcSuccess<SessionLetter | null> | IpcFailure>;
    markRead?: (sessionId: string) => Promise<IpcSuccess<SessionLetter | null> | IpcFailure>;
  };
  messages: {
    listBySessionId: (sessionId: string) => Promise<IpcSuccess<SessionMessage[]> | IpcFailure>;
    append: (message: SessionMessage) => Promise<IpcSuccess<void> | IpcFailure>;
    appendMany?: (messages: SessionMessage[]) => Promise<IpcSuccess<void> | IpcFailure>;
  };
  documents: {
    create: (document: ImportedDocument) => Promise<IpcSuccess<void> | IpcFailure>;
    get: (id: string) => Promise<IpcSuccess<ImportedDocument | null> | IpcFailure>;
    listBySessionId: (sessionId: string) => Promise<IpcSuccess<ImportedDocument[]> | IpcFailure>;
  };
  memories: {
    list: () => Promise<IpcSuccess<MemoryItem[]> | IpcFailure>;
    create: (memory: MemoryItem) => Promise<IpcSuccess<void> | IpcFailure>;
    update: (id: string, changes: Partial<Omit<MemoryItem, "id" | "createdAt">>) => Promise<IpcSuccess<void> | IpcFailure>;
    delete: (id: string) => Promise<IpcSuccess<void> | IpcFailure>;
  };
  counseling: {
    streamMessage: (
      request: CounselingStreamRequest,
      handlers: { onEvent: (event: CounselingStreamEvent) => void }
    ) => Promise<IpcSuccess<{ requestId: string }> | IpcFailure>;
    cancel: (requestId: string) => Promise<IpcSuccess<void> | IpcFailure>;
    getActiveStream?: (sessionId: string) => Promise<IpcSuccess<ActiveCounselingStream | null> | IpcFailure>;
  };
}

declare global {
  interface Window {
    lingDesktop: LingDesktopApi;
  }
}

export {};
