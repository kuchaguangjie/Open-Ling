import { requireCounselorPackage, type SupportedLocale } from "../../../shared/src/index.js";
import {
  getCounselorAdditionalPolicyPrompts,
  getPolicyPrompt
} from "../prompts/counselorPromptRegistry.js";

export const CURRENT_REALTIME_SAFETY_POLICY_VERSION = "1";

export function buildCounselorSafetyPrompt(
  counselorId: string,
  locale: SupportedLocale = "zh-CN"
) {
  const manifest = requireCounselorPackage(counselorId);
  assertSafetyPolicyCompatibility(manifest.safety.minimumPolicyVersion);
  return [
    getPolicyPrompt("realtime-safety", locale),
    ...getCounselorAdditionalPolicyPrompts(counselorId)
  ].filter(Boolean).join("\n\n");
}

export function assertSafetyPolicyCompatibility(minimumPolicyVersion: string) {
  if (compareNumericVersions(CURRENT_REALTIME_SAFETY_POLICY_VERSION, minimumPolicyVersion) < 0) {
    throw new Error(
      `Counselor package requires safety policy ${minimumPolicyVersion}, but Ling provides ${CURRENT_REALTIME_SAFETY_POLICY_VERSION}`
    );
  }
}

function compareNumericVersions(left: string, right: string) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
