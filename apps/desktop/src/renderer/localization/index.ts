import type { SupportedLocale } from "@shared/index";
import { enUS } from "./catalogs/en-US";
import { zhCN, type TranslationKey } from "./catalogs/zh-CN";

const catalogs: Record<SupportedLocale, Record<TranslationKey, string>> = {
  "zh-CN": zhCN,
  "en-US": enUS
};

const localePreferenceStorageKey = "ling.locale.preference";

export const supportedLocales = ["zh-CN", "en-US"] as const satisfies readonly SupportedLocale[];

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return value === "zh-CN" || value === "en-US";
}

export function resolveSupportedLocale(value: string | null | undefined): SupportedLocale {
  return value?.toLowerCase().startsWith("en") ? "en-US" : "zh-CN";
}

export function detectSystemLocale(
  languages: readonly string[] = typeof navigator === "undefined"
    ? []
    : navigator.languages?.length
      ? navigator.languages
      : [navigator.language]
): SupportedLocale {
  return resolveSupportedLocale(languages.find(Boolean));
}

export function readInitialLocale(): SupportedLocale {
  try {
    const stored = window.localStorage.getItem(localePreferenceStorageKey);
    if (isSupportedLocale(stored)) return stored;
  } catch {
    // System-language detection remains available when local storage is blocked.
  }
  return detectSystemLocale();
}

export function rememberLocale(locale: SupportedLocale) {
  try {
    window.localStorage.setItem(localePreferenceStorageKey, locale);
  } catch {
    // The database setting remains authoritative when local storage is blocked.
  }
}

export function translate(locale: SupportedLocale, key: TranslationKey): string {
  return catalogs[locale][key];
}

export function localize(locale: SupportedLocale, zhCN: string, enUS: string): string {
  return locale === "en-US" ? enUS : zhCN;
}

export function localeDisplayName(locale: SupportedLocale, inLocale: SupportedLocale): string {
  return translate(inLocale, `language.${locale}` as TranslationKey);
}

export type { TranslationKey };
