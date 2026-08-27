export type { AgentDescriptor, AgentRole } from "./types/agent.js";
export type {
  AccessLockPasswordChangeInput,
  AccessLockRecoveryInput,
  AccessLockSetupInput,
  AccessLockStatus
} from "./types/accessLock.js";
export type { Counselor, CounselorApproach } from "./types/counselor.js";
export type {
  CounselorPackageLicense,
  CounselorPackageInstallResult,
  CounselorPackageLocaleContent,
  CounselorPackageManifest,
  CounselorPackageOpeningCopy,
  CounselorPackagePromptResources,
  CounselorPackagePublisher,
  CounselorPackageRemoveResult,
  CounselorPackageSafetyRequirements,
  CounselorPackageSchemaVersion,
  CounselorPackageSource,
  CounselorPackageValidationResult,
  CounselorPackageVisualResources,
  RegisteredCounselorPackage
} from "./types/counselorPackage.js";
export type { ConsultationMemo, ConsultationMemoStatus } from "./types/consultationMemo.js";
export type { DataExportResult, DataExportScope } from "./types/dataExport.js";
export type { LocalBackupResult, LocalRestoreResult } from "./types/localBackup.js";
export type { AppUpdateState, AppUpdateStatus } from "./types/appUpdate.js";
export type {
  ConsultationPreparation,
  ConsultationPreparationPhase,
  ConsultationPreparationStatus,
  PublishConsultationPreparationInput
} from "./types/consultationPreparation.js";
export type { MemoryItem, MemoryStatus, MemoryType } from "./types/memory.js";
export type { MessageRole, MessageStatus, SessionMessage } from "./types/message.js";
export type {
  ImportedDocument,
  ImportedDocumentKind,
  ImportedDocumentReference,
  ImportedDocumentStatus
} from "./types/importedDocument.js";
export type {
  LongTermConceptualization,
  LongTermConceptualizationStatus
} from "./types/longTermConceptualization.js";
export type { RoomTheme } from "./types/roomTheme.js";
export type { RollingSummary, RollingSummaryStatus } from "./types/rollingSummary.js";
export type {
  DailyUsageSummary,
  ModelUsageByModel,
  ModelUsageRecord,
  ProviderUsageSummary,
  UsageSummaryResult
} from "./types/usage.js";
export type {
  SessionConceptualization,
  SessionConceptualizationStatus
} from "./types/sessionConceptualization.js";
export type { SessionLetter, SessionLetterStatus } from "./types/sessionLetter.js";
export {
  formatSessionLetterMarkdown,
  isSessionLetterSalutation,
  normalizeSessionLetterMarkdown,
  splitSessionLetterParagraphs
} from "./sessionLetterText.js";
export type { SessionSupervision, SessionSupervisionStatus } from "./types/sessionSupervision.js";
export type { ActiveCounselingStream, CounselingStreamEvent, CounselingStreamRequest, CounselingStreamStatus, ModelImageInput } from "./types/counseling.js";
export type {
  CounselingCompilerId,
  CounselingMemorySnapshot,
  CounselingPromptSnapshot,
  CounselingPromptSnapshotV1,
  CounselingPromptSnapshotV2,
  CounselingPromptSnapshotV3,
  CounselingPromptSnapshotV4,
  CounselingPromptSnapshotV5,
  CounselingRuntimeContract,
  CounselingSamplingProfile,
  CounselingSession,
  CreateCounselingSessionOptions,
  SessionMetadataChanges,
  SessionStatus
} from "./types/session.js";
export type {
  AliyunModelStudioRegion,
  AliyunAsrModel,
  AliyunVoiceSettings,
  ApiSettings,
  BackstageModelSettings,
  CounselingExperienceSettings,
  CursorTheme,
  DoubaoAsrModel,
  DoubaoVoiceSettings,
  LocalModelRuntime,
  ModelAssignments,
  ModelConnectionKind,
  ModelConnectionTestResult,
  ModelInfo,
  ModelListResult,
  ModelReasoningEffort,
  ReadingAppearanceSettings,
  ReadingLineSpacing,
  ReadingTextSize,
  RemoteModelProvider,
  SupportedLocale,
  TencentAsrModel,
  TencentVoiceSettings,
  UserProfileSettings,
  UserSettings,
  VoiceInputProvider,
  VoiceInputSettings
} from "./types/settings.js";
export type {
  VoiceInputRuntimeStatus,
  VoiceModelState,
  VoiceModelStatus,
  VoiceRecognitionAudioChunk,
  VoiceRecognitionEvent,
  VoiceRecognitionStartRequest
} from "./types/voiceInput.js";
export {
  ERROR_CODES,
  IPC_CHANNELS,
  failure,
  isIpcFailure,
  sanitizeErrorPayload,
  success,
  validateCounselingStreamRequest,
  validateId,
  validateImportedDocumentPayload,
  validateMemoryPayload,
  validateMemoryUpdatePayload,
  validateMessageBatchPayload,
  validateMessagePayload,
  validateSessionPayload,
  validateSessionUpdatePayload,
  validateSettings,
  wrapIpcHandler
} from "./ipc/index.js";
export type {
  ErrorCode,
  IpcChannel,
  IpcErrorPayload,
  IpcFailure,
  IpcHandlerResult,
  IpcSuccess
} from "./ipc/index.js";
export { defaultCounselors, getDefaultCounselors } from "./constants/defaultCounselors.js";
export { defaultRoomThemes } from "./constants/defaultRoomThemes.js";
export {
  CounselorPackageRegistry,
  createCounselorPackageRegistration
} from "./counselors/counselorPackageRegistry.js";
export {
  builtinCounselorPackages,
  counselorPackageRegistry,
  getBuiltinCounselorPackage,
  getCounselorPackage,
  getCounselorPackageLocaleContent,
  requireBuiltinCounselorPackage,
  requireCounselorPackage,
  toCounselor,
  validateCounselorPackageManifest
} from "./counselors/builtinCounselorPackages.js";
export {
  COUNSELOR_PACKAGE_ENGINE_VERSION,
  compareCounselorPackageVersions,
  isCounselorEngineCompatible,
  isSupportedCounselorEngineRange
} from "./counselors/counselorPackageCompatibility.js";
export { isCounselorPackageResourceUri } from "./counselors/counselorPackageValidation.js";
