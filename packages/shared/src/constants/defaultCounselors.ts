import type { Counselor } from "../types/counselor.js";
import type { SupportedLocale } from "../types/settings.js";
import {
  builtinCounselorPackages,
  counselorPackageRegistry,
  toCounselor
} from "../counselors/builtinCounselorPackages.js";

export const defaultCounselors: Counselor[] = builtinCounselorPackages.map((manifest) => toCounselor(manifest, "zh-CN"));

export function getDefaultCounselors(locale: SupportedLocale) {
  return counselorPackageRegistry.list().map(({ manifest }) => toCounselor(manifest, locale));
}
