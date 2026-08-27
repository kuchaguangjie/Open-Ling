import type { UserSettings } from "@shared/index";

export const launchOnboardingStorageKey = "ling.launch.onboarding.version";
export const currentLaunchOnboardingVersion = "1";

export function readLaunchOnboardingComplete() {
  try {
    return window.localStorage.getItem(launchOnboardingStorageKey) === currentLaunchOnboardingVersion;
  } catch {
    return false;
  }
}

export function markLaunchOnboardingComplete() {
  try {
    window.localStorage.setItem(launchOnboardingStorageKey, currentLaunchOnboardingVersion);
  } catch {
    // The launch flow can still finish when local storage is unavailable.
  }
}

interface LaunchOnboardingDecisionInput {
  completed: boolean;
  legacyWelcomeSeen: boolean;
  sessionCount: number;
  settings: UserSettings | null;
}

export function shouldShowLaunchOnboarding({
  completed,
  legacyWelcomeSeen,
  sessionCount,
  settings
}: LaunchOnboardingDecisionInput) {
  if (completed || legacyWelcomeSeen || sessionCount > 0) return false;
  return settings === null;
}
