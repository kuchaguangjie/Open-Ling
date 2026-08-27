import { beforeEach, describe, expect, it } from "vitest";
import {
  currentLaunchOnboardingVersion,
  launchOnboardingStorageKey,
  markLaunchOnboardingComplete,
  readLaunchOnboardingComplete,
  shouldShowLaunchOnboarding
} from "./launchOnboardingStorage";

describe("首次启动引导状态", () => {
  beforeEach(() => window.localStorage.clear());

  it("记录并读取当前引导版本", () => {
    expect(readLaunchOnboardingComplete()).toBe(false);
    markLaunchOnboardingComplete();
    expect(window.localStorage.getItem(launchOnboardingStorageKey)).toBe(currentLaunchOnboardingVersion);
    expect(readLaunchOnboardingComplete()).toBe(true);
  });

  it("只向没有旧资料的新用户展示", () => {
    expect(shouldShowLaunchOnboarding({
      completed: false,
      legacyWelcomeSeen: false,
      sessionCount: 0,
      settings: null
    })).toBe(true);

    expect(shouldShowLaunchOnboarding({
      completed: false,
      legacyWelcomeSeen: true,
      sessionCount: 0,
      settings: null
    })).toBe(false);

    expect(shouldShowLaunchOnboarding({
      completed: false,
      legacyWelcomeSeen: false,
      sessionCount: 1,
      settings: null
    })).toBe(false);
  });

  it("已有模型配置时视为老用户", () => {
    expect(shouldShowLaunchOnboarding({
      completed: false,
      legacyWelcomeSeen: false,
      sessionCount: 0,
      settings: {
        api: {
          apiBaseUrl: "https://api.deepseek.com",
          apiKeySaved: true,
          modelName: "deepseek-v4-flash"
        },
        defaultCounselorId: "chengling",
        defaultRoomThemeId: "warm-study"
      }
    })).toBe(false);
  });

  it("已有本地设置但尚未配置 Key 的升级用户也不会重播引导", () => {
    expect(shouldShowLaunchOnboarding({
      completed: false,
      legacyWelcomeSeen: false,
      sessionCount: 0,
      settings: {
        api: {
          apiBaseUrl: "https://api.deepseek.com",
          apiKeySaved: false,
          modelName: "deepseek-v4-flash"
        },
        defaultCounselorId: "chengling",
        defaultRoomThemeId: "warm-study"
      }
    })).toBe(false);
  });
});
