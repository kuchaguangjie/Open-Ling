import { create } from "zustand";
import type {
  ApiSettings,
  BackstageModelSettings,
  CounselingExperienceSettings,
  ModelAssignments,
  ModelInfo,
  ReadingAppearanceSettings,
  SupportedLocale,
  UserProfileSettings,
  UserSettings,
  VoiceInputSettings
} from "@shared/index";
import { isSupportedLocale, localize, readInitialLocale, rememberLocale } from "../localization";
import { getDefaultModelReasoningEffort } from "@core/providers/modelCapabilities";

type SettingsStatus = "idle" | "loading" | "saving" | "testing" | "saved" | "error";
type ConnectionStatus = "idle" | "success" | "failed";
type ModelListStatus = "idle" | "loading" | "loaded" | "empty" | "failed";
type SettingsSection = "model" | "voice" | "profile" | "counseling" | "appearance";
type DirtySections = Record<SettingsSection, boolean>;

interface SettingsState {
  api: ApiSettings;
  backstageModels: BackstageModelSettings;
  availableModels: ModelInfo[];
  appearance: ReadingAppearanceSettings;
  counseling: CounselingExperienceSettings;
  voiceInput: VoiceInputSettings;
  locale: SupportedLocale;
  defaultCounselorId: string;
  disabledCounselorIds: string[];
  defaultRoomThemeId: string;
  profile: UserProfileSettings;
  savedApi: ApiSettings;
  savedAppearance: ReadingAppearanceSettings;
  savedCounseling: CounselingExperienceSettings;
  savedVoiceInput: VoiceInputSettings;
  savedLocale: SupportedLocale;
  savedProfile: UserProfileSettings;
  dirtySections: DirtySections;
  status: SettingsStatus;
  connectionStatus: ConnectionStatus;
  modelListStatus: ModelListStatus;
  message: string;
  updateApi: (api: Partial<ApiSettings>) => void;
  updateAppearance: (appearance: Partial<ReadingAppearanceSettings>) => void;
  updateBackstageModels: (backstageModels: Partial<BackstageModelSettings>) => void;
  updateCounseling: (counseling: Partial<CounselingExperienceSettings>) => void;
  updateVoiceInput: (
    voiceInput: Partial<Omit<VoiceInputSettings, "doubao" | "tencent" | "aliyun">> & {
      doubao?: Partial<VoiceInputSettings["doubao"]>;
      tencent?: Partial<VoiceInputSettings["tencent"]>;
      aliyun?: Partial<VoiceInputSettings["aliyun"]>;
    }
  ) => void;
  updateLocale: (locale: SupportedLocale) => void;
  updateDefaultCounselor: (id: string) => Promise<void>;
  updateDisabledCounselors: (ids: string[]) => Promise<boolean>;
  updateProfile: (profile: Partial<UserProfileSettings>) => void;
  loadSettings: () => Promise<UserSettings | null>;
  loadModels: () => Promise<void>;
  saveSettings: () => Promise<void>;
  saveAppearance: () => Promise<void>;
  saveCounseling: () => Promise<void>;
  saveVoiceInput: () => Promise<void>;
  saveLocale: (locale: SupportedLocale) => Promise<void>;
  saveProfile: () => Promise<void>;
  restoreRecommendedSettings: () => Promise<void>;
  testConnection: () => Promise<void>;
  deleteApiKey: () => Promise<void>;
  discardUnsavedChanges: () => void;
  clearMessage: () => void;
}

const defaultApi: ApiSettings = {
  connectionKind: "remote",
  localRuntime: "ollama",
  remoteProvider: "deepseek",
  apiBaseUrl: "https://api.deepseek.com",
  apiKey: "",
  modelName: "deepseek-v4-flash-vision-exp",
  reasoningEffort: "high",
  localApiBaseUrl: "http://127.0.0.1:11434/v1",
  localModelName: "",
  remoteApiBaseUrl: "https://api.deepseek.com",
  remoteModelName: "deepseek-v4-flash-vision-exp",
  modelAssignments: {
    conversation: "deepseek-v4-flash-vision-exp",
    caseConceptualization: "deepseek-v4-flash-vision-exp",
    consultationTeam: "deepseek-v4-flash-vision-exp"
  }
};

const defaultBackstageModels: BackstageModelSettings = {};

const defaultCounseling: CounselingExperienceSettings = {
  bringPastUnderstandingToNewSessions: true
};

export const defaultVoiceInput: VoiceInputSettings = {
  provider: "local",
  shortcut: "",
  doubao: {
    appId: "",
    accessToken: "",
    model: "seed-asr-2.0-hourly"
  },
  tencent: {
    appId: "",
    secretId: "",
    secretKey: "",
    model: "16k_zh"
  },
  aliyun: {
    apiKey: "",
    model: "fun-asr-realtime",
    region: "beijing",
    workspaceId: ""
  }
};

export const defaultReadingAppearance: ReadingAppearanceSettings = {
  textSize: "standard",
  lineSpacing: "standard",
  cursorTheme: "d"
};

export const defaultDeepSeekModels: ModelInfo[] = [
  { id: "deepseek-v4-flash-vision-exp", name: "DeepSeek V4 Flash Vision (Exp)", ownedBy: "deepseek" },
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", ownedBy: "deepseek" },
  { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", ownedBy: "deepseek" }
];

const defaultProfile: UserProfileSettings = {
  displayName: "",
  background: ""
};

const defaultCounselorId = "chengling";
const defaultRoomThemeId = "warm-study";
const initialLocale = readInitialLocale();

function settingsCopy(zhCN: string, enUS: string) {
  return localize(useSettingsStore.getState().locale, zhCN, enUS);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  api: {
    ...defaultApi
  },
  backstageModels: {
    ...defaultBackstageModels
  },
  availableModels: [...defaultDeepSeekModels],
  appearance: { ...defaultReadingAppearance },
  counseling: {
    ...defaultCounseling
  },
  voiceInput: structuredClone(defaultVoiceInput),
  locale: initialLocale,
  defaultCounselorId,
  disabledCounselorIds: [],
  defaultRoomThemeId,
  profile: {
    ...defaultProfile
  },
  savedApi: { ...defaultApi },
  savedAppearance: { ...defaultReadingAppearance },
  savedCounseling: { ...defaultCounseling },
  savedVoiceInput: structuredClone(defaultVoiceInput),
  savedLocale: initialLocale,
  savedProfile: { ...defaultProfile },
  dirtySections: { model: false, voice: false, profile: false, counseling: false, appearance: false },
  status: "idle",
  connectionStatus: "idle",
  modelListStatus: "idle",
  message: "",
  clearMessage: () => set({ message: "" }),
  updateApi: (api) =>
    set((state) => ({
      api: { ...state.api, ...api },
      dirtySections: { ...state.dirtySections, model: true },
      status: "idle",
      message: ""
    })),
  updateAppearance: (appearance) =>
    set((state) => ({
      appearance: { ...state.appearance, ...appearance },
      dirtySections: { ...state.dirtySections, appearance: true },
      status: "idle",
      message: ""
    })),
  updateBackstageModels: (backstageModels) =>
    set((state) => ({
      backstageModels: { ...state.backstageModels, ...backstageModels },
      dirtySections: { ...state.dirtySections, model: true },
      status: "idle",
      message: ""
    })),
  updateCounseling: (counseling) =>
    set((state) => ({
      counseling: { ...state.counseling, ...counseling },
      dirtySections: { ...state.dirtySections, counseling: true },
      status: "idle",
      message: ""
    })),
  updateVoiceInput: (voiceInput) =>
    set((state) => ({
      voiceInput: {
        ...state.voiceInput,
        ...voiceInput,
        doubao: { ...state.voiceInput.doubao, ...voiceInput.doubao },
        tencent: { ...state.voiceInput.tencent, ...voiceInput.tencent },
        aliyun: { ...state.voiceInput.aliyun, ...voiceInput.aliyun }
      },
      dirtySections: { ...state.dirtySections, voice: true },
      status: "idle",
      message: ""
    })),
  updateLocale: (locale) => {
    rememberLocale(locale);
    set({
      locale,
      status: "idle",
      message: ""
    });
  },
  updateDefaultCounselor: async (id) => {
    set({ defaultCounselorId: id, status: "idle", message: "" });
    if (!window.lingDesktop?.settings) return;
    const result = await window.lingDesktop.settings.save(createUserSettings(get()));
    if (!result.ok) {
      set({ status: "error", message: result.error.message });
    }
  },
  updateDisabledCounselors: async (ids) => {
    const previous = get().disabledCounselorIds;
    const disabledCounselorIds = [...new Set(ids)].sort();
    set({ disabledCounselorIds, status: "idle", message: "" });
    if (!window.lingDesktop?.settings) return true;
    const result = await window.lingDesktop.settings.save(createUserSettings(get()));
    if (!result.ok) {
      set({ disabledCounselorIds: previous, status: "error", message: result.error.message });
      return false;
    }
    return true;
  },
  updateProfile: (profile) =>
    set((state) => ({
      profile: { ...state.profile, ...profile },
      dirtySections: { ...state.dirtySections, profile: true },
      status: "idle",
      message: ""
    })),
  loadSettings: async () => {
    if (!window.lingDesktop?.settings) return null;
    set({ status: "loading", message: "" });
    const result = await window.lingDesktop.settings.read();
    if (!result.ok) {
      set({ status: "error", message: result.error.message });
      return null;
    }
    if (result.data) {
      const locale = isSupportedLocale(result.data.locale) ? result.data.locale : "zh-CN";
      rememberLocale(locale);
      set({
        api: normalizeApiSettings(result.data.api),
        savedApi: normalizeApiSettings(result.data.api),
        backstageModels: { ...defaultBackstageModels, ...result.data.backstageModels },
        appearance: normalizeAppearanceSettings(result.data.appearance),
        savedAppearance: normalizeAppearanceSettings(result.data.appearance),
        counseling: normalizeCounselingSettings(result.data.counseling),
        savedCounseling: normalizeCounselingSettings(result.data.counseling),
        voiceInput: normalizeVoiceInputSettings(result.data.voiceInput),
        savedVoiceInput: normalizeVoiceInputSettings(result.data.voiceInput),
        locale,
        savedLocale: locale,
        defaultCounselorId: result.data.defaultCounselorId,
        disabledCounselorIds: result.data.disabledCounselorIds ?? [],
        defaultRoomThemeId: result.data.defaultRoomThemeId,
        profile: { ...defaultProfile, ...result.data.profile },
        savedProfile: { ...defaultProfile, ...result.data.profile },
        dirtySections: { model: false, voice: false, profile: false, counseling: false, appearance: false },
        status: "idle"
      });
      return result.data;
    }
    set({ status: "idle" });
    return null;
  },
  loadModels: async () => {
    if (!window.lingDesktop?.settings?.listModels) {
      set({
        availableModels: [...defaultDeepSeekModels],
        modelListStatus: "failed",
        message: settingsCopy("此功能只能在 Ling 桌面 App 中使用。", "This feature is available only in the Ling desktop app.")
      });
      return;
    }
    set({ modelListStatus: "loading", message: "" });
    const result = await window.lingDesktop.settings.listModels(get().api);
    if (!result.ok) {
      set({ modelListStatus: "failed", message: result.error.message });
      return;
    }
    const isLocal = get().api.connectionKind === "local";
    const nextModels = result.data.models.length > 0
      ? result.data.models
      : isLocal
        ? (get().api.modelName ? [{ id: get().api.modelName, name: get().api.modelName }] : [])
        : defaultDeepSeekModels;
    set((state) => ({
      availableModels: nextModels,
      api: nextModels.some((model) => model.id === state.api.modelName)
        ? state.api
        : normalizeApiSettings({
            ...state.api,
            modelName: nextModels[0]?.id ?? state.api.modelName,
            ...(state.api.connectionKind === "local"
              ? { localModelName: nextModels[0]?.id ?? state.api.modelName }
              : { remoteModelName: nextModels[0]?.id ?? state.api.modelName }),
            modelAssignments: {
              ...state.api.modelAssignments,
              conversation: nextModels[0]?.id ?? state.api.modelName
            }
          }),
      dirtySections: {
        ...state.dirtySections,
        model:
          state.dirtySections.model ||
          !nextModels.some((model) => model.id === state.api.modelName)
      },
      modelListStatus:
        result.data.source === "remote" && result.data.models.length > 0
          ? "loaded"
          : result.data.source === "empty"
            ? "empty"
            : "failed",
      message: result.data.message
    }));
  },
  saveSettings: async () => {
    if (!window.lingDesktop?.settings) {
      set({ status: "error", message: settingsCopy("此功能只能在 Ling 桌面 App 中使用。", "This feature is available only in the Ling desktop app.") });
      return;
    }
    set({ status: "saving", message: "" });
    const saved = createSavedUserSettings(get());
    const settings = { ...saved, api: get().api };
    const result = await window.lingDesktop.settings.save(settings);
    if (!result.ok) {
      set({ status: "error", message: result.error.message });
      return;
    }
    const readResult = await window.lingDesktop.settings.read();
    if (readResult.ok && readResult.data) {
      set({
        api: normalizeApiSettings(readResult.data.api),
        savedApi: normalizeApiSettings(readResult.data.api),
        dirtySections: { ...get().dirtySections, model: false },
        status: "saved",
        message: settingsCopy("配置已保存。", "Configuration saved.")
      });
      return;
    }
    const api = {
      ...get().api,
      apiKey: "",
      apiKeySaved: get().api.connectionKind === "local" ? get().api.apiKeySaved : true
    };
    set({ api, savedApi: api, dirtySections: { ...get().dirtySections, model: false }, status: "saved", message: settingsCopy("配置已保存。", "Configuration saved.") });
  },
  saveAppearance: async () => {
    if (!window.lingDesktop?.settings) {
      set({ status: "error", message: settingsCopy("此功能只能在 Ling 桌面 App 中使用。", "This feature is available only in the Ling desktop app.") });
      return;
    }
    set({ status: "saving", message: "" });
    const readResult = await window.lingDesktop.settings.read();
    if (!readResult.ok) {
      set({ status: "error", message: readResult.error.message });
      return;
    }
    const baseSettings = readResult.data ?? createSavedUserSettings(get());
    const result = await window.lingDesktop.settings.save({
      ...baseSettings,
      appearance: get().appearance
    });
    if (!result.ok) {
      set({ status: "error", message: result.error.message });
      return;
    }
    set({
      savedAppearance: { ...get().appearance },
      dirtySections: { ...get().dirtySections, appearance: false },
      status: "saved",
      message: settingsCopy("界面设置已保存在这台设备上。", "Display settings were saved on this device.")
    });
  },
  saveCounseling: async () => {
    if (!window.lingDesktop?.settings) {
      set({ status: "error", message: settingsCopy("此功能只能在 Ling 桌面 App 中使用。", "This feature is available only in the Ling desktop app.") });
      return;
    }
    set({ status: "saving", message: "" });
    const readResult = await window.lingDesktop.settings.read();
    if (!readResult.ok) {
      set({ status: "error", message: readResult.error.message });
      return;
    }
    const baseSettings = readResult.data ?? createSavedUserSettings(get());
    const result = await window.lingDesktop.settings.save({
      ...baseSettings,
      api: baseSettings.api,
      backstageModels: { ...defaultBackstageModels, ...baseSettings.backstageModels },
      counseling: get().counseling,
      profile: baseSettings.profile
    });
    if (!result.ok) {
      set({ status: "error", message: result.error.message });
      return;
    }
    set({ savedCounseling: { ...get().counseling }, dirtySections: { ...get().dirtySections, counseling: false }, status: "saved", message: settingsCopy("连续性设置已保存。", "Counseling continuity settings saved.") });
  },
  saveLocale: async (locale) => {
    rememberLocale(locale);
    set({ locale });
    if (!window.lingDesktop?.settings) {
      set({ savedLocale: locale });
      return;
    }
    const readResult = await window.lingDesktop.settings.read();
    if (!readResult.ok) {
      set({ status: "error", message: readResult.error.message });
      return;
    }
    const baseSettings = readResult.data ?? createUserSettings(get());
    const result = await window.lingDesktop.settings.save({
      ...baseSettings,
      locale
    });
    if (!result.ok) {
      set({ status: "error", message: result.error.message });
      return;
    }
    set({
      locale,
      savedLocale: locale,
      status: "saved",
      message: ""
    });
  },
  saveVoiceInput: async () => {
    if (!window.lingDesktop?.settings) {
      set({ status: "error", message: settingsCopy("此功能只能在 Ling 桌面 App 中使用。", "This feature is available only in the Ling desktop app.") });
      return;
    }
    const voiceInput = get().voiceInput;
    if (voiceInput.provider === "volcengine" && !voiceInput.doubao.appId.trim()) {
      set({ status: "error", message: settingsCopy("请填写火山引擎 App ID。", "Enter the Volcengine App ID.") });
      return;
    }
    if (
      voiceInput.provider === "volcengine" &&
      !voiceInput.doubao.accessToken?.trim() &&
      !voiceInput.doubao.accessTokenSaved
    ) {
      set({ status: "error", message: settingsCopy("请填写火山引擎 Access Token。", "Enter the Volcengine Access Token.") });
      return;
    }
    if (voiceInput.provider === "tencent" && !voiceInput.tencent.appId.trim()) {
      set({ status: "error", message: settingsCopy("请填写腾讯云 AppID。", "Enter the Tencent Cloud AppID.") });
      return;
    }
    if (
      voiceInput.provider === "tencent" &&
      (!voiceInput.tencent.secretId?.trim() && !voiceInput.tencent.secretIdSaved ||
        !voiceInput.tencent.secretKey?.trim() && !voiceInput.tencent.secretKeySaved)
    ) {
      set({ status: "error", message: settingsCopy("请填写腾讯云 SecretID 和 SecretKey。", "Enter the Tencent Cloud SecretID and SecretKey.") });
      return;
    }
    if (
      voiceInput.provider === "aliyun" &&
      (!voiceInput.aliyun.apiKey?.trim() && !voiceInput.aliyun.apiKeySaved)
    ) {
      set({ status: "error", message: settingsCopy("请填写阿里云百炼 API Key。", "Enter the Alibaba Cloud Model Studio API key.") });
      return;
    }
    if (voiceInput.provider === "aliyun" && !voiceInput.aliyun.workspaceId.trim()) {
      set({ status: "error", message: settingsCopy("请填写阿里云百炼 Workspace ID。", "Enter the Alibaba Cloud Model Studio Workspace ID.") });
      return;
    }
    set({ status: "saving", message: "" });
    const readResult = await window.lingDesktop.settings.read();
    if (!readResult.ok) {
      set({ status: "error", message: readResult.error.message });
      return;
    }
    const baseSettings = readResult.data ?? createSavedUserSettings(get());
    const result = await window.lingDesktop.settings.save({ ...baseSettings, voiceInput });
    if (!result.ok) {
      set({ status: "error", message: result.error.message });
      return;
    }
    const refreshed = await window.lingDesktop.settings.read();
    const savedVoiceInput = refreshed.ok && refreshed.data?.voiceInput
      ? normalizeVoiceInputSettings(refreshed.data.voiceInput)
      : normalizeVoiceInputSettings({
          ...voiceInput,
          doubao: {
            ...voiceInput.doubao,
            accessToken: "",
            accessTokenSaved:
              Boolean(voiceInput.doubao.accessToken?.trim()) || voiceInput.doubao.accessTokenSaved
          },
          tencent: {
            ...voiceInput.tencent,
            secretId: "",
            secretIdSaved: Boolean(voiceInput.tencent.secretId?.trim()) || voiceInput.tencent.secretIdSaved,
            secretKey: "",
            secretKeySaved: Boolean(voiceInput.tencent.secretKey?.trim()) || voiceInput.tencent.secretKeySaved
          },
          aliyun: {
            ...voiceInput.aliyun,
            apiKey: "",
            apiKeySaved: Boolean(voiceInput.aliyun.apiKey?.trim()) || voiceInput.aliyun.apiKeySaved
          }
        });
    set({
      voiceInput: savedVoiceInput,
      savedVoiceInput,
      dirtySections: { ...get().dirtySections, voice: false },
      status: "saved",
      message: voiceInput.provider === "local"
        ? settingsCopy("已使用内置本地语音，录音不会上传。", "Built-in local voice input is selected; recordings are not uploaded.")
        : settingsCopy("云端语音识别配置已保存在这台设备上。", "Cloud speech-recognition settings were saved on this device.")
    });
  },
  saveProfile: async () => {
    if (!window.lingDesktop?.settings) {
      set({ status: "error", message: settingsCopy("此功能只能在 Ling 桌面 App 中使用。", "This feature is available only in the Ling desktop app.") });
      return;
    }
    set({ status: "saving", message: "" });
    const readResult = await window.lingDesktop.settings.read();
    if (!readResult.ok) {
      set({ status: "error", message: readResult.error.message });
      return;
    }
    const baseSettings = readResult.data ?? createSavedUserSettings(get());
      const result = await window.lingDesktop.settings.save({
        ...baseSettings,
        api: baseSettings.api,
        backstageModels: { ...defaultBackstageModels, ...baseSettings.backstageModels },
        counseling: baseSettings.counseling,
        locale: get().locale,
        profile: get().profile
    });
    if (!result.ok) {
      set({ status: "error", message: result.error.message });
      return;
    }
    set({ savedLocale: get().locale, savedProfile: { ...get().profile }, dirtySections: { ...get().dirtySections, profile: false }, status: "saved", message: settingsCopy("个人资料已保存在这台设备上。", "Your profile was saved on this device.") });
  },
  restoreRecommendedSettings: async () => {
    if (!window.lingDesktop?.settings) {
      set({ status: "error", message: settingsCopy("此功能只能在 Ling 桌面 App 中使用。", "This feature is available only in the Ling desktop app.") });
      return;
    }
    set({ status: "saving", message: "" });
    try {
      const readResult = await window.lingDesktop.settings.read();
      if (!readResult.ok) {
        set({ status: "error", message: readResult.error.message });
        return;
      }
      const baseSettings = readResult.data ?? createSavedUserSettings(get());
      const api = normalizeApiSettings({
        ...baseSettings.api,
        modelName: defaultApi.modelName,
        modelAssignments: defaultApi.modelAssignments
      });
      const appearance = { ...defaultReadingAppearance };
      const counseling = { ...defaultCounseling };
      const backstageModels = { ...defaultBackstageModels };
      const result = await window.lingDesktop.settings.save({
        ...baseSettings,
        api,
        appearance,
        backstageModels,
        counseling
      });
      if (!result.ok) {
        set({ status: "error", message: result.error.message });
        return;
      }
      set({
        api,
        savedApi: api,
        appearance,
        savedAppearance: appearance,
        backstageModels,
        counseling,
        savedCounseling: counseling,
        profile: { ...defaultProfile, ...baseSettings.profile },
        savedProfile: { ...defaultProfile, ...baseSettings.profile },
        defaultCounselorId: baseSettings.defaultCounselorId,
        defaultRoomThemeId: baseSettings.defaultRoomThemeId,
        dirtySections: { model: false, voice: false, profile: false, counseling: false, appearance: false },
        status: "saved",
        connectionStatus: "idle",
        message: settingsCopy("已恢复推荐设置。阅读显示、咨询连续性和模型选择已更新；会谈、来信、备份、个人资料与 API Key 均未改动。", "Recommended settings restored. Reading display, counseling continuity, and model selections were updated; sessions, letters, backups, your profile, and API keys were not changed.")
      });
    } catch {
      set({ status: "error", message: settingsCopy("没有完成恢复推荐设置。现有资料没有被清空，请稍后重试。", "Recommended settings could not be restored. Existing information was not cleared. Please try again.") });
    }
  },
  testConnection: async () => {
    if (!window.lingDesktop?.settings) {
      set({ status: "error", connectionStatus: "failed", message: settingsCopy("此功能只能在 Ling 桌面 App 中使用。", "This feature is available only in the Ling desktop app.") });
      return;
    }
    set({ status: "testing", connectionStatus: "idle", message: "" });
    const result = await window.lingDesktop.settings.testConnection(get().api);
    if (!result.ok) {
      set({ status: "error", connectionStatus: "failed", message: result.error.message });
      return;
    }
    set({
      status: "idle",
      connectionStatus: result.data.connected ? "success" : "failed",
      message: result.data.message
    });
  },
  deleteApiKey: async () => {
    if (!window.lingDesktop?.settings) {
      set({ status: "error", message: settingsCopy("此功能只能在 Ling 桌面 App 中使用。", "This feature is available only in the Ling desktop app.") });
      return;
    }
    set({ status: "saving", message: "" });
    const result = await window.lingDesktop.settings.deleteApiKey();
    if (!result.ok) {
      set({ status: "error", message: result.error.message });
      return;
    }
    set({
      api: { ...get().api, apiKey: "", apiKeySaved: false, apiKeyPreview: undefined },
      savedApi: { ...get().savedApi, apiKey: "", apiKeySaved: false, apiKeyPreview: undefined },
      dirtySections: { ...get().dirtySections, model: false },
      status: "saved",
      connectionStatus: "idle",
      message: settingsCopy("API Key 已删除。", "API key deleted.")
    });
  },
  discardUnsavedChanges: () =>
    set((state) => ({
      api: { ...state.savedApi },
      appearance: { ...state.savedAppearance },
      counseling: { ...state.savedCounseling },
      voiceInput: structuredClone(state.savedVoiceInput),
      locale: state.savedLocale,
      profile: { ...state.savedProfile },
      dirtySections: { model: false, voice: false, profile: false, counseling: false, appearance: false },
      message: ""
    }))
}));

export function resetSettingsStore() {
  useSettingsStore.setState({
    api: { ...defaultApi },
    backstageModels: { ...defaultBackstageModels },
    availableModels: [...defaultDeepSeekModels],
    appearance: { ...defaultReadingAppearance },
    counseling: { ...defaultCounseling },
    voiceInput: structuredClone(defaultVoiceInput),
    locale: "zh-CN",
    defaultCounselorId,
    disabledCounselorIds: [],
    defaultRoomThemeId,
    profile: { ...defaultProfile },
    savedApi: { ...defaultApi },
    savedAppearance: { ...defaultReadingAppearance },
    savedCounseling: { ...defaultCounseling },
    savedVoiceInput: structuredClone(defaultVoiceInput),
    savedLocale: "zh-CN",
    savedProfile: { ...defaultProfile },
    dirtySections: { model: false, voice: false, profile: false, counseling: false, appearance: false },
    status: "idle",
    connectionStatus: "idle",
    modelListStatus: "idle",
    message: ""
  });
}

function createUserSettings(
  state: Pick<
    SettingsState,
    "api" | "appearance" | "backstageModels" | "counseling" | "voiceInput" | "defaultCounselorId" | "disabledCounselorIds" | "defaultRoomThemeId" | "locale" | "profile"
  >
): UserSettings {
  return {
    api: state.api,
    appearance: state.appearance,
    backstageModels: state.backstageModels,
    counseling: state.counseling,
    voiceInput: state.voiceInput,
    locale: state.locale,
    defaultCounselorId: state.defaultCounselorId,
    disabledCounselorIds: state.disabledCounselorIds,
    defaultRoomThemeId: state.defaultRoomThemeId,
    profile: state.profile
  };
}

function createSavedUserSettings(
  state: Pick<SettingsState, "savedApi" | "savedAppearance" | "savedCounseling" | "savedVoiceInput" | "savedLocale" | "savedProfile" | "defaultCounselorId" | "disabledCounselorIds" | "defaultRoomThemeId" | "backstageModels">
): UserSettings {
  return {
    api: state.savedApi,
    appearance: state.savedAppearance,
    backstageModels: state.backstageModels,
    counseling: state.savedCounseling,
    voiceInput: state.savedVoiceInput,
    locale: state.savedLocale,
    defaultCounselorId: state.defaultCounselorId,
    disabledCounselorIds: state.disabledCounselorIds,
    defaultRoomThemeId: state.defaultRoomThemeId,
    profile: state.savedProfile
  };
}

function normalizeVoiceInputSettings(voiceInput: Partial<VoiceInputSettings> | undefined): VoiceInputSettings {
  const legacyProvider = (voiceInput?.provider as string | undefined) === "doubao"
    ? "volcengine"
    : voiceInput?.provider;
  return {
    provider:
      legacyProvider === "volcengine" || legacyProvider === "tencent" || legacyProvider === "aliyun"
        ? legacyProvider
        : "local",
    shortcut: typeof voiceInput?.shortcut === "string" ? voiceInput.shortcut : "",
    doubao: {
      ...defaultVoiceInput.doubao,
      ...voiceInput?.doubao,
      accessToken: voiceInput?.doubao?.accessToken ?? "",
      model:
        voiceInput?.doubao?.model === "seed-asr-1.0-hourly" ||
        voiceInput?.doubao?.model === "seed-asr-1.0-concurrent"
          ? voiceInput.doubao.model
          : "seed-asr-2.0-hourly"
    },
    tencent: {
      ...defaultVoiceInput.tencent,
      ...voiceInput?.tencent,
      secretId: voiceInput?.tencent?.secretId ?? "",
      secretKey: voiceInput?.tencent?.secretKey ?? "",
      model: "16k_zh"
    },
    aliyun: {
      ...defaultVoiceInput.aliyun,
      ...voiceInput?.aliyun,
      apiKey: voiceInput?.aliyun?.apiKey ?? "",
      model:
        voiceInput?.aliyun?.model === "qwen3-asr-flash-realtime"
          ? "qwen3-asr-flash-realtime"
          : "fun-asr-realtime",
      region: voiceInput?.aliyun?.region === "singapore" ? "singapore" : "beijing"
    }
  };
}

function normalizeApiSettings(api: ApiSettings): ApiSettings {
  const connectionKind = api.connectionKind === "local" ? "local" : "remote";
  const modelName = api.modelName || (connectionKind === "local" ? api.localModelName ?? "" : defaultApi.modelName);
  const defaultAssignments = defaultApi.modelAssignments as ModelAssignments;
  const remoteProvider = inferRemoteProvider(api.remoteProvider, api.remoteApiBaseUrl || api.apiBaseUrl);
  const reasoningEffort = api.reasoningEffort ?? getDefaultModelReasoningEffort({
    apiBaseUrl: api.apiBaseUrl,
    modelName,
    remoteProvider
  });
  return {
    ...defaultApi,
    ...api,
    connectionKind,
    localRuntime:
      api.localRuntime === "lm-studio" || api.localRuntime === "custom"
        ? api.localRuntime
        : "ollama",
    remoteProvider,
    reasoningEffort,
    apiKey: api.apiKey ?? "",
    modelName,
    localApiBaseUrl: api.localApiBaseUrl || (connectionKind === "local" ? api.apiBaseUrl : defaultApi.localApiBaseUrl),
    localModelName: api.localModelName ?? (connectionKind === "local" ? modelName : ""),
    remoteApiBaseUrl: api.remoteApiBaseUrl || (connectionKind === "remote" ? api.apiBaseUrl : defaultApi.remoteApiBaseUrl),
    remoteModelName: api.remoteModelName || (connectionKind === "remote" ? modelName : defaultApi.remoteModelName),
    modelAssignments: {
      ...defaultAssignments,
      ...api.modelAssignments,
      conversation: api.modelAssignments?.conversation ?? modelName
    }
  };
}

function inferRemoteProvider(
  provider: ApiSettings["remoteProvider"],
  apiBaseUrl: string
): NonNullable<ApiSettings["remoteProvider"]> {
  if (provider === "deepseek" || provider === "kimi" || provider === "glm" || provider === "qwen" || provider === "custom") {
    return provider;
  }

  const normalizedUrl = apiBaseUrl.toLowerCase();
  if (normalizedUrl.includes("deepseek.com")) return "deepseek";
  if (normalizedUrl.includes("moonshot.cn") || normalizedUrl.includes("moonshot.ai")) return "kimi";
  if (normalizedUrl.includes("bigmodel.cn") || normalizedUrl.includes("z.ai")) return "glm";
  if (normalizedUrl.includes("dashscope") || normalizedUrl.includes("maas.aliyuncs.com")) return "qwen";
  return "custom";
}

function normalizeCounselingSettings(
  counseling:
    | (Partial<CounselingExperienceSettings> & {
        bringMemoryToNewSessions?: boolean;
      })
    | undefined
): CounselingExperienceSettings {
  return {
    bringPastUnderstandingToNewSessions:
      counseling?.bringPastUnderstandingToNewSessions ??
      counseling?.bringMemoryToNewSessions ??
      defaultCounseling.bringPastUnderstandingToNewSessions
  };
}

function normalizeAppearanceSettings(
  appearance: Partial<ReadingAppearanceSettings> | undefined
): ReadingAppearanceSettings {
  return {
    textSize: appearance?.textSize === "small" || appearance?.textSize === "large"
      ? appearance.textSize
      : defaultReadingAppearance.textSize,
    lineSpacing: appearance?.lineSpacing === "compact" || appearance?.lineSpacing === "relaxed"
      ? appearance.lineSpacing
      : defaultReadingAppearance.lineSpacing,
    cursorTheme:
      appearance?.cursorTheme === "a" ||
      appearance?.cursorTheme === "b" ||
      appearance?.cursorTheme === "c" ||
      appearance?.cursorTheme === "d" ||
      appearance?.cursorTheme === "e"
        ? appearance.cursorTheme
        : defaultReadingAppearance.cursorTheme
  };
}
