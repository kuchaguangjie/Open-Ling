import { beforeEach, describe, expect, it } from "vitest";
import {
  hasConfirmedCurrentInformedConsent,
  informedConsentStorageKey,
  informedConsentVersion,
  markInformedConsentConfirmed,
  readInformedConsentConfirmation
} from "./informedConsentStorage";

describe("informedConsentStorage", () => {
  beforeEach(() => window.localStorage.clear());

  it("只接受当前版本的主动确认", () => {
    expect(readInformedConsentConfirmation()).toBeNull();

    const confirmation = markInformedConsentConfirmed("chengling", "2026-07-12T10:00:00.000Z");

    expect(confirmation).toEqual({
      version: informedConsentVersion,
      confirmedAt: "2026-07-12T10:00:00.000Z"
    });
    expect(readInformedConsentConfirmation()).toEqual(confirmation);
    expect(hasConfirmedCurrentInformedConsent("chengling")).toBe(true);
    expect(hasConfirmedCurrentInformedConsent("zhouzhou")).toBe(true);

    expect(markInformedConsentConfirmed("zhouzhou", "2026-07-12T11:00:00.000Z")).toEqual({
      version: informedConsentVersion,
      confirmedAt: "2026-07-12T11:00:00.000Z"
    });
  });

  it("忽略旧版本和损坏记录", () => {
    window.localStorage.setItem(informedConsentStorageKey, JSON.stringify({ version: "2026.07.30", confirmedAt: "2026-07-30" }));
    expect(readInformedConsentConfirmation()).toBeNull();

    window.localStorage.setItem(informedConsentStorageKey, "not-json");
    expect(readInformedConsentConfirmation()).toBeNull();
  });
});
