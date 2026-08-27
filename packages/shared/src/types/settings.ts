export type ModelConnectionKind = "local" | "remote";
export type LocalModelRuntime = "ollama" | "lm-studio" | "custom";
export type RemoteModelProvider = "deepseek" | "kimi" | "glm" | "qwen" | "custom";
export type ModelReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export interface ApiSettings {
  connectionKind?: ModelConnectionKind;
  localRuntime?: LocalModelRuntime;
  remoteProvider?: RemoteModelProvider;
  apiBaseUrl: string;
  apiKey?: string;
  apiKeySaved?: boolean;
  apiKeyPreview?: string;
  modelName: string;
  reasoningEffort?: ModelReasoningEffort;
  localApiBaseUrl?: string;
  localModelName?: string;
  remoteApiBaseUrl?: string;
  remoteModelName?: string;
  modelAssignments?: Partial<ModelAssignments>;
}

export interface ModelAssignments {
  conversation: string;
  caseConceptualization: string;
  consultationTeam: string;
}

export interface BackstageModelSettings {
  conceptualizationModelName?: string;
  letterModelName?: string;
}

export interface CounselingExperienceSettings {
  bringPastUnderstandingToNewSessions: boolean;
}

export type VoiceInputProvider = "local" | "volcengine" | "tencent" | "aliyun";
export type DoubaoAsrModel = "seed-asr-2.0-hourly" | "seed-asr-1.0-hourly" | "seed-asr-1.0-concurrent";
export type TencentAsrModel = "16k_zh";
export type AliyunAsrModel = "fun-asr-realtime" | "qwen3-asr-flash-realtime";
export type AliyunModelStudioRegion = "beijing" | "singapore";

export interface DoubaoVoiceSettings {
  appId: string;
  accessToken?: string;
  accessTokenSaved?: boolean;
  accessTokenPreview?: string;
  model: DoubaoAsrModel;
}

export interface TencentVoiceSettings {
  appId: string;
  secretId?: string;
  secretIdSaved?: boolean;
  secretIdPreview?: string;
  secretKey?: string;
  secretKeySaved?: boolean;
  secretKeyPreview?: string;
  model: TencentAsrModel;
}

export interface AliyunVoiceSettings {
  apiKey?: string;
  apiKeySaved?: boolean;
  apiKeyPreview?: string;
  model: AliyunAsrModel;
  region: AliyunModelStudioRegion;
  workspaceId: string;
}

export interface VoiceInputSettings {
  provider: VoiceInputProvider;
  /** 仅在 Ling 窗口激活时生效；空字符串表示未设置。 */
  shortcut: string;
  /** 火山引擎 Seed-ASR 配置；保留旧字段名以兼容已保存的测试配置。 */
  doubao: DoubaoVoiceSettings;
  tencent: TencentVoiceSettings;
  aliyun: AliyunVoiceSettings;
}

export type SupportedLocale = "zh-CN" | "en-US";

export type ReadingTextSize = "small" | "standard" | "large";
export type ReadingLineSpacing = "compact" | "standard" | "relaxed";
export type CursorTheme = "a" | "b" | "c" | "d" | "e";

export interface ReadingAppearanceSettings {
  textSize: ReadingTextSize;
  lineSpacing: ReadingLineSpacing;
  cursorTheme?: CursorTheme;
}

export interface UserProfileSettings {
  displayName: string;
  background: string;
  avatarDataUrl?: string;
  avatarFileName?: string;
}

export interface UserSettings {
  api: ApiSettings;
  backstageModels?: BackstageModelSettings;
  counseling?: CounselingExperienceSettings;
  voiceInput?: VoiceInputSettings;
  appearance?: ReadingAppearanceSettings;
  locale?: SupportedLocale;
  defaultCounselorId: string;
  /** Imported counselors hidden from new-consultation discovery. Historical records remain available. */
  disabledCounselorIds?: string[];
  defaultRoomThemeId: string;
  profile?: UserProfileSettings;
}

export interface ModelConnectionTestResult {
  connected: boolean;
  message: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  ownedBy?: string;
}

export interface ModelListResult {
  models: ModelInfo[];
  message: string;
  source: "remote" | "empty" | "failed";
}
