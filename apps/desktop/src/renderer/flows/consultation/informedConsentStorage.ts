import { informedConsentVersion } from "./informedConsentContent";

export { informedConsentVersion };
export const informedConsentStorageKey = "ling.informedConsent.v2";

export interface InformedConsentConfirmation {
  version: string;
  confirmedAt: string;
}

export function readInformedConsentConfirmation(): InformedConsentConfirmation | null {
  try {
    const raw = window.localStorage.getItem(informedConsentStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InformedConsentConfirmation>;
    if (
      parsed.version !== informedConsentVersion ||
      typeof parsed.confirmedAt !== "string" ||
      !parsed.confirmedAt
    ) {
      return null;
    }
    return { version: parsed.version, confirmedAt: parsed.confirmedAt };
  } catch {
    return null;
  }
}

export function markInformedConsentConfirmed(_counselorId: string, now = new Date().toISOString()): InformedConsentConfirmation {
  const confirmation = {
    version: informedConsentVersion,
    confirmedAt: now
  };
  try {
    window.localStorage.setItem(informedConsentStorageKey, JSON.stringify(confirmation));
  } catch {
    // The current consultation can proceed even when the browser blocks localStorage.
    // A later launch will ask again instead of silently assuming consent.
  }
  return confirmation;
}

export function hasConfirmedCurrentInformedConsent(_counselorId: string) {
  return readInformedConsentConfirmation() !== null;
}
