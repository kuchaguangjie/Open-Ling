import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserSettings } from "@shared/index";
import { resetSettingsStore, useSettingsStore } from "./settingsStore";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function memoryBridge() {
  let stored: UserSettings = {
    api: { ...useSettingsStore.getState().savedApi },
    defaultCounselorId: "chengling",
    defaultRoomThemeId: "warm-study",
    locale: "zh-CN"
  };
  const read = vi.fn(async () => ({ ok: true as const, data: structuredClone(stored) }));
  const save = vi.fn(async (settings: UserSettings) => {
    stored = structuredClone(settings);
    return { ok: true as const, data: undefined };
  });
  vi.stubGlobal("lingDesktop", { settings: { read, save } });
  return { read, save, stored: () => stored };
}

describe("settings persistence audit", () => {
  beforeEach(() => { resetSettingsStore(); vi.unstubAllGlobals(); });

  it("discards backstage model changes and does not save them through another section", async () => {
    const bridge = memoryBridge();
    useSettingsStore.getState().updateBackstageModels({ letterModelName: "unsaved-letter-model" });
    useSettingsStore.getState().updateApi({ apiKey: "unsaved-key" });
    await useSettingsStore.getState().saveLocale("en-US");
    await useSettingsStore.getState().updateDisabledCounselors(["extension-a"]);
    expect(JSON.stringify(bridge.stored())).not.toContain("unsaved");
    useSettingsStore.getState().discardUnsavedChanges();
    expect(useSettingsStore.getState().backstageModels).toEqual({});
    expect(useSettingsStore.getState().api.apiKey).toBe("");
  });

  it("does not leak a draft into a first save when the database has no settings", async () => {
    const save = vi.fn(async () => ({ ok: true, data: undefined }));
    vi.stubGlobal("lingDesktop", { settings: { read: async () => ({ ok: true, data: null }), save } });
    useSettingsStore.getState().updateApi({ apiKey: "draft-only" });
    useSettingsStore.getState().updateBackstageModels({ letterModelName: "draft-only" });
    await useSettingsStore.getState().updateDefaultCounselor("zhouzhou");
    expect(JSON.stringify(save.mock.calls)).not.toContain("draft-only");
  });

  it.each(["profile", "appearance", "counseling"] as const)("keeps newer %s edits dirty while saving the submitted snapshot", async (section) => {
    const bridge = memoryBridge();
    const gate = deferred<void>();
    bridge.save.mockImplementationOnce(async () => { await gate.promise; return { ok: true, data: undefined }; });
    const edit = (newer: boolean) => {
      const state = useSettingsStore.getState();
      if (section === "profile") state.updateProfile({ displayName: newer ? "newer" : "submitted" });
      if (section === "appearance") state.updateAppearance({ textSize: newer ? "small" : "large" });
      if (section === "counseling") state.updateCounseling({ bringPastUnderstandingToNewSessions: newer });
    };
    edit(false);
    const submitted = useSettingsStore.getState()[section];
    const save = section === "profile" ? useSettingsStore.getState().saveProfile
      : section === "appearance" ? useSettingsStore.getState().saveAppearance : useSettingsStore.getState().saveCounseling;
    const pending = save();
    await vi.waitFor(() => expect(bridge.save).toHaveBeenCalledOnce());
    edit(true);
    gate.resolve();
    await pending;
    const savedField = section === "profile" ? "savedProfile" : section === "appearance" ? "savedAppearance" : "savedCounseling";
    expect(useSettingsStore.getState()[savedField]).toEqual(submitted);
    expect(useSettingsStore.getState().dirtySections[section]).toBe(true);
    expect(bridge.save.mock.calls[0][0][section]).toEqual(submitted);
  });

  it("serializes language and profile writes so the last write cannot restore stale settings", async () => {
    const bridge = memoryBridge();
    const gate = deferred<void>();
    const originalSave = bridge.save.getMockImplementation()!;
    bridge.save.mockImplementationOnce(async (settings) => { await gate.promise; return originalSave(settings); });
    useSettingsStore.getState().updateProfile({ displayName: "saved-name" });
    const first = useSettingsStore.getState().saveProfile();
    await vi.waitFor(() => expect(bridge.save).toHaveBeenCalledOnce());
    const second = useSettingsStore.getState().saveLocale("en-US");
    expect(bridge.save).toHaveBeenCalledTimes(1);
    gate.resolve();
    await Promise.all([first, second]);
    expect(bridge.stored()).toMatchObject({ locale: "en-US", profile: { displayName: "saved-name" } });
    expect(useSettingsStore.getState().locale).toBe("en-US");
  });

  it("does not replace a local model with DeepSeek when restoring recommendations", async () => {
    const bridge = memoryBridge();
    await bridge.save({ ...bridge.stored(), api: { ...bridge.stored().api, connectionKind: "local", apiBaseUrl: "http://127.0.0.1:11434/v1", modelName: "local-model", localModelName: "local-model" } });
    useSettingsStore.getState().updateProfile({ displayName: "pending-name" });
    await useSettingsStore.getState().restoreRecommendedSettings();
    expect(bridge.stored().api).toMatchObject({ connectionKind: "local", modelName: "local-model" });
    expect(useSettingsStore.getState().profile.displayName).toBe("pending-name");
    expect(useSettingsStore.getState().dirtySections.profile).toBe(true);
  });

  it("recovers from a rejected settings read and a rejected save", async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error("bridge unavailable")).mockResolvedValue({ ok: true, data: null });
    const save = vi.fn().mockRejectedValueOnce(new Error("disk unavailable")).mockResolvedValue({ ok: true });
    vi.stubGlobal("lingDesktop", { settings: { read, save } });
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().status).toBe("error");
    useSettingsStore.getState().updateProfile({ displayName: "keep-me" });
    await useSettingsStore.getState().saveProfile();
    expect(useSettingsStore.getState().status).toBe("error");
    expect(useSettingsStore.getState().dirtySections.profile).toBe(true);
    await useSettingsStore.getState().saveProfile();
    expect(useSettingsStore.getState().status).toBe("saved");
    expect(useSettingsStore.getState().savedProfile.displayName).toBe("keep-me");
  });
});
