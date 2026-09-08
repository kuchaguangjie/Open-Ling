/**
 * Centralized IPC channel names.
 * Every channel used by main ↔ preload ↔ renderer is defined here
 * so the strings cannot drift out of sync.
 */
export const IPC_CHANNELS = {
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
  SETTINGS_API_KEY_HAS: "ling:settings:api-key:has",
  SETTINGS_API_KEY_DELETE: "ling:settings:api-key:delete",
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
  COUNSELING_STREAM_EVENT: "ling:counseling:stream-event",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
