import { contextBridge, ipcRenderer } from "electron";
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
} from "../../../../packages/shared/src/index.js";

const IPC_CHANNELS = {
  APP_INFO: "ling:app-info",
  APP_NEW_SESSION: "ling:app:new-session",
  APP_SESSION_CHANGED: "ling:app:session-changed",
  APP_UPDATE_STATUS: "ling:app:update-status",
  APP_UPDATE_CHECK: "ling:app:update-check",
  APP_UPDATE_OPEN_DOWNLOAD: "ling:app:update-open-download",
  APP_UPDATE_STATUS_CHANGED: "ling:app:update-status-changed",
  COUNSELOR_PACKAGES_LIST: "ling:counselor-packages:list",
  COUNSELOR_PACKAGES_IMPORT_PREVIEW: "ling:counselor-packages:import-preview",
  COUNSELOR_PACKAGES_IMPORT_COMMIT: "ling:counselor-packages:import-commit",
  COUNSELOR_PACKAGES_IMPORT_CANCEL: "ling:counselor-packages:import-cancel",
  COUNSELOR_PACKAGES_REMOVE: "ling:counselor-packages:remove",
  SETTINGS_READ: "ling:settings:read",
  SETTINGS_SAVE: "ling:settings:save",
  SETTINGS_TEST_CONNECTION: "ling:settings:test-connection",
  SETTINGS_LIST_MODELS: "ling:settings:list-models",
  USAGE_GET: "ling:usage:get",
  VOICE_MODEL_STATUS: "ling:voice:model-status",
  VOICE_MODEL_INSTALL: "ling:voice:model-install",
  VOICE_MODEL_PROGRESS: "ling:voice:model-progress",
  VOICE_RUNTIME_STATUS: "ling:voice:runtime-status",
  VOICE_RECOGNITION_START: "ling:voice:recognition-start",
  VOICE_RECOGNITION_AUDIO: "ling:voice:recognition-audio",
  VOICE_RECOGNITION_STOP: "ling:voice:recognition-stop",
  VOICE_RECOGNITION_EVENT: "ling:voice:recognition-event",
  SETTINGS_API_KEY_HAS: "ling:settings:api-key:has",
  SETTINGS_API_KEY_DELETE: "ling:settings:api-key:delete",
  ACCESS_LOCK_STATUS: "ling:access-lock:status",
  ACCESS_LOCK_INITIALIZE_DEVICE: "ling:access-lock:initialize-device",
  ACCESS_LOCK_SETUP: "ling:access-lock:setup",
  ACCESS_LOCK_UNLOCK: "ling:access-lock:unlock",
  ACCESS_LOCK_RECOVER: "ling:access-lock:recover",
  ACCESS_LOCK_CHANGE_PASSWORD: "ling:access-lock:change-password",
  ACCESS_LOCK_GRACE_SET: "ling:access-lock:grace-set",
  ACCESS_LOCK_DISABLE: "ling:access-lock:disable",
  ACCESS_LOCK_NOW: "ling:access-lock:lock-now",
  DATA_EXPORT: "ling:data:export",
  DATA_BACKUP_CREATE: "ling:data:backup-create",
  DATA_BACKUP_RESTORE: "ling:data:backup-restore",
  SESSIONS_LIST: "ling:sessions:list",
  SESSIONS_GET: "ling:sessions:get",
  SESSIONS_CREATE: "ling:sessions:create",
  SESSIONS_UPDATE: "ling:sessions:update",
  SESSIONS_DELETE: "ling:sessions:delete",
  SESSIONS_ACTIVATE_DRAFT: "ling:sessions:activate-draft",
  SESSIONS_CANCEL_DRAFT: "ling:sessions:cancel-draft",
  SESSIONS_END: "ling:sessions:end",
  SESSIONS_RESUME: "ling:sessions:resume",
  CONSULTATION_PREPARATION_GET_BY_SESSION: "ling:consultation-preparation:get-by-session",
  CONSULTATION_PREPARATION_GET_LATEST_BY_COUNSELOR: "ling:consultation-preparation:get-latest-by-counselor",
  CONSULTATION_PREPARATION_RETRY: "ling:consultation-preparation:retry",
  SESSION_LETTERS_LIST: "ling:session-letters:list",
  SESSION_LETTERS_GET_BY_SESSION: "ling:session-letters:get-by-session",
  SESSION_LETTERS_REGENERATE: "ling:session-letters:regenerate",
  MESSAGES_LIST: "ling:messages:list",
  MESSAGES_APPEND: "ling:messages:append",
  MESSAGES_APPEND_MANY: "ling:messages:append-many",
  DOCUMENTS_CREATE: "ling:documents:create",
  DOCUMENTS_GET: "ling:documents:get",
  DOCUMENTS_LIST_BY_SESSION: "ling:documents:list-by-session",
  MEMORIES_LIST: "ling:memories:list",
  MEMORIES_CREATE: "ling:memories:create",
  MEMORIES_UPDATE: "ling:memories:update",
  MEMORIES_DELETE: "ling:memories:delete",
  COUNSELING_STREAM_START: "ling:counseling:stream-start",
  COUNSELING_STREAM_CANCEL: "ling:counseling:stream-cancel",
  COUNSELING_STREAM_GET_ACTIVE: "ling:counseling:stream-get-active",
  COUNSELING_STREAM_EVENT: "ling:counseling:stream-event"
} as const;

contextBridge.exposeInMainWorld("lingDesktop", {
  platform: process.platform,
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_INFO) as Promise<IpcSuccess<{ name: string; version: string; mode: string }> | IpcFailure>,
  app: {
    onNewSessionShortcut: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on(IPC_CHANNELS.APP_NEW_SESSION, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.APP_NEW_SESSION, listener);
    },
    onSessionChanged: (callback: (sessionId: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, sessionId: string) => callback(sessionId);
      ipcRenderer.on(IPC_CHANNELS.APP_SESSION_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.APP_SESSION_CHANGED, listener);
    }
  },
  updates: {
    getStatus: () => ipcRenderer.invoke(IPC_CHANNELS.APP_UPDATE_STATUS) as Promise<IpcSuccess<AppUpdateStatus> | IpcFailure>,
    check: () => ipcRenderer.invoke(IPC_CHANNELS.APP_UPDATE_CHECK) as Promise<IpcSuccess<AppUpdateStatus> | IpcFailure>,
    openDownloadPage: () => ipcRenderer.invoke(IPC_CHANNELS.APP_UPDATE_OPEN_DOWNLOAD) as Promise<IpcSuccess<void> | IpcFailure>,
    onStatusChanged: (callback: (status: AppUpdateStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: AppUpdateStatus) => callback(status);
      ipcRenderer.on(IPC_CHANNELS.APP_UPDATE_STATUS_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.APP_UPDATE_STATUS_CHANGED, listener);
    }
  },
  counselorPackages: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.COUNSELOR_PACKAGES_LIST) as Promise<
      IpcSuccess<CounselorPackageManifest[]> | IpcFailure
    >,
    previewImport: () => ipcRenderer.invoke(IPC_CHANNELS.COUNSELOR_PACKAGES_IMPORT_PREVIEW) as Promise<
      IpcSuccess<CounselorPackageImportPreviewResult> | IpcFailure
    >,
    commitImport: (previewToken: string) => ipcRenderer.invoke(IPC_CHANNELS.COUNSELOR_PACKAGES_IMPORT_COMMIT, previewToken) as Promise<
      IpcSuccess<CounselorPackageImportCommitResult> | IpcFailure
    >,
    cancelImport: (previewToken: string) => ipcRenderer.invoke(IPC_CHANNELS.COUNSELOR_PACKAGES_IMPORT_CANCEL, previewToken) as Promise<IpcSuccess<void> | IpcFailure>,
    remove: (packageId: string) => ipcRenderer.invoke(IPC_CHANNELS.COUNSELOR_PACKAGES_REMOVE, packageId) as Promise<
      IpcSuccess<CounselorPackageRemoveResult> | IpcFailure
    >
  },
  settings: {
    read: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_READ) as Promise<IpcSuccess<UserSettings | null> | IpcFailure>,
    save: (settings: UserSettings) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, settings) as Promise<IpcSuccess<void> | IpcFailure>,
    hasApiKey: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_API_KEY_HAS) as Promise<IpcSuccess<boolean> | IpcFailure>,
    deleteApiKey: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_API_KEY_DELETE) as Promise<IpcSuccess<void> | IpcFailure>,
    testConnection: (api: UserSettings["api"]) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_TEST_CONNECTION, api) as Promise<IpcSuccess<ModelConnectionTestResult> | IpcFailure>,
    listModels: (api: UserSettings["api"]) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_LIST_MODELS, api) as Promise<IpcSuccess<ModelListResult> | IpcFailure>
  },
  usage: {
    getSummary: () =>
      ipcRenderer.invoke(IPC_CHANNELS.USAGE_GET) as Promise<IpcSuccess<UsageSummaryResult> | IpcFailure>
  },
  voice: {
    getRuntimeStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.VOICE_RUNTIME_STATUS) as Promise<IpcSuccess<VoiceInputRuntimeStatus> | IpcFailure>,
    getModelStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.VOICE_MODEL_STATUS) as Promise<IpcSuccess<VoiceModelStatus> | IpcFailure>,
    installModel: () =>
      ipcRenderer.invoke(IPC_CHANNELS.VOICE_MODEL_INSTALL) as Promise<IpcSuccess<VoiceModelStatus> | IpcFailure>,
    onModelProgress: (callback: (status: VoiceModelStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: VoiceModelStatus) => callback(status);
      ipcRenderer.on(IPC_CHANNELS.VOICE_MODEL_PROGRESS, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.VOICE_MODEL_PROGRESS, listener);
    },
    startRecognition: (
      request: VoiceRecognitionStartRequest,
      onEvent: (event: VoiceRecognitionEvent) => void
    ) => {
      const listener = (_event: Electron.IpcRendererEvent, recognitionEvent: VoiceRecognitionEvent) => {
        if (recognitionEvent.sessionId !== request.sessionId) return;
        onEvent(recognitionEvent);
        if (recognitionEvent.type === "stopped" || recognitionEvent.type === "error") {
          ipcRenderer.removeListener(IPC_CHANNELS.VOICE_RECOGNITION_EVENT, listener);
        }
      };
      ipcRenderer.on(IPC_CHANNELS.VOICE_RECOGNITION_EVENT, listener);
      return (ipcRenderer.invoke(IPC_CHANNELS.VOICE_RECOGNITION_START, request) as Promise<
        IpcSuccess<{ sessionId: string }> | IpcFailure
      >).then((result) => {
        if (!result.ok) ipcRenderer.removeListener(IPC_CHANNELS.VOICE_RECOGNITION_EVENT, listener);
        return result;
      });
    },
    sendAudio: (chunk: VoiceRecognitionAudioChunk) => {
      ipcRenderer.send(IPC_CHANNELS.VOICE_RECOGNITION_AUDIO, chunk);
    },
    stopRecognition: (sessionId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.VOICE_RECOGNITION_STOP, sessionId) as Promise<IpcSuccess<void> | IpcFailure>
  },
  accessLock: {
    initializeDevice: () => ipcRenderer.invoke(IPC_CHANNELS.ACCESS_LOCK_INITIALIZE_DEVICE) as Promise<IpcSuccess<void> | IpcFailure>,
    status: () => ipcRenderer.invoke(IPC_CHANNELS.ACCESS_LOCK_STATUS) as Promise<IpcSuccess<AccessLockStatus> | IpcFailure>,
    setup: (input: AccessLockSetupInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCESS_LOCK_SETUP, input) as Promise<IpcSuccess<void> | IpcFailure>,
    unlock: (password: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCESS_LOCK_UNLOCK, password) as Promise<IpcSuccess<void> | IpcFailure>,
    recover: (input: AccessLockRecoveryInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCESS_LOCK_RECOVER, input) as Promise<IpcSuccess<void> | IpcFailure>,
    changePassword: (input: AccessLockPasswordChangeInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCESS_LOCK_CHANGE_PASSWORD, input) as Promise<IpcSuccess<void> | IpcFailure>,
    setGraceMinutes: (minutes: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCESS_LOCK_GRACE_SET, minutes) as Promise<IpcSuccess<void> | IpcFailure>,
    disable: (password: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ACCESS_LOCK_DISABLE, password) as Promise<IpcSuccess<void> | IpcFailure>,
    lockNow: () => ipcRenderer.invoke(IPC_CHANNELS.ACCESS_LOCK_NOW) as Promise<IpcSuccess<void> | IpcFailure>
  },
  dataExports: {
    export: (scope: DataExportScope) =>
      ipcRenderer.invoke(IPC_CHANNELS.DATA_EXPORT, scope) as Promise<IpcSuccess<DataExportResult> | IpcFailure>
  },
  localBackups: {
    create: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_BACKUP_CREATE) as Promise<IpcSuccess<LocalBackupResult> | IpcFailure>,
    restore: (recoveryPhrase?: string) => ipcRenderer.invoke(IPC_CHANNELS.DATA_BACKUP_RESTORE, recoveryPhrase) as Promise<IpcSuccess<LocalRestoreResult> | IpcFailure>
  },
  sessions: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_LIST) as Promise<IpcSuccess<CounselingSession[]> | IpcFailure>,
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_GET, id) as Promise<IpcSuccess<CounselingSession | null> | IpcFailure>,
    create: (session: CounselingSession, options?: CreateCounselingSessionOptions) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_CREATE, session, options) as Promise<IpcSuccess<void> | IpcFailure>,
    update: (id: string, changes: SessionMetadataChanges) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_UPDATE, id, changes) as Promise<IpcSuccess<void> | IpcFailure>,
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_DELETE, id) as Promise<IpcSuccess<void> | IpcFailure>,
    activateDraft: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_ACTIVATE_DRAFT, id) as Promise<IpcSuccess<void> | IpcFailure>,
    cancelDraft: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_CANCEL_DRAFT, id) as Promise<IpcSuccess<void> | IpcFailure>,
    end: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_END, id) as Promise<IpcSuccess<void> | IpcFailure>,
    resume: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_RESUME, id) as Promise<IpcSuccess<void> | IpcFailure>
  },
  consultationPreparations: {
    getBySessionId: (sessionId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONSULTATION_PREPARATION_GET_BY_SESSION, sessionId) as Promise<IpcSuccess<ConsultationPreparation | null> | IpcFailure>,
    getLatestByCounselorId: (counselorId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONSULTATION_PREPARATION_GET_LATEST_BY_COUNSELOR, counselorId) as Promise<IpcSuccess<ConsultationPreparation | null> | IpcFailure>,
    retry: (sessionId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONSULTATION_PREPARATION_RETRY, sessionId) as Promise<IpcSuccess<ConsultationPreparation> | IpcFailure>
  },
  sessionLetters: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_LETTERS_LIST) as Promise<IpcSuccess<SessionLetter[]> | IpcFailure>,
    getBySessionId: (sessionId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_LETTERS_GET_BY_SESSION, sessionId) as Promise<IpcSuccess<SessionLetter | null> | IpcFailure>,
    regenerate: (sessionId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSION_LETTERS_REGENERATE, sessionId) as Promise<IpcSuccess<SessionLetter | null> | IpcFailure>
  },
  messages: {
    listBySessionId: (sessionId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.MESSAGES_LIST, sessionId) as Promise<IpcSuccess<SessionMessage[]> | IpcFailure>,
    append: (message: SessionMessage) => ipcRenderer.invoke(IPC_CHANNELS.MESSAGES_APPEND, message) as Promise<IpcSuccess<void> | IpcFailure>,
    appendMany: (messages: SessionMessage[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.MESSAGES_APPEND_MANY, messages) as Promise<IpcSuccess<void> | IpcFailure>
  },
  documents: {
    create: (document: ImportedDocument) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCUMENTS_CREATE, document) as Promise<IpcSuccess<void> | IpcFailure>,
    get: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCUMENTS_GET, id) as Promise<IpcSuccess<ImportedDocument | null> | IpcFailure>,
    listBySessionId: (sessionId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCUMENTS_LIST_BY_SESSION, sessionId) as Promise<IpcSuccess<ImportedDocument[]> | IpcFailure>
  },
  memories: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_LIST) as Promise<IpcSuccess<MemoryItem[]> | IpcFailure>,
    create: (memory: MemoryItem) => ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_CREATE, memory) as Promise<IpcSuccess<void> | IpcFailure>,
    update: (id: string, changes: Partial<Omit<MemoryItem, "id" | "createdAt">>) =>
      ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_UPDATE, id, changes) as Promise<IpcSuccess<void> | IpcFailure>,
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.MEMORIES_DELETE, id) as Promise<IpcSuccess<void> | IpcFailure>
  },
  counseling: {
    streamMessage: (
      request: CounselingStreamRequest,
      handlers: {
        onEvent: (event: CounselingStreamEvent) => void;
      }
    ) => {
      const listener = (_event: Electron.IpcRendererEvent, streamEvent: CounselingStreamEvent) => {
        if (streamEvent.requestId !== request.requestId) return;
        handlers.onEvent(streamEvent);
        if (
          streamEvent.type === "done" ||
          streamEvent.type === "error" ||
          (streamEvent.type === "status" && streamEvent.status === "cancelled")
        ) {
          ipcRenderer.removeListener(IPC_CHANNELS.COUNSELING_STREAM_EVENT, listener);
        }
      };
      ipcRenderer.on(IPC_CHANNELS.COUNSELING_STREAM_EVENT, listener);
      return (ipcRenderer.invoke(IPC_CHANNELS.COUNSELING_STREAM_START, request) as Promise<
        IpcSuccess<{ requestId: string }> | IpcFailure
      >)
        .then((result) => {
          if (!result.ok) {
            ipcRenderer.removeListener(IPC_CHANNELS.COUNSELING_STREAM_EVENT, listener);
          }
          return result;
        })
        .catch((error) => {
          ipcRenderer.removeListener(IPC_CHANNELS.COUNSELING_STREAM_EVENT, listener);
          throw error;
        });
    },
    cancel: (requestId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.COUNSELING_STREAM_CANCEL, requestId) as Promise<IpcSuccess<void> | IpcFailure>,
    getActiveStream: (sessionId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.COUNSELING_STREAM_GET_ACTIVE, sessionId) as Promise<IpcSuccess<ActiveCounselingStream | null> | IpcFailure>
  }
});
