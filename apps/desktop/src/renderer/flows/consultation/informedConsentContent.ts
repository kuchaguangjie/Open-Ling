import type { SupportedLocale } from "@shared/index";
import { translate } from "../../localization";

export const informedConsentVersion = "2026.08.26";

export function getInformedConsentAcknowledgement(locale: SupportedLocale) {
  return translate(locale, "consent.acknowledgement");
}

export function getInformedConsentSensitiveDataAcknowledgement(locale: SupportedLocale) {
  return translate(locale, "consent.sensitiveAcknowledgement");
}
